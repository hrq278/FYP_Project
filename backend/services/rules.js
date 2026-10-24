/**
 * Rule engine: computes the verdict and score from the model results. Runs before the LLM and always wins;
 * the LLM only explains the result.
 *
 * Score (0-100) = purpose fit (40) + age suitability (25) + health (25) + model confidence (10)
 *   - purpose fit: breed's suitability for the buying purpose from the breed knowledge base
 *     strong 40, fair 25, weak 10, unknown 20 (no knowledge-base entry yet, or breed uncertain)
 *   - age: see AGE_RANGES (completed years); an uncertain age estimate is capped at 15
 *   - health: healthy 25, uncertain 12, foot-and-mouth or lumpy skin 0
 *   - confidence: 10 x mean of the species, breed and health confidences
 * Verdict from score: >= 70 recommended, >= 45 caution, otherwise not recommended; then the caps below.
 * Caps: disease -> not recommended; unclear health, low confidence, or a reliable age outside the purpose's
 * useful range (e.g. a 14-year-old cow for milk) -> at best caution; Qurbani under 2 years -> not recommended.
 */

const RECOMMENDED_AT = 70;
const CAUTION_AT = 45;
const LOW_CONFIDENCE = 0.6;
const PRICE_TOLERANCE = 0.2;

const FIT_POINTS = { strong: 40, fair: 25, weak: 10, unknown: 20 };
const HEALTH_POINTS = { healthy: 25, uncertain: 12, "foot-and-mouth": 0, lumpy: 0 };

// [minYears, maxYears, points] checked in order; first match wins, otherwise `other`
const AGE_RANGES = {
  milk: { bands: [[2, 6, 25], [7, 8, 15]], other: 5 },
  breeding: { bands: [[2, 7, 25], [8, 9, 15]], other: 5 },
  qurbani: { bands: [[2, 15, 25]], other: 0 },
  meat: { bands: [[1, 4, 25], [5, 6, 15]], other: 8 },
  farm_work: { bands: [[3, 10, 25], [2, 2, 15], [11, 12, 15]], other: 5 },
  other: { bands: [[2, 8, 20]], other: 12 }
};

const PURPOSE_LABEL = {
  milk: "milk",
  breeding: "breeding",
  qurbani: "Qurbani",
  meat: "meat / fattening",
  farm_work: "farm work",
  other: "your purpose"
};

const DISEASE_NAME = { "foot-and-mouth": "Foot-and-Mouth Disease (FMD)", lumpy: "Lumpy Skin Disease" };

const ageScore = (purpose, age) => {
  if (!age || age.age_years == null) return 12;
  const table = AGE_RANGES[purpose] || AGE_RANGES.other;
  const band = table.bands.find(([lo, hi]) => age.age_years >= lo && age.age_years <= hi);
  const points = band ? band[2] : table.other;
  return age.uncertain ? Math.min(points, 15) : points;
};

const atBestCaution = (state) => {
  if (state.verdict === "recommended") state.verdict = "caution";
  state.score = Math.min(state.score, RECOMMENDED_AT - 1);
};

const forceNotRecommended = (state, maxScore) => {
  state.verdict = "not_recommended";
  state.score = Math.min(state.score, maxScore);
};

/**
 * @param {object} input
 * @param {string} input.purpose
 * @param {number} [input.budget]
 * @param {number} [input.sellerPrice]
 * @param {object} input.species  { species, confidence }
 * @param {object} input.breed    reconciled breed { label, confidence, uncertain }
 * @param {object} input.age      ML /predict/age output
 * @param {object} input.health   ML /predict/health output
 * @param {string} [input.purposeFitLevel] strong | fair | weak | unknown (from the knowledge base)
 */
