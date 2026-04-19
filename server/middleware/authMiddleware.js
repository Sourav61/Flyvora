const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  const authorizationHeader = req.headers.authorization || "";
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : null;

  if (!secret) {
    return res.status(500).json({ message: "JWT_SECRET is required" });
  }

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const authenticateAdminToken = (req, res, next) =>
  authenticateToken(req, res, () => {
    const userRole = String(req.user?.role || "").trim().toLowerCase();

    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access is required" });
    }

    return next();
  });

module.exports = {
  authenticateToken,
  authenticateAdminToken,
};
