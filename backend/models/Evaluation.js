const mongoose = require("mongoose");

const PURPOSES = ["milk", "breeding", "qurbani", "meat", "farm_work", "other"];
const VIEWS = ["front", "back", "left", "right", "teeth"];
const STEP_KEYS = ["species", "breed", "age", "health", "report"];

const imageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String
  },
  { _id: false }
);

const stepSchema = new mongoose.Schema(
  {
    key: { type: String, enum: STEP_KEYS, required: true },
    status: { type: String, enum: ["waiting", "working", "done", "failed", "skipped"], default: "waiting" },
    summary: String
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    // Exactly one of userId (signed-in) or guestId (guest token) owns the evaluation
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    guestId: { type: String, index: true },

    status: { type: String, enum: ["processing", "done", "failed", "rejected"], default: "processing" },
    reason: String,

    purpose: { type: String, enum: PURPOSES },
    budget: Number,
    sellerPrice: Number,
    experience: { type: String, enum: ["first_time", "experienced"], default: "first_time" },
    language: { type: String, enum: ["en", "ur"], default: "en" },

    images: {
      front: imageSchema,
      back: imageSchema,
      left: imageSchema,
      right: imageSchema,
      teeth: imageSchema
    },
    quality: mongoose.Schema.Types.Mixed,
    steps: [stepSchema],

    // Raw model and LLM outputs, kept for the thesis and for re-scoring
    results: {
      species: mongoose.Schema.Types.Mixed,
      breed: mongoose.Schema.Types.Mixed,
      breedVerification: mongoose.Schema.Types.Mixed,
      age: mongoose.Schema.Types.Mixed,
      health: mongoose.Schema.Types.Mixed
    },

    verdict: { type: String, enum: ["recommended", "caution", "not_recommended"] },
    score: Number,
    scoreBreakdown: mongoose.Schema.Types.Mixed,
    report: {
      summary: String,
      reasons: [String],
      risks: [String],
      purposeFit: String,
      purposeFitLevel: { type: String, enum: ["strong", "fair", "weak", "unknown"] },
      tips: [String],
      source: { type: String, enum: ["llm", "template"] },
      promptVersion: String
    },
    reportId: { type: String, unique: true, sparse: true },

    // Created by the original single-photo /api/evaluate endpoint
    legacy: { type: Boolean, default: false }
  },
  { timestamps: true }
);

evaluationSchema.index({ userId: 1, createdAt: -1 });
evaluationSchema.index({ guestId: 1, createdAt: -1 });

module.exports = mongoose.model("Evaluation", evaluationSchema);
module.exports.PURPOSES = PURPOSES;
module.exports.VIEWS = VIEWS;
module.exports.STEP_KEYS = STEP_KEYS;
