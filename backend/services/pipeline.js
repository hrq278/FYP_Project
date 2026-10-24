/**
 * Runs one evaluation in the background: species -> breed (+ LLM check) -> age -> health -> report.
 * Updates `steps[]` after each stage so the app's Processing screen shows real progress. Photos are uploaded
 * to Cloudinary in parallel with the model calls.
 */
const Evaluation = require("../models/Evaluation");
const ml = require("./mlClient");
const storage = require("./storage");
const llm = require("./llm");
const rules = require("./rules");
const breedService = require("./breed");
const breedKnowledge = require("./breedKnowledge");
const { templateReport } = require("./report");

const VIEWS = ["front", "back", "left", "right", "teeth"];
// The disease model was trained on body photos; on healthy dentition close-ups it
// says foot-and-mouth ~40% of the time (32/80 sampled), so the teeth photo is
// only used for age.
const HEALTH_VIEWS = ["front", "back", "left", "right"];

const pct = (c) => `${Math.round((c || 0) * 100)}%`;

const setStep = (id, key, status, summary) =>
  Evaluation.updateOne(
    { _id: id, "steps.key": key },
    { $set: { "steps.$.status": status, ...(summary !== undefined ? { "steps.$.summary": summary } : {}) } }
  );

const uploadAll = async (id, files) => {
  const images = {};
  await Promise.all(
    VIEWS.map(async (view) => {
      images[view] = await storage.uploadImage(files[view].buffer, { evaluationId: String(id), view });
    })
  );
  await Evaluation.updateOne({ _id: id }, { $set: { images } });
  return images;
};

// Step summaries shown live on the Processing screen, in the evaluation's language
const STEP_TEXT = {
  en: {
    cow: "Cow",
    buffalo: "Buffalo",
    notCattle: "Not a cow or buffalo",
    possibly: (label) => `Possibly ${label}`,
    readingTeeth: "Reading the teeth…",
    years: (n, uncertain) => `~${n} year${n === 1 ? "" : "s"}${uncertain ? " (uncertain)" : ""}`,
    notReadable: "Not readable",
    bodyCheck: "Skin, legs and hooves",
    health: { healthy: "No disease signs", "foot-and-mouth": "Signs of FMD", lumpy: "Signs of Lumpy Skin Disease", uncertain: "Not conclusive" },
    aiReport: "AI report ready",
    report: "Report ready"
  },
  ur: {
    cow: "گائے",
    buffalo: "بھینس",
    notCattle: "گائے یا بھینس نہیں",
    possibly: (label) => `شاید ${label}`,
    readingTeeth: "دانت پڑھے جا رہے ہیں…",
    years: (n, uncertain) => `تقریباً ${n} سال${uncertain ? " (یقینی نہیں)" : ""}`,
    notReadable: "پڑھا نہیں جا سکا",
    bodyCheck: "جلد، ٹانگیں اور کھر",
    health: { healthy: "بیماری کی کوئی علامت نہیں", "foot-and-mouth": "منہ کھر کی علامات", lumpy: "لمپی اسکن کی علامات", uncertain: "واضح نہیں" },
    aiReport: "AI رپورٹ تیار",
    report: "رپورٹ تیار"
  }
};

/**
 * @param {string} id      Evaluation _id (already created with status "processing")
 * @param {object} files   { front, back, left, right, teeth } multer files (buffers in memory)
 */
