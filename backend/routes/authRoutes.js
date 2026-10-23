const express = require("express");
const {
	deleteAccount,
	guestLogin,
	registerUser,
	loginUser,
	getProfile,
	updateSettings,
	logoutUser
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const wrap = require("../middleware/asyncHandler");
const { requireAccount } = authMiddleware;

const router = express.Router();

router.post("/guest", wrap(guestLogin));
router.post("/register", wrap(registerUser));
router.post("/login", wrap(loginUser));
router.get("/profile", authMiddleware, requireAccount, wrap(getProfile));
router.put("/settings", authMiddleware, requireAccount, wrap(updateSettings));
router.post("/logout", authMiddleware, wrap(logoutUser));
router.delete("/account", authMiddleware, requireAccount, wrap(deleteAccount));

module.exports = router;
