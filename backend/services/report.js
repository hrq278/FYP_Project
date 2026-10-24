/**
 * Rule-based report in English or Urdu. Used when the LLM isn't configured or its output is invalid, so the app
 * always gets a complete report (decision: the LLM explains, it never decides).
 */
const { PURPOSE_LABEL, DISEASE_NAME } = require("./rules");

const PRACTICAL_CHECKS = {
  en: {
    milk: ["Watch one full milking before you pay.", "Check the udder and all four teats by hand."],
    breeding: ["Ask about previous calvings and any breeding problems.", "Check the udder (female) or testicles (male) by hand."],
    qurbani: ["Check that the animal has no visible defect, injury or lameness.", "Confirm the 2 permanent front teeth in person."],
    meat: ["Check body condition along the back and ribs.", "Ask what the animal has been fed recently."],
    farm_work: ["Watch the animal walk and check the hooves and legs for lameness.", "Ask whether it is trained for work."],
    other: ["Watch the animal walk and check it in person before paying."],
    common: ["Ask for the vaccination record (FMD, HS).", "Look inside the mouth and at the hooves for sores."]
  },
  ur: {
    milk: ["رقم دینے سے پہلے ایک مکمل دوہائی خود دیکھیں۔", "تھن اور چاروں تھنوں کو ہاتھ سے چیک کریں۔"],
    breeding: ["پچھلے سوئے اور نسل کشی کے مسائل کے بارے میں پوچھیں۔", "مادہ کا تھن یا نر کے خصیے ہاتھ سے چیک کریں۔"],
    qurbani: ["دیکھیں کہ جانور میں کوئی نظر آنے والا عیب، زخم یا لنگڑاپن نہ ہو۔", "سامنے کے دو پکے دانت خود دیکھ کر تصدیق کریں۔"],
    meat: ["کمر اور پسلیوں پر جانور کی صحت (جسمانی حالت) دیکھیں۔", "پوچھیں کہ جانور کو حال ہی میں کیا کھلایا گیا ہے۔"],
    farm_work: ["جانور کو چلا کر دیکھیں اور کھروں اور ٹانگوں میں لنگڑاپن چیک کریں۔", "پوچھیں کہ کیا یہ کام کے لیے تربیت یافتہ ہے۔"],
    other: ["رقم دینے سے پہلے جانور کو چلا کر خود اچھی طرح دیکھیں۔"],
    common: ["ویکسینیشن کا ریکارڈ (منہ کھر، گل گھوٹو) مانگیں۔", "منہ کے اندر اور کھروں پر زخم چیک کریں۔"]
  }
};

const UR_PURPOSE = {
  milk: "دودھ",
  breeding: "نسل کشی",
  qurbani: "قربانی",
  meat: "گوشت / فربہ کرنے",
  farm_work: "کھیتی کے کام",
  other: "آپ کے مقصد"
};
const UR_DISEASE = { "foot-and-mouth": "منہ کھر کی بیماری (FMD)", lumpy: "لمپی اسکن بیماری" };
const UR_FIT = { strong: "بہت موزوں", fair: "مناسب", weak: "کم موزوں" };

// ------------------------------------------------------------------------------------------- English

const enAnimal = (breed, species) =>
  [breed?.uncertain ? null : breed?.label, species === "buffalo" ? "buffalo" : "cow"].filter(Boolean).join(" ");

const enSummary = ({ verdict, flags }, breed, species, purpose, condition) => {
  const animal = enAnimal(breed, species);
  const forPurpose = PURPOSE_LABEL[purpose] || "your purpose";
  if (flags.includes("fmd") || flags.includes("lumpy_skin")) return `Not recommended: signs of ${DISEASE_NAME[condition]} in the photos.`;
  if (flags.includes("qurbani_underage")) return `Not recommended: this ${animal} looks too young for Qurbani.`;
  if (verdict === "recommended") return `Healthy ${animal}, a good fit for ${forPurpose}.`;
  if (verdict === "caution") return `${animal[0].toUpperCase()}${animal.slice(1)} for ${forPurpose}: check the risks below before buying.`;
  return `This ${animal} is not a good match for ${forPurpose}.`;
};

const enPurposeFit = (level, breed, purpose) => {
  const forPurpose = PURPOSE_LABEL[purpose] || "your purpose";
  if (level === "unknown" || !breed?.label || breed.uncertain) {
    return `Breed suitability for ${forPurpose} could not be confirmed from the photos.`;
  }
  return `${{ strong: "Strong fit", fair: "Fair fit", weak: "Weak fit" }[level]}: ${breed.label} for ${forPurpose}.`;
};

const enReport = ({ purpose, species, breed, age, health, rules }) => {
  const reasons = [...rules.reasons];
  if (age?.age_years != null) {
    const teeth = age.permanent_incisors_estimate;
    reasons.push(
      `About ${age.age_years} year${age.age_years === 1 ? "" : "s"} old` +
        (teeth != null ? ` (about ${teeth} permanent front teeth)` : "") +
        (age.uncertain ? ", estimate uncertain." : ".")
    );
  }
  const checks = PRACTICAL_CHECKS.en;
  return {
    summary: enSummary(rules, breed, species?.species, purpose, health?.condition),
    reasons,
    risks: [...rules.risks, ...checks.common],
    purposeFit: enPurposeFit(rules.purposeFitLevel, breed, purpose),
    tips: checks[purpose] || checks.other
  };
};

// ------------------------------------------------------------------------------------------- Urdu