const run = async (id, files) => {
  let current = "species";
  // Uploading shouldn't fail the analysis: the report still works without stored photos
  const upload = (storage.isConfigured() ? uploadAll(id, files) : Promise.resolve(null)).catch((error) => {
    console.error(`Evaluation ${id}: photo upload failed: ${error.message}`);
    return null;
  });

  try {
    const evaluation = await Evaluation.findById(id).lean();
    const say = STEP_TEXT[evaluation.language] || STEP_TEXT.en;

    // 1. Species (front photo)
    await setStep(id, "species", "working");
    const species = await ml.species(files.front);
    if (species.species === "unknown") {
      await setStep(id, "species", "failed", say.notCattle);
      await Evaluation.updateOne(
        { _id: id },
        {
          $set: {
            status: "rejected",
            reason: "not_cattle",
            "results.species": species,
            "steps.$[s].status": "skipped"
          }
        },
        { arrayFilters: [{ "s.key": { $in: ["breed", "age", "health", "report"] } }] }
      );
      await upload;
      return;
    }
    await Evaluation.updateOne({ _id: id }, { $set: { "results.species": species } });
    await setStep(id, "species", "done", `${species.species === "buffalo" ? say.buffalo : say.cow} (${pct(species.confidence)})`);

    // 2. Breed: model on front + sides, then the LLM's check of one side photo
    current = "breed";
    await setStep(id, "breed", "working");
    const breedModel = await ml.breed([files.front, files.left, files.right], species.species, species.confidence);
    let verification = null;
    if (llm.isConfigured()) {
      try {
        verification = await llm.verifyBreed({
          image: files.left,
          species: species.species,
          modelTop3: breedModel.top3
        });
      } catch (error) {
        verification = { error: error.message };
      }
    } else {
      verification = { skipped: true, note: "LLM not configured" };
    }
    const breed = breedService.reconcile(breedModel, verification && !verification.skipped && !verification.error ? verification : null);
    await Evaluation.updateOne(
      { _id: id },
      { $set: { "results.breed": { ...breedModel, final: breed }, "results.breedVerification": verification } }
    );
    await setStep(id, "breed", "done", breed.uncertain ? say.possibly(breed.label) : breed.label);

    // 3. Age (teeth photo)
    current = "age";
    await setStep(id, "age", "working", say.readingTeeth);
    const age = await ml.age(files.teeth);
    await Evaluation.updateOne({ _id: id }, { $set: { "results.age": age } });
    await setStep(
      id,
      "age",
      "done",
      age.age_years != null ? say.years(age.age_years, age.uncertain) : say.notReadable
    );

    // 4. Health (the four body photos)
    current = "health";
    await setStep(id, "health", "working", say.bodyCheck);
    const health = await ml.health(HEALTH_VIEWS.map((v) => files[v]), HEALTH_VIEWS);
    await Evaluation.updateOne({ _id: id }, { $set: { "results.health": health } });
    await setStep(id, "health", "done", say.health[health.condition] || say.health.uncertain);

    // 5. Rules, score and report
    current = "report";
    await setStep(id, "report", "working");
    const ruleResult = rules.evaluate({
      purpose: evaluation.purpose,
      budget: evaluation.budget,
      sellerPrice: evaluation.sellerPrice,
      species,
      breed,
      age,
      health,
      purposeFitLevel: breedKnowledge.purposeFit(breed.label, evaluation.purpose)
    });
    const context = { ...evaluation, species, breed, age, health, rules: ruleResult };
    let report = null;
    if (llm.isConfigured()) {
      try {
        report = await llm.generateReport(context);
      } catch (error) {
        console.error(`Evaluation ${id}: LLM report failed, using template: ${error.message}`);
      }
    }
    report = report || templateReport(context);

    await upload;
    await Evaluation.updateOne(
      { _id: id },
      {
        $set: {
          status: "done",
          verdict: ruleResult.verdict,
          score: ruleResult.score,
          scoreBreakdown: { ...ruleResult.scoreBreakdown, flags: ruleResult.flags },
          report
        }
      }
    );
    await setStep(id, "report", "done", report.source === "llm" ? say.aiReport : say.report);
  } catch (error) {
    console.error(`Evaluation ${id} failed at ${current}: ${error.message}`);
    await setStep(id, current, "failed", error.message);
    await Evaluation.updateOne(
      { _id: id },
      { $set: { status: "failed", reason: error.status === 503 ? "ml_unavailable" : `${current}_failed` } }
    );
    await upload;
  }
};

module.exports = { run, VIEWS };
