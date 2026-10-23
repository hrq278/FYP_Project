const express = require("express");
const {
	registerUser,
	loginUser,
	getProfile,
	updateSettings,
	logoutUser
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getProfile);
router.put("/settings", authMiddleware, updateSettings);
router.post("/logout", authMiddleware, logoutUser);

module.exports = router;
