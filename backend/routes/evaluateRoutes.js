const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const wrap = require("../middleware/asyncHandler");
const { evaluateAnimal } = require("../controllers/evaluateController");

const router = express.Router();

router.post("/", authMiddleware, upload.single("bodyImage"), wrap(evaluateAnimal));

module.exports = router;
