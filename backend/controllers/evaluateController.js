const Evaluation = require("../models/Evaluation");
const ml = require("../services/mlClient");

// Original single-photo endpoint, kept for the current mobile app until the new flow (Module 5) replaces it
const evaluateAnimal = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Body image is required" });
    }

    const { species, confidence } = await ml.legacyPredict(req.file);

    const evaluation = await Evaluation.create({
      userId: req.user.userId || undefined,
      guestId: req.user.guestId || undefined,
      legacy: true,
      status: "done",
      results: { species: { species, confidence } }
    });

    return res.status(200).json({
      species,
      confidence,
      createdAt: evaluation.createdAt
    });
  } catch (error) {
    const status = error.status === 503 || error.status === 400 ? error.status : 500;
    return res.status(status).json({ message: error.message || "Failed to evaluate animal" });
  }
};

module.exports = {
  evaluateAnimal
};