const urAnimal = (breed, species) =>
  [breed?.uncertain ? null : breed?.label, species === "buffalo" ? "بھینس" : "گائے"].filter(Boolean).join(" ");

const urReport = ({ purpose, species, breed, age, health, rules, budget, sellerPrice }) => {
  const { verdict, flags, purposeFitLevel } = rules;
  const animal = urAnimal(breed, species?.species);
  const forPurpose = UR_PURPOSE[purpose] || UR_PURPOSE.other;
  const condition = health?.condition;

  let summary;
  if (flags.includes("fmd") || flags.includes("lumpy_skin")) summary = `تجویز نہیں: تصویروں میں ${UR_DISEASE[condition]} کی علامات ہیں۔`;
  else if (flags.includes("qurbani_underage")) summary = `تجویز نہیں: یہ ${animal} قربانی کے لیے کم عمر لگتی ہے۔`;
  else if (verdict === "recommended") summary = `صحت مند ${animal}، ${forPurpose} کے لیے اچھا انتخاب۔`;
  else if (verdict === "caution") summary = `${forPurpose} کے لیے ${animal}: خریدنے سے پہلے نیچے دیے گئے خطرات چیک کریں۔`;
  else summary = `یہ ${animal} ${forPurpose} کے لیے مناسب نہیں۔`;

  const reasons = [];
  if (condition === "foot-and-mouth" || condition === "lumpy") reasons.push(`تصویروں میں ${UR_DISEASE[condition]} کی علامات ملی ہیں۔`);
  else if (condition === "healthy") reasons.push("تصویروں میں منہ کھر یا لمپی اسکن بیماری کی کوئی علامت نہیں ملی۔");
  if (flags.includes("qurbani_underage")) reasons.push("عمر کی وجہ سے قربانی کے لیے موزوں نہیں: دانتوں کے مطابق عمر 2 سال سے کم ہے۔");
  if (purposeFitLevel !== "unknown" && breed?.label && !breed.uncertain) {
    reasons.push(`${breed.label} نسل ${forPurpose} کے لیے ${UR_FIT[purposeFitLevel]} ہے۔`);
  }
  if (age?.age_years != null) {
    const teeth = age.permanent_incisors_estimate;
    reasons.push(
      `عمر تقریباً ${age.age_years} سال` + (teeth != null ? ` (تقریباً ${teeth} پکے دانت)` : "") + (age.uncertain ? "، اندازہ یقینی نہیں۔" : "۔")
    );
  }

  const risks = [];
  if (flags.includes("fmd") || flags.includes("lumpy_skin")) risks.push("سودا کرنے سے پہلے جانور کو ڈاکٹر (ویٹرنری) کو دکھائیں؛ یہ بیماری آپ کے دوسرے جانوروں میں پھیل سکتی ہے۔");
  if (flags.includes("health_uncertain")) risks.push("صحت کی جانچ واضح نہیں ہوئی: منہ، کھر اور جلد خود چیک کریں۔");
  if (flags.includes("qurbani_age_unclear")) risks.push("قربانی کے لیے خریدنے سے پہلے کم از کم دو پکے دانت (دو دانت) خود دیکھ کر تصدیق کریں۔");
  if (flags.includes("low_confidence")) risks.push("AI کو کچھ نتائج پر یقین کم ہے: اچھی روشنی میں صاف تصویریں دوبارہ لیں۔");
  if (flags.includes("age_uncertain")) risks.push("عمر کا اندازہ یقینی نہیں: سامنے کے دانت خود چیک کریں۔");
  if (flags.includes("teeth_photo_quality")) risks.push("دانتوں کی تصویر صاف نہیں تھی؛ عمر کا اندازہ غلط ہو سکتا ہے۔");
  if (flags.includes("too_old_for_purpose")) risks.push(`تقریباً ${age?.age_years} سال کی عمر ${forPurpose} کے لیے زیادہ ہے: کارآمد سال کم باقی ہیں؛ دانت اور تھن یا جسم کی حالت خود دیکھیں۔`);
  if (flags.includes("too_young_for_purpose")) risks.push(`تقریباً ${age?.age_years} سال کی عمر ${forPurpose} کے لیے کم ہے: کارآمد ہونے میں وقت لگ سکتا ہے۔`);
  if (flags.includes("over_budget") && budget > 0) {
    risks.push(`بیچنے والے کی قیمت آپ کے بجٹ سے ${Math.round(((sellerPrice - budget) / budget) * 100)}% زیادہ ہے۔`);
  }
  const checks = PRACTICAL_CHECKS.ur;

  const purposeFit =
    purposeFitLevel === "unknown" || !breed?.label || breed.uncertain
      ? `تصویروں سے ${forPurpose} کے لیے نسل کی موزونیت کی تصدیق نہیں ہو سکی۔`
      : `${breed.label}: ${forPurpose} کے لیے ${UR_FIT[purposeFitLevel]}۔`;

  return { summary, reasons, risks: [...risks, ...checks.common], purposeFit, tips: checks[purpose] || checks.other };
};

/**
 * @param {object} ctx { purpose, language, budget, sellerPrice, species, breed (reconciled), age, health, rules }
 */
const templateReport = (ctx) => {
  const body = ctx.language === "ur" ? urReport(ctx) : enReport(ctx);
  return { ...body, purposeFitLevel: ctx.rules.purposeFitLevel, source: "template", promptVersion: null };
};

module.exports = { templateReport };
