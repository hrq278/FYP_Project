const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Guests get a random id; their history list lives on the device, the server only keeps the evaluations
const guestLogin = async (req, res) => {
  const guestId = `guest_${crypto.randomUUID()}`;
  const token = jwt.sign({ guestId, guest: true }, process.env.JWT_SECRET, { expiresIn: "30d" });
  return res.status(201).json({ token, guest: true, guestId });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    const token = createToken(user._id.toString());
    return res.status(201).json({ token });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(user._id.toString());
    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("name email settings createdAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      settings: {
        preferredLanguage: user.settings?.preferredLanguage || "en",
        alertsEnabled: typeof user.settings?.alertsEnabled === "boolean" ? user.settings.alertsEnabled : true
      }
    };

    return res.status(200).json({ user: normalizedUser });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { preferredLanguage, alertsEnabled } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.settings) {
      user.settings = {
        preferredLanguage: "en",
        alertsEnabled: true
      };
    }

    if (typeof preferredLanguage === "string" && preferredLanguage.trim()) {
      user.settings.preferredLanguage = preferredLanguage.trim();
    }

    if (typeof alertsEnabled === "boolean") {
      user.settings.alertsEnabled = alertsEnabled;
    }

    await user.save();

    return res.status(200).json({
      message: "Settings updated",
      settings: user.settings
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update settings" });
  }
};

const logoutUser = async (req, res) => {
  return res.status(200).json({ message: "Logged out successfully" });
};

module.exports = {
  guestLogin,
  registerUser,
  loginUser,
  getProfile,
  updateSettings,
  logoutUser
};
