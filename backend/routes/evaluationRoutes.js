const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  checkQuality,
  createEvaluation,
  getEvaluation,
  listEvaluations,
  deleteEvaluation
} = require("../controllers/evaluationController");

const router = express.Router();

const photoFields = ["front", "back", "left", "right", "teeth"].map((name) => ({ name, maxCount: 1 }));

router.use(authMiddleware);
router.post("/quality", upload.single("image"), checkQuality);
router.post("/", upload.fields(photoFields), createEvaluation);
router.get("/", listEvaluations);
router.get("/:id", getEvaluation);
router.delete("/:id", deleteEvaluation);

module.exports = router;
