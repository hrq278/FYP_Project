const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const { evaluateAnimal } = require("../controllers/evaluateController");

const router = express.Router();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    const error = new Error("Only JPEG, PNG or WebP images are allowed");
    error.status = 400;
    return cb(error);
  }
});

// Turns multer's errors into 400 responses instead of generic 500s.
const uploadBodyImage = (req, res, next) => {
  upload.single("bodyImage")(req, res, (err) => {
    if (!err) {
      return next();
    }
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 8 MB or smaller" : err.message;
      return res.status(400).json({ message });
    }
    return res.status(err.status || 500).json({ message: err.message });
  });
};

router.post("/", authMiddleware, uploadBodyImage, evaluateAnimal);

module.exports = router;