const evaluate = (input) => {
  const { purpose, budget, sellerPrice, species, breed, age, health } = input;
  const fitLevel = breed?.uncertain ? "unknown" : input.purposeFitLevel || "unknown";
  const condition = health?.condition || "uncertain";
  const confidences = [species?.confidence, breed?.confidence, health?.confidence].filter((c) => typeof c === "number");

  const breakdown = {
    purposeFit: FIT_POINTS[fitLevel] ?? FIT_POINTS.unknown,
    age: ageScore(purpose, age),
    health: HEALTH_POINTS[condition] ?? HEALTH_POINTS.uncertain,
    confidence: confidences.length ? Math.round((10 * confidences.reduce((a, b) => a + b, 0)) / confidences.length) : 0
  };
  const state = {
    score: breakdown.purposeFit + breakdown.age + breakdown.health + breakdown.confidence,
    verdict: null
  };
  state.verdict = state.score >= RECOMMENDED_AT ? "recommended" : state.score >= CAUTION_AT ? "caution" : "not_recommended";

  const reasons = [];
  const risks = [];
  const flags = [];

  // Health
  if (condition === "foot-and-mouth" || condition === "lumpy") {
    forceNotRecommended(state, 25);
    flags.push(condition === "lumpy" ? "lumpy_skin" : "fmd");
    reasons.push(`Signs of ${DISEASE_NAME[condition]} were detected in the photos.`);
    risks.push("Have a veterinarian examine the animal before any deal; the disease can spread to your other animals.");
  } else if (condition === "uncertain") {
    atBestCaution(state);
    flags.push("health_uncertain");
    risks.push("The health check was not conclusive: check the mouth, hooves and skin in person.");
  } else {
    reasons.push("No signs of Foot-and-Mouth or Lumpy Skin Disease in the photos.");
  }

  // Qurbani age rule: at least 2 permanent incisors (about 2 years)
  if (purpose === "qurbani" && age?.age_years != null) {
    const lowerBound = Array.isArray(age.interval_90) ? age.interval_90[0] : age.age_years;
    if (age.age_years < 2 && !age.uncertain) {
      forceNotRecommended(state, CAUTION_AT - 1);
      flags.push("qurbani_underage");
      reasons.push("Not eligible for Qurbani by age: the teeth suggest it is under 2 years old.");
    } else if (age.uncertain || lowerBound < 2) {
      atBestCaution(state);
      flags.push("qurbani_age_unclear");
      risks.push("Confirm at least 2 permanent front teeth (do daant) in person before buying for Qurbani.");
    }
  }

  // Reliable age, but outside every useful band for this purpose (Qurbani has its own rule above)
  if (purpose !== "qurbani" && age?.age_years != null && !age.uncertain) {
    const table = AGE_RANGES[purpose] || AGE_RANGES.other;
    const bands = table.bands;
    if (!bands.some(([lo, hi]) => age.age_years >= lo && age.age_years <= hi)) {
      atBestCaution(state);
      const young = age.age_years < Math.min(...bands.map(([lo]) => lo));
      flags.push(young ? "too_young_for_purpose" : "too_old_for_purpose");
      risks.push(
        young
          ? `At about ${age.age_years} year${age.age_years === 1 ? "" : "s"} it is young for ${PURPOSE_LABEL[purpose] || "your purpose"}: it may take time before it is productive.`
          : `At about ${age.age_years} years it is old for ${PURPOSE_LABEL[purpose] || "your purpose"}: expect fewer productive years; check the teeth and udder or body condition in person.`
      );
    }
  }

  // Low model confidence
  const low = [
    ["species", species?.confidence],
    ["breed", breed?.confidence],
    ["health", health?.confidence]
  ].filter(([, c]) => typeof c === "number" && c < LOW_CONFIDENCE);
  if (low.length) {
    atBestCaution(state);
    flags.push("low_confidence");
    risks.push(`Low AI confidence for ${low.map(([k]) => k).join(", ")}: retake clear photos in good light for a more reliable report.`);
  }
  if (age?.uncertain) {
    flags.push("age_uncertain");
    risks.push("The age estimate is uncertain: check the front teeth in person.");
  }
  if (age && age.quality && age.quality.ok === false) {
    flags.push("teeth_photo_quality");
    risks.push("The teeth photo was not clear; the age estimate may be off.");
  }

  // Price
  if (budget > 0 && sellerPrice > budget * (1 + PRICE_TOLERANCE)) {
    flags.push("over_budget");
    const pct = Math.round(((sellerPrice - budget) / budget) * 100);
    risks.push(`The seller's price is ${pct}% above your budget.`);
  }

  // Purpose fit wording
  if (fitLevel !== "unknown" && breed?.label) {
    reasons.push(`${breed.label} is a ${fitLevel} fit for ${PURPOSE_LABEL[purpose] || "your purpose"}.`);
  }

  return {
    verdict: state.verdict,
    score: Math.max(0, Math.min(100, Math.round(state.score))),
    scoreBreakdown: breakdown,
    purposeFitLevel: fitLevel,
    reasons,
    risks,
    flags
  };
};

module.exports = { evaluate, RECOMMENDED_AT, CAUTION_AT, LOW_CONFIDENCE, PURPOSE_LABEL, DISEASE_NAME };
