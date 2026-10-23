const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const wrap = require("../middleware/asyncHandler");
const {
  checkQuality,
  createEvaluation,
  getEvaluation,
  listEvaluations,
  deleteEvaluation
} = require("../controllers/evaluationController");
const { chat, compare } = require("../controllers/assistantController");

const router = express.Router();

const photoFields = ["front", "back", "left", "right", "teeth"].map((name) => ({ name, maxCount: 1 }));

router.use(authMiddleware);
router.post("/quality", upload.single("image"), wrap(checkQuality));
router.post("/", upload.fields(photoFields), wrap(createEvaluation));
router.post("/compare", wrap(compare));
router.get("/", wrap(listEvaluations));
router.get("/:id", wrap(getEvaluation));
router.delete("/:id", wrap(deleteEvaluation));
router.post("/:id/chat", wrap(chat));

module.exports = router;
