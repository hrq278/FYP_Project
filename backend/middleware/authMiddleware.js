const jwt = require("jsonwebtoken");

// Accepts user tokens ({ userId }) and guest tokens ({ guestId, guest: true })
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.guest
      ? { userId: null, guestId: decoded.guestId, isGuest: true }
      : { userId: decoded.userId, guestId: null, isGuest: false };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: invalid token" });
  }
};

// For routes that need a real account (profile, settings)
const requireAccount = (req, res, next) => {
  if (req.user?.isGuest) {
    return res.status(403).json({ message: "Sign up to use this feature" });
  }
  return next();
};

module.exports = authMiddleware;
module.exports.requireAccount = requireAccount;
