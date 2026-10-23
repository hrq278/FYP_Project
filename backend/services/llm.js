/**
 * LLM provider: Anthropic Claude (decision 6: Claude Haiku 5.5). Configured from .env:
 *   LLM_PROVIDER=anthropic, LLM_MODEL=claude-haiku-5-5, LLM_API_KEY=<key>
 * Without LLM_API_KEY, isConfigured() is false and callers fall back (template report, no breed check).
 *
 * Every call asks for JSON that matches a zod schema (structured outputs) and validates it again here.
 * Invalid output is retried once; after that the caller's fallback takes over, so the app never breaks.
 */
const Anthropic = require("@anthropic-ai/sdk").default || require("@anthropic-ai/sdk");
const { zodOutputFormat } = require("@anthropic-ai/sdk/helpers/zod");
const { z } = require("zod");
const breedKnowledge = require("./breedKnowledge");
const { PURPOSE_LABEL } = require("./rules");

const PROMPT_VERSIONS = {
  breed: "breed-check-v1",
  report: "report-v1",
  chat: "chat-v1",
  compare: "compare-v1"
};

const KNOWN_MODEL_BREEDS = [
  "Ayrshire", "Brown Swiss", "Gir", "Holstein Friesian", "Jaffarabadi", "Jersey", "Kankrej", "Nagori",
  "Nili-Ravi", "Rathi", "Red Sindhi", "Sahiwal", "Tharparkar", "Umblachery", "Vechur"
];
const PAKISTANI_BREEDS = ["Cholistani", "Dhanni", "Lohani", "Achai", "Dajal", "Bhagnari", "Kundi", "Murrah", "crossbred"];

class LLMError extends Error {}

let client = null;

const isConfigured = () => Boolean(process.env.LLM_API_KEY) && (process.env.LLM_PROVIDER || "anthropic") === "anthropic";
const model = () => process.env.LLM_MODEL || "claude-haiku-5-5";

const getClient = () => {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.LLM_API_KEY, maxRetries: 2, timeout: 60000 });
  }
  return client;
};

// Tests inject a fake client
const _setClient = (c) => {
  client = c;
};

const languageRule = (language) =>
  language === "ur"
    ? "Write every text field in simple Urdu (Urdu script), short sentences, as spoken by farmers in Pakistan. Keep numbers, breed names and PKR amounts in digits."
    : "Write in simple English with short sentences for a first-time buyer at a Pakistani livestock market.";

/**
 * One structured call: returns the parsed object or throws LLMError.
 * @param {object} p { system, content (string or content blocks), schema (zod), maxTokens }
 */
const structured = async ({ system, content, schema, maxTokens = 4000 }) => {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await getClient().messages.parse({
        model: model(),
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content }],
        output_config: { format: zodOutputFormat(schema), effort: "low" }
      });
      if (response.stop_reason === "refusal") {
        throw new LLMError(`Model declined (${response.stop_details?.category || "no category"})`);
      }
      if (response.stop_reason === "max_tokens") {
        throw new LLMError("Output was cut off (max_tokens)");
      }
      const checked = schema.safeParse(response.parsed_output);
      if (!checked.success) {
        throw new LLMError(`Invalid output: ${checked.error.message}`);
      }
      return checked.data;
    } catch (error) {
      lastError = error;
      // Retry only bad output; API errors (auth, rate limit after SDK retries, network) go straight to the fallback
      if (!(error instanceof LLMError) || error.message.startsWith("Model declined")) break;
    }
  }
  throw lastError instanceof LLMError ? lastError : new LLMError(lastError?.message || "LLM call failed");
};

const imageBlock = (file) => ({
  type: "image",
  source: { type: "base64", media_type: file.mimetype || "image/jpeg", data: file.buffer.toString("base64") }
});

// ------------------------------------------------------------------------------------------- breed check

const BreedCheckSchema = z.object({
  breed: z.string(),
  confidence: z.number(),
  inKnownClasses: z.boolean(),
  reasoning: z.string()
});

/**
 * Breed from one side photo (decision 3). Returns { breed, confidence, inKnownClasses, reasoning, promptVersion }.
 * "unknown" when the photo doesn't show enough.
 */
