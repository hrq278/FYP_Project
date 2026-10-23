/**
 * Combines the breed model's answer with the LLM's breed check from a side photo (decision 3).
 *
 * - agree                      -> keep the breed, confidence raised
 * - LLM confident about a breed the model doesn't know (e.g. Cholistani) -> use the LLM's breed, source "ai_vision"
 * - disagree                   -> model's breed with "possibly <LLM breed>", confidence lowered
 * - no LLM result              -> model only
 */

const LLM_CONFIDENT = 0.7;
const AGREE_BOOST = 0.15;
const DISAGREE_PENALTY = 0.7;

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

const reconcile = (model, llm) => {
  const base = {
    label: model.breed,
    key: model.breed_key,
    confidence: model.confidence,
    uncertain: Boolean(model.uncertain),
    source: "model",
    possibly: null
  };
  if (!llm || !llm.breed || norm(llm.breed) === "unknown") return base;

  const llmConf = typeof llm.confidence === "number" ? llm.confidence : 0;
  const agrees = norm(llm.breed) === norm(model.breed) || norm(llm.breed) === norm(model.breed_key);
  const inTop3 = (model.top3 || []).some((t) => norm(t.breed) === norm(llm.breed));

  if (agrees) {
    return { ...base, confidence: Math.min(0.99, Math.max(model.confidence, llmConf) + AGREE_BOOST), uncertain: false, source: "model+ai_vision" };
  }
  if (llmConf >= LLM_CONFIDENT && (llm.inKnownClasses === false || inTop3 || model.uncertain)) {
    // The model can't name this breed, or it was itself unsure: trust the vision check
    return {
      label: llm.breed,
      key: norm(llm.breed),
      confidence: llmConf,
      uncertain: false,
      source: "ai_vision",
      possibly: model.breed
    };
  }
  return {
    ...base,
    confidence: model.confidence * DISAGREE_PENALTY,
    uncertain: true,
    possibly: llm.breed
  };
};

module.exports = { reconcile, LLM_CONFIDENT };
