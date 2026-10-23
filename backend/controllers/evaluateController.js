const axios = require("axios");
const FormData = require("form-data");
const Evaluation = require("../models/Evaluation");

const evaluateAnimal = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Body image is required" });
    }

    const formData = new FormData();
    formData.append("bodyImage", req.file.buffer, {
      filename: req.file.originalname || "body-image.jpg",
      contentType: req.file.mimetype || "image/jpeg"
    });

    const mlUrl = `${process.env.ML_SERVICE_URL}/predict`;
    const mlResponse = await axios.post(mlUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    const { species, confidence } = mlResponse.data;

    const evaluation = await Evaluation.create({
      userId: req.user.userId,
      bodyImage: req.file.originalname || "body-image.jpg",
      result: {
        species,
        confidence
      }
    });

    return res.status(200).json({
      species,
      confidence,
      createdAt: evaluation.createdAt
    });
  } catch (error) {
    // ML service never answered: down, unreachable or timed out.
    if (axios.isAxiosError(error) && !error.response) {
      return res.status(503).json({ message: "Analysis service is unavailable. Please try again shortly." });
    }

    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      "Failed to evaluate animal";
    const status = error.response?.status === 400 ? 400 : 500;

    return res.status(status).json({ message });
  }
};

module.exports = {
  evaluateAnimal
};
