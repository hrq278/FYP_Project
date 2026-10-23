const cloudinary = require("cloudinary").v2;

const FOLDER = "maweshiai/evaluations";

let configured = false;

const isConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const ensureConfigured = () => {
  if (configured) return;
  if (!isConfigured()) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)");
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  configured = true;
};

// Uploads one photo; returns { url, publicId }
const uploadImage = (buffer, { evaluationId, view }) => {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `${FOLDER}/${evaluationId}`, public_id: view, resource_type: "image", overwrite: true },
      (error, result) => (error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id }))
    );
    stream.end(buffer);
  });
};

const deleteImages = async (publicIds) => {
  if (!publicIds.length || !isConfigured()) return;
  ensureConfigured();
  await cloudinary.api.delete_resources(publicIds);
};

module.exports = { isConfigured, uploadImage, deleteImages };
