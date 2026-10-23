const axios = require("axios");
const FormData = require("form-data");

const TIMEOUT_MS = 60000;

class MLServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const baseUrl = () => process.env.ML_SERVICE_URL || "http://localhost:8000";

const appendFile = (form, field, file, index) => {
  form.append(field, file.buffer, {
    filename: file.originalname || `${field}-${index}.jpg`,
    contentType: file.mimetype || "image/jpeg"
  });
};

// files: [{ field, file }] where file is a multer file ({ buffer, originalname, mimetype })
const post = async (path, files, fields = {}) => {
  const form = new FormData();
  files.forEach(({ field, file }, i) => appendFile(form, field, file, i));
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value));
  });

  try {
    const response = await axios.post(`${baseUrl()}${path}`, form, {
      headers: form.getHeaders(),
      timeout: TIMEOUT_MS,
      maxBodyLength: Infinity
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
      throw new MLServiceError("Analysis service is unavailable. Please try again shortly.", 503);
    }
    const status = error.response?.status === 400 ? 400 : 502;
    const message = error.response?.data?.detail || error.message || "Analysis failed";
    throw new MLServiceError(typeof message === "string" ? message : JSON.stringify(message), status);
  }
};

module.exports = {
  MLServiceError,
  quality: (file) => post("/quality", [{ field: "image", file }]),
  species: (file) => post("/predict/species", [{ field: "image", file }]),
  breed: (files, species) =>
    post("/predict/breed", files.map((file) => ({ field: "images", file })), { species }),
  // The teeth photo is always scored; its quality result says whether the number can be trusted
  age: (file) => post("/predict/age?enforce_quality=false", [{ field: "image", file }]),
  health: (files, views) =>
    post("/predict/health", files.map((file) => ({ field: "images", file })), { views: views.join(",") }),
  legacyPredict: (file) => post("/predict", [{ field: "bodyImage", file }])
};
