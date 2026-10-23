const multer = require("multer");

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

// Wraps a multer middleware so its errors become 400 responses instead of generic 500s
const handle = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
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

module.exports = {
  single: (field) => handle(upload.single(field)),
  fields: (fields) => handle(upload.fields(fields))
};
