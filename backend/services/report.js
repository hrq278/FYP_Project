/**
 * Rule-based report. Used when the LLM isn't configured or its output is invalid, so the app always gets a
 * complete report (decision: the LLM explains, it never decides).
 */
const { PURPOSE_LABEL, DISEASE_NAME } = require("./rules");

const PRACTICAL_CHECKS = {
  milk: ["Watch one full milking before you pay.", "Check the udder and all four teats by hand."],
  breeding: ["Ask about previous calvings and any breeding problems.", "Check the udder (female) or testicles (male) by hand."],
  qurbani: ["Check that the animal has no visible defect, injury or lameness.", "Confirm the 2 permanent front teeth in person."],
  meat: ["Check body condition along the back and ribs.", "Ask what the animal has been fed recently."],
  farm_work: ["Watch the animal walk and check the hooves and legs for lameness.", "Ask whether it is trained for work."],
  other: ["Watch the animal walk and check it in person before paying."]
};
const COMMON_CHECKS = ["Ask for the vaccination record (FMD, HS).", "Look inside the mouth and at the hooves for sores."];

const speciesWord = (species) => (species === "buffalo" ? "buffalo" : "cow");

const summaryFor = ({ verdict, flags }, breed, species, purpose, condition) => {
  const animal = [breed?.uncertain ? null : breed?.label, speciesWord(species)].filter(Boolean).join(" ");
  const forPurpose = PURPOSE_LABEL[purpose] || "your purpose";
  if (flags.includes("fmd") || flags.includes("lumpy_skin")) {
    return `Not recommended: signs of ${DISEASE_NAME[condition]} in the photos.`;
  }
  if (flags.includes("qurbani_underage")) return `Not recommended: this ${animal} looks too young for Qurbani.`;
  if (verdict === "recommended") return `Healthy ${animal}, a good fit for ${forPurpose}.`;
  if (verdict === "caution") return `${animal[0].toUpperCase()}${animal.slice(1)} for ${forPurpose}: check the risks below before buying.`;
  return `This ${animal} is not a good match for ${forPurpose}.`;
};

const purposeFitText = (level, breed, purpose) => {
  const forPurpose = PURPOSE_LABEL[purpose] || "your purpose";
  if (level === "unknown" || !breed?.label || breed.uncertain) {
    return `Breed suitability for ${forPurpose} could not be confirmed from the photos.`;
  }
  const word = { strong: "Strong fit", fair: "Fair fit", weak: "Weak fit" }[level];
  return `${word}: ${breed.label} for ${forPurpose}.`;
};

/**
 * @param {object} ctx { purpose, species, breed (reconciled), age, health, rules (rules.evaluate output) }
 */
const templateReport = ({ purpose, species, breed, age, health, rules }) => {
  const reasons = [...rules.reasons];
  if (age?.age_years != null) {
    const teeth = age.permanent_incisors_estimate;
    reasons.push(
      `About ${age.age_years} year${age.age_years === 1 ? "" : "s"} old` +
        (teeth != null ? ` (about ${teeth} permanent front teeth)` : "") +
        (age.uncertain ? ", estimate uncertain." : ".")
    );
  }
  return {
    summary: summaryFor(rules, breed, species?.species, purpose, health?.condition),
    reasons,
    risks: [...rules.risks, ...COMMON_CHECKS],
    purposeFit: purposeFitText(rules.purposeFitLevel, breed, purpose),
    purposeFitLevel: rules.purposeFitLevel,
    tips: PRACTICAL_CHECKS[purpose] || PRACTICAL_CHECKS.other,
    source: "template",
    promptVersion: null
  };
};

module.exports = { templateReport };
