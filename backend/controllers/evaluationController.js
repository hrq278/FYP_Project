const crypto = require("crypto");
const mongoose = require("mongoose");
const Evaluation = require("../models/Evaluation");
const { PURPOSES, VIEWS, STEP_KEYS } = require("../models/Evaluation");
const ml = require("../services/mlClient");
const pipeline = require("../services/pipeline");
const storage = require("../services/storage");

const PAGE_SIZE = 20;

const ownerFilter = (user) => (user.isGuest ? { guestId: user.guestId } : { userId: user.userId });

const parseAmount = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

// MW-YYMMDD-NNNN, retried on the rare collision
const newReportId = async () => {
  const d = new Date();
  const day = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 5; i += 1) {
    const id = `MW-${day}-${String(crypto.randomInt(0, 10000)).padStart(4, "0")}`;
    if (!(await Evaluation.exists({ reportId: id }))) return id;
  }
  throw new Error("Could not allocate a report id");
};

const sendError = (res, error, fallback) => {
  const status = [400, 503].includes(error.status) ? error.status : error.status === 502 ? 502 : 500;
  return res.status(status).json({ message: error.message || fallback });
};

// POST /api/evaluations/quality — instant feedback for one capture screen
const checkQuality = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }
    const view = req.body.view;
    if (view && !VIEWS.includes(view)) {
      return res.status(400).json({ message: `view must be one of ${VIEWS.join(", ")}` });
    }
    // The front photo also gets the species pre-check, so "not cattle" shows before the user goes on
    const [quality, species] = await Promise.all([
      ml.quality(req.file),
      view === "front" ? ml.species(req.file) : Promise.resolve(null)
    ]);
    return res.status(200).json({
      view: view || null,
      quality,
      species: species ? { species: species.species, confidence: species.confidence, isCattle: species.species !== "unknown" } : null
    });
  } catch (error) {
    return sendError(res, error, "Quality check failed");
  }
};

// POST /api/evaluations — 5 photos + purpose form; returns immediately, analysis runs in the background
const createEvaluation = async (req, res) => {
  try {
    const files = Object.fromEntries(VIEWS.map((v) => [v, req.files?.[v]?.[0]]));
    const missing = VIEWS.filter((v) => !files[v]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing photos: ${missing.join(", ")}` });
    }

    const { purpose, experience = "first_time", language = "en" } = req.body;
    if (!PURPOSES.includes(purpose)) {
      return res.status(400).json({ message: `purpose must be one of ${PURPOSES.join(", ")}` });
    }
    if (!["first_time", "experienced"].includes(experience)) {
      return res.status(400).json({ message: "experience must be first_time or experienced" });
    }
    if (!["en", "ur"].includes(language)) {
      return res.status(400).json({ message: "language must be en or ur" });
    }
    const budget = parseAmount(req.body.budget);
    const sellerPrice = parseAmount(req.body.sellerPrice);
    if (Number.isNaN(budget) || Number.isNaN(sellerPrice)) {
      return res.status(400).json({ message: "budget and sellerPrice must be positive numbers" });
    }
    let quality;
    if (req.body.quality) {
      try {
        quality = JSON.parse(req.body.quality);
      } catch {
        return res.status(400).json({ message: "quality must be JSON" });
      }
    }

    const evaluation = await Evaluation.create({
      ...ownerFilter(req.user),
      status: "processing",
      purpose,
      budget,
      sellerPrice,
      experience,
      language,
      quality,
      steps: STEP_KEYS.map((key) => ({ key, status: "waiting" })),
      reportId: await newReportId(),
      shareKey: crypto.randomBytes(12).toString("hex")
    });

    // Not awaited: the app polls GET /api/evaluations/:id
    pipeline.run(evaluation._id, files).catch((error) => console.error("Pipeline crashed:", error));

    return res.status(202).json({ id: evaluation._id, reportId: evaluation.reportId, status: evaluation.status });
  } catch (error) {
    return sendError(res, error, "Failed to start the evaluation");
  }
};

const findOwned = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return Evaluation.findOne({ _id: req.params.id, ...ownerFilter(req.user) });
};

// GET /api/evaluations/:id — status, steps, results (owner only)
const getEvaluation = async (req, res) => {
  const evaluation = await findOwned(req);
  if (!evaluation) {
    return res.status(404).json({ message: "Evaluation not found" });
  }
  return res.status(200).json({ evaluation });
};

// GET /api/evaluations?verdict=&q=&page= — history list
const listEvaluations = async (req, res) => {
  const filter = { ...ownerFilter(req.user), legacy: { $ne: true } };
  const { verdict, q } = req.query;
  if (verdict) {
    if (!["recommended", "caution", "not_recommended"].includes(verdict)) {
      return res.status(400).json({ message: "verdict must be recommended, caution or not_recommended" });
    }
    filter.verdict = verdict;
  }
  if (q && String(q).trim()) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ "results.breed.final.label": rx }, { reportId: rx }, { purpose: rx }];
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const [items, total] = await Promise.all([
    Evaluation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Evaluation.countDocuments(filter)
  ]);
  return res.status(200).json({
    page,
    pageSize: PAGE_SIZE,
    total,
    items: items.map((e) => ({
      id: e._id,
      reportId: e.reportId,
      status: e.status,
      purpose: e.purpose,
      verdict: e.verdict || null,
      score: e.score ?? null,
      species: e.results?.species?.species || null,
      breed: e.results?.breed?.final?.label || null,
      thumbnail: e.images?.front?.url || null,
      createdAt: e.createdAt
    }))
  });
};

// DELETE /api/evaluations/:id
const deleteEvaluation = async (req, res) => {
  const evaluation = await findOwned(req);
  if (!evaluation) {
    return res.status(404).json({ message: "Evaluation not found" });
  }
  const publicIds = VIEWS.map((v) => evaluation.images?.[v]?.publicId).filter(Boolean);
  await evaluation.deleteOne();
  storage.deleteImages(publicIds).catch((error) => console.error("Cloudinary delete failed:", error.message));
  return res.status(200).json({ message: "Evaluation deleted" });
};

module.exports = { checkQuality, createEvaluation, getEvaluation, listEvaluations, deleteEvaluation };