const verifyBreed = async ({ image, species, modelTop3 = [] }) => {
  const system = [
    "You identify cattle and buffalo breeds from photos for a livestock-buying app in Pakistan.",
    "Answer with the single most likely breed. If the photo does not show enough, or the animal looks like a crossbred or non-descript local animal, say so: use \"crossbred\" or \"unknown\" rather than guessing.",
    "confidence is your honest probability (0 to 1) that the breed is right. Be conservative: coat colour alone is weak evidence.",
    `inKnownClasses is true only if your breed is one of: ${KNOWN_MODEL_BREEDS.join(", ")}.`,
    "reasoning: one short sentence naming the visible features you used (hump, dewlap, ears, horns, coat, face)."
  ].join("\n");
  const hints = modelTop3.map((t) => `${t.breed} (${Math.round((t.confidence || 0) * 100)}%)`).join(", ");
  const text = [
    `Species already detected: ${species}.`,
    hints ? `An image classifier suggested: ${hints}. It is often wrong; judge from the photo.` : "",
    `Common breeds in Pakistan include: ${[...KNOWN_MODEL_BREEDS, ...PAKISTANI_BREEDS].join(", ")}.`,
    "Which breed is this animal?"
  ].filter(Boolean).join("\n");

  const out = await structured({
    system,
    content: [imageBlock(image), { type: "text", text }],
    schema: BreedCheckSchema,
    maxTokens: 1000
  });
  return {
    ...out,
    confidence: Math.max(0, Math.min(1, out.confidence)),
    inKnownClasses: KNOWN_MODEL_BREEDS.some((b) => b.toLowerCase() === out.breed.toLowerCase()) && out.inKnownClasses,
    promptVersion: PROMPT_VERSIONS.breed
  };
};

// ------------------------------------------------------------------------------------------- report

const ReportSchema = z.object({
  summary: z.string(),
  reasons: z.array(z.string()),
  risks: z.array(z.string()),
  purposeFit: z.string(),
  tips: z.array(z.string())
});

const VERDICT_WORDS = { recommended: "Recommended", caution: "Caution", not_recommended: "Not Recommended" };

const factsFor = (ctx) => {
  const entry = breedKnowledge.entryFor(ctx.breed?.label);
  return {
    buyingPurpose: PURPOSE_LABEL[ctx.purpose] || ctx.purpose,
    budgetPkr: ctx.budget ?? null,
    sellerPricePkr: ctx.sellerPrice ?? null,
    buyerExperience: ctx.experience,
    species: { value: ctx.species?.species, confidence: ctx.species?.confidence },
    breed: {
      value: ctx.breed?.label,
      confidence: ctx.breed?.confidence,
      uncertain: Boolean(ctx.breed?.uncertain),
      source: ctx.breed?.source,
      possibly: ctx.breed?.possibly || null
    },
    age: ctx.age
      ? {
          years: ctx.age.age_years,
          range90: ctx.age.interval_90,
          permanentFrontTeethEstimate: ctx.age.permanent_incisors_estimate,
          uncertain: ctx.age.uncertain,
          teethPhotoClear: ctx.age.quality?.ok !== false
        }
      : null,
    health: { result: ctx.health?.condition, confidence: ctx.health?.confidence },
    breedFacts: entry
      ? { name: entry.key, origin: entry.origin, primaryUse: entry.primaryUse, milkYield: entry.milkYield, adultWeight: entry.adultWeight, heatTolerance: entry.heatTolerance, notes: entry.notes }
      : "No knowledge-base entry for this breed: do not state breed facts.",
    decision: {
      verdict: VERDICT_WORDS[ctx.rules.verdict],
      score: ctx.rules.score,
      purposeFitLevel: ctx.rules.purposeFitLevel,
      ruleReasons: ctx.rules.reasons,
      ruleRisks: ctx.rules.risks
    }
  };
};

/**
 * Report text that explains the rule engine's decision. Returns an Evaluation.report object.
 */
