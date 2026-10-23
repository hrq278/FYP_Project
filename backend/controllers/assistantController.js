const mongoose = require("mongoose");
const Evaluation = require("../models/Evaluation");
const llm = require("../services/llm");
const { PURPOSE_LABEL } = require("../services/rules");

const MAX_CHAT_MESSAGES = 20;
const MAX_QUESTION_CHARS = 500;

const ownerFilter = (user) => (user.isGuest ? { guestId: user.guestId } : { userId: user.userId });

const DEFAULT_SUGGESTIONS = {
  en: ["What should I feed it?", "How much milk will it give?", "Is the price fair?"],
  ur: ["اسے کیا کھلانا چاہیے؟", "یہ کتنا دودھ دے گی؟", "کیا قیمت مناسب ہے؟"]
};

// POST /api/evaluations/:id/chat { message }
const chat = async (req, res) => {
  const question = String(req.body?.message || "").trim();
  if (!question) {
    return res.status(400).json({ message: "message is required" });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return res.status(400).json({ message: `message must be ${MAX_QUESTION_CHARS} characters or fewer` });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Evaluation not found" });
  }
  const evaluation = await Evaluation.findOne({ _id: req.params.id, ...ownerFilter(req.user) }).lean();
  if (!evaluation) {
    return res.status(404).json({ message: "Evaluation not found" });
  }
  if (evaluation.status !== "done") {
    return res.status(409).json({ message: "Questions can be asked once the report is ready" });
  }
  if (!llm.isConfigured()) {
    return res.status(503).json({ message: "The AI assistant is not available right now", suggestions: DEFAULT_SUGGESTIONS[evaluation.language] || DEFAULT_SUGGESTIONS.en });
  }

  try {
    const history = (evaluation.chat || []).map(({ role, content }) => ({ role, content }));
    const { answer, suggestions, promptVersion } = await llm.answerQuestion({ evaluation, history, question });
    const now = new Date();
    const messages = [
      { role: "user", content: question, createdAt: now },
      { role: "assistant", content: answer, suggestions, promptVersion, createdAt: now }
    ];
    const updated = await Evaluation.findByIdAndUpdate(
      evaluation._id,
      { $push: { chat: { $each: messages, $slice: -MAX_CHAT_MESSAGES } } },
      { new: true, projection: { chat: 1 } }
    ).lean();
    return res.status(200).json({ answer, suggestions, chat: updated.chat });
  } catch (error) {
    console.error(`Chat failed for ${evaluation._id}: ${error.message}`);
    return res.status(502).json({ message: "The AI assistant could not answer. Please try again." });
  }
};

// Higher score wins; ties go to the healthier, then the younger-in-range animal
const HEALTH_RANK = { healthy: 3, uncertain: 2, lumpy: 1, "foot-and-mouth": 0 };

const summarize = (e, letter) => ({
  id: String(e._id),
  letter,
  reportId: e.reportId,
  score: e.score,
  verdict: e.verdict,
  thumbnail: e.images?.front?.url || null,
  species: e.results?.species?.species || null,
  breed: e.results?.breed?.final?.label || null,
  breedUncertain: Boolean(e.results?.breed?.final?.uncertain),
  ageYears: e.results?.age?.age_years ?? null,
  ageUncertain: Boolean(e.results?.age?.uncertain),
  health: e.results?.health?.condition || null,
  purposeFitLevel: e.report?.purposeFitLevel || "unknown"
});

const templateReason = (winner, other, purpose, language) => {
  const why = [];
  if ((HEALTH_RANK[winner.health] ?? 2) > (HEALTH_RANK[other.health] ?? 2)) why.push(language === "ur" ? "صحت بہتر" : "healthier");
  const fitRank = { strong: 3, fair: 2, unknown: 1, weak: 0 };
  if (fitRank[winner.purposeFitLevel] > fitRank[other.purposeFitLevel]) why.push(language === "ur" ? "نسل مقصد کے لیے زیادہ موزوں" : "a better breed match");
  if (language === "ur") {
    return `جانور ${winner.letter} کا اسکور ${winner.score}/100 ہے جبکہ ${other.letter} کا ${other.score}/100` + (why.length ? ` (${why.join("، ")})۔` : "۔");
  }
  const forPurpose = PURPOSE_LABEL[purpose] || "your purpose";
  return `Animal ${winner.letter} scores ${winner.score}/100 against ${other.score}/100 for ${forPurpose}` + (why.length ? ` (${why.join(", ")}).` : ".");
};

// POST /api/evaluations/compare { ids: [a, b] }
const compare = async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length !== 2 || new Set(ids).size !== 2 || !ids.every((id) => mongoose.isValidObjectId(id))) {
    return res.status(400).json({ message: "Pick exactly 2 different reports to compare" });
  }
  const docs = await Evaluation.find({ _id: { $in: ids }, ...ownerFilter(req.user) }).lean();
  if (docs.length !== 2) {
    return res.status(404).json({ message: "Evaluation not found" });
  }
  const [a, b] = ids.map((id) => docs.find((d) => String(d._id) === String(id)));
  if (a.status !== "done" || b.status !== "done") {
    return res.status(409).json({ message: "Both reports must be finished to compare" });
  }
  if (a.purpose !== b.purpose) {
    return res.status(400).json({ message: "Both animals must be checked for the same buying purpose to compare" });
  }

  const A = summarize(a, "A");
  const B = summarize(b, "B");
  const winsA =
    A.score !== B.score
      ? A.score > B.score
      : (HEALTH_RANK[A.health] ?? 2) !== (HEALTH_RANK[B.health] ?? 2)
        ? (HEALTH_RANK[A.health] ?? 2) > (HEALTH_RANK[B.health] ?? 2)
        : true;
  const [winner, other] = winsA ? [A, B] : [B, A];
  const language = a.language || "en";

  let reason = templateReason(winner, other, a.purpose, language);
  let reasonSource = "template";
  if (llm.isConfigured()) {
    try {
      reason = (await llm.explainComparison({ purpose: a.purpose, language, winner, other })).reason;
      reasonSource = "llm";
    } catch (error) {
      console.error(`Compare explanation failed: ${error.message}`);
    }
  }

  return res.status(200).json({
    purpose: a.purpose,
    winnerId: winner.id,
    reason,
    reasonSource,
    animals: [A, B],
    rows: [
      { key: "breed", a: A.breed, b: B.breed },
      { key: "age", a: A.ageYears, b: B.ageYears },
      { key: "health", a: A.health, b: B.health },
      { key: "purpose_fit", a: A.purposeFitLevel, b: B.purposeFitLevel }
    ]
  });
};

module.exports = { chat, compare };
