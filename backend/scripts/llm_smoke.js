/**
 * Real-API check for the LLM features. Needs LLM_API_KEY in backend/.env (costs well under 1 US cent).
 *
 *   node scripts/llm_smoke.js [path/to/side-photo.jpg]
 *
 * Runs one breed check (if a photo is given), one English and one Urdu report, one chat answer and one
 * comparison explanation, and prints each result with its timing.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const llm = require("../services/llm");

const rules = {
  verdict: "caution",
  score: 64,
  purposeFitLevel: "strong",
  reasons: ["No signs of Foot-and-Mouth or Lumpy Skin Disease in the photos.", "Sahiwal is a strong fit for milk."],
  risks: ["The age estimate is uncertain: check the front teeth in person.", "The seller's price is 30% above your budget."],
  flags: ["age_uncertain", "over_budget"]
};
const ctx = (language) => ({
  purpose: "milk",
  language,
  budget: 200000,
  sellerPrice: 260000,
  experience: "first_time",
  species: { species: "cow", confidence: 0.92 },
  breed: { label: "Sahiwal", confidence: 0.81, uncertain: false, source: "model+ai_vision" },
  age: { age_years: 4, interval_90: [2, 7], permanent_incisors_estimate: 6, uncertain: true, quality: { ok: true } },
  health: { condition: "healthy", confidence: 0.9 },
  rules
});

const timed = async (label, fn) => {
  const t = Date.now();
  try {
    const out = await fn();
    console.log(`\n=== ${label} (${Date.now() - t} ms)\n${JSON.stringify(out, null, 2)}`);
  } catch (error) {
    console.log(`\n=== ${label} FAILED (${Date.now() - t} ms): ${error.message}`);
  }
};

(async () => {
  if (!llm.isConfigured()) {
    console.log("LLM_API_KEY is not set in backend/.env");
    process.exit(1);
  }
  console.log(`Model: ${process.env.LLM_MODEL || "claude-haiku-5-5"}`);
  const photo = process.argv[2];
  if (photo) {
    const ext = path.extname(photo).toLowerCase();
    const mimetype = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    await timed("breed check", () =>
      llm.verifyBreed({ image: { buffer: fs.readFileSync(photo), mimetype }, species: "cow", modelTop3: [{ breed: "Sahiwal", confidence: 0.55 }] })
    );
  }
  await timed("report (English)", () => llm.generateReport(ctx("en")));
  await timed("report (Urdu)", () => llm.generateReport(ctx("ur")));
  await timed("chat", () =>
    llm.answerQuestion({
      evaluation: { purpose: "milk", language: "en", verdict: "caution", score: 64, results: { breed: { final: { label: "Sahiwal" } }, species: { species: "cow" }, age: { age_years: 4, uncertain: true }, health: { condition: "healthy" } } },
      history: [],
      question: "How much milk will it give, and is the price fair?"
    })
  );
  await timed("compare", () =>
    llm.explainComparison({
      purpose: "milk",
      language: "en",
      winner: { letter: "A", score: 78, breed: "Sahiwal", ageYears: 3, health: "healthy", purposeFitLevel: "strong" },
      other: { letter: "B", score: 61, breed: "Red Sindhi", ageYears: 5, health: "uncertain", purposeFitLevel: "strong" }
    })
  );
})();