const generateReport = async (ctx) => {
  const system = [
    "You write the buying report for MaweshiAI, an app that helps people buy cattle and buffalo at livestock markets in Pakistan.",
    "The verdict and score were already decided by a rule engine from the AI model results. Explain them; never change, soften or contradict the verdict.",
    "Use only the facts given in the user message. Never invent milk yields, prices, weights or diseases. If breedFacts says there is no entry, say nothing specific about the breed.",
    "When a confidence is below 0.6, or something is marked uncertain, say it is not certain and tell the buyer what to check in person.",
    "summary: one sentence that matches the verdict.",
    "reasons: 2 to 5 short bullet sentences supporting the verdict.",
    "risks: include every item in ruleRisks (rephrased plainly), plus at most 2 more practical risks.",
    "purposeFit: one or two sentences on how well this animal fits the buying purpose, matching purposeFitLevel.",
    "tips: 3 or 4 practical checks before paying, always including watching one milking for dairy purposes, asking for the vaccination record, and checking the udder, teats and hooves where relevant.",
    "No markdown, no emojis."
  ].join("\n");
  const text = `${languageRule(ctx.language)}\n\nFacts (JSON):\n${JSON.stringify(factsFor(ctx), null, 2)}`;
  const out = await structured({ system, content: text, schema: ReportSchema, maxTokens: 3000 });
  if (!out.summary.trim() || out.reasons.length === 0) {
    throw new LLMError("Report is missing a summary or reasons");
  }
  return {
    ...out,
    purposeFitLevel: ctx.rules.purposeFitLevel,
    source: "llm",
    promptVersion: PROMPT_VERSIONS.report
  };
};

// ------------------------------------------------------------------------------------------- Q&A chat

const ChatSchema = z.object({
  answer: z.string(),
  suggestions: z.array(z.string())
});

/**
 * Answer a buyer's question about one evaluated animal.
 * @param {object} p { evaluation (lean doc), history [{role, content}], question }
 * @returns {{ answer, suggestions, promptVersion }}
 */
const answerQuestion = async ({ evaluation, history, question }) => {
  const e = evaluation;
  const breedLabel = e.results?.breed?.final?.label;
  const entry = breedKnowledge.entryFor(breedLabel);
  const context = {
    purpose: PURPOSE_LABEL[e.purpose] || e.purpose,
    budgetPkr: e.budget ?? null,
    sellerPricePkr: e.sellerPrice ?? null,
    verdict: VERDICT_WORDS[e.verdict],
    score: e.score,
    species: e.results?.species?.species,
    breed: breedLabel,
    breedUncertain: Boolean(e.results?.breed?.final?.uncertain),
    ageYears: e.results?.age?.age_years,
    ageUncertain: e.results?.age?.uncertain,
    health: e.results?.health?.condition,
    report: e.report,
    breedFacts: entry ? { origin: entry.origin, primaryUse: entry.primaryUse, milkYield: entry.milkYield, adultWeight: entry.adultWeight, heatTolerance: entry.heatTolerance } : null
  };
  const system = [
    "You are MaweshiAI's assistant. Answer questions about ONE animal the buyer is looking at, using the report context below.",
    "Use only facts in the context and general, widely accepted cattle-care knowledge. Never invent this animal's milk yield, price or medical history; say what to check instead.",
    "Never contradict the verdict. Do not diagnose: for health worries, tell them to ask a veterinarian.",
    "Keep answers under 90 words, plain language, practical. End with one concrete thing to do or check.",
    "suggestions: exactly 3 short follow-up questions the buyer might ask next.",
    languageRule(e.language),
    `Report context (JSON):\n${JSON.stringify(context)}`
  ].join("\n");

  const turns = [...history.slice(-10), { role: "user", content: question }];
  const transcript = turns.map((t) => `${t.role === "user" ? "Buyer" : "MaweshiAI"}: ${t.content}`).join("\n");
  const out = await structured({
    system,
    content: `Conversation so far:\n${transcript}\n\nAnswer the buyer's last question.`,
    schema: ChatSchema,
    maxTokens: 1500
  });
  return { answer: out.answer, suggestions: out.suggestions.slice(0, 3), promptVersion: PROMPT_VERSIONS.chat };
};

// ------------------------------------------------------------------------------------------- compare

const CompareSchema = z.object({ reason: z.string() });

/**
 * One- or two-sentence explanation of why the winner (already chosen from the scores) is the better buy.
 */
const explainComparison = async ({ purpose, language, winner, other }) => {
  const system = [
    "You explain, in one or two short sentences, why animal " + winner.letter + " is the better choice for the buyer's purpose.",
    "The winner was already chosen by score; never argue for the other animal. Use only the facts given.",
    languageRule(language)
  ].join("\n");
  const out = await structured({
    system,
    content: `Purpose: ${PURPOSE_LABEL[purpose] || purpose}\nFacts (JSON):\n${JSON.stringify({ winner, other })}`,
    schema: CompareSchema,
    maxTokens: 800
  });
  return { reason: out.reason, promptVersion: PROMPT_VERSIONS.compare };
};

module.exports = {
  isConfigured,
  verifyBreed,
  generateReport,
  answerQuestion,
  explainComparison,
  LLMError,
  PROMPT_VERSIONS,
  _setClient
};
