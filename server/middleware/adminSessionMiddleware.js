const jwt = require("jsonwebtoken");

const normalizeText = (value = "") => value.trim();

const getAdminJwtSecret = () => normalizeText(process.env.JWT_SECRET || "flyvora-admin-demo-secret");

const authenticateAdminSession = (req, res, next) => {
  const authorizationHeader = req.headers.authorization || "";
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ message: "Admin session token is required." });
  }

  try {
    const decoded = jwt.verify(token, getAdminJwtSecret());

    if (decoded?.role !== "admin") {
      return res.status(403).json({ message: "Admin access is restricted." });
    }

    req.adminSession = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Admin session is invalid or has expired." });
  }
};

module.exports = {
  authenticateAdminSession,
  getAdminJwtSecret,
};
