const express = require("express");
const {
	guestLogin,
	registerUser,
	loginUser,
	getProfile,
	updateSettings,
	logoutUser
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAccount } = authMiddleware;

const router = express.Router();

router.post("/guest", guestLogin);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, requireAccount, getProfile);
router.put("/settings", authMiddleware, requireAccount, updateSettings);
router.post("/logout", authMiddleware, logoutUser);

module.exports = router;
