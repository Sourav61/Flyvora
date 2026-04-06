const jwt = require("jsonwebtoken");
const { getAdminJwtSecret } = require("../middleware/adminSessionMiddleware");

const ADMIN_SESSION_TTL = "4h";
const normalizeText = (value = "") => value.trim();
const ADMIN_FALLBACK_USERNAME = "admin";
const ADMIN_FALLBACK_PASSWORD = "FlyvoraDemo123!";

const getConfiguredAdminCredentials = () => ({
  username: normalizeText(process.env.ADMIN_DASHBOARD_USERNAME || ADMIN_FALLBACK_USERNAME),
  password: normalizeText(process.env.ADMIN_DASHBOARD_PASSWORD || ADMIN_FALLBACK_PASSWORD),
});

const createAdminToken = ({ username }) =>
  jwt.sign(
    {
      role: "admin",
      username,
    },
    getAdminJwtSecret(),
    { expiresIn: ADMIN_SESSION_TTL }
  );

const loginAdminSession = async (req, res) => {
  const { username = "", password = "" } = req.body || {};
  const normalizedUsername = normalizeText(username);
  const normalizedPassword = normalizeText(password);
  const adminCredentials = getConfiguredAdminCredentials();

  if (!normalizedUsername || !normalizedPassword) {
    return res.status(400).json({ message: "Admin username and password are required." });
  }

  if (
    normalizedUsername !== adminCredentials.username ||
    normalizedPassword !== adminCredentials.password
  ) {
    return res.status(401).json({ message: "Admin credentials are incorrect." });
  }

  const token = createAdminToken({ username: normalizedUsername });
  const decodedToken = jwt.decode(token);

  return res.status(200).json({
    message: "Admin session started.",
    session: {
      token,
      username: normalizedUsername,
      expiresAt: decodedToken?.exp ? new Date(decodedToken.exp * 1000).toISOString() : null,
      isUsingFallbackCredentials:
        adminCredentials.username === ADMIN_FALLBACK_USERNAME &&
        adminCredentials.password === ADMIN_FALLBACK_PASSWORD,
    },
  });
};

const getAdminSession = async (req, res) => {
  return res.status(200).json({
    session: {
      username: req.adminSession.username,
      role: req.adminSession.role,
      expiresAt: req.adminSession.exp ? new Date(req.adminSession.exp * 1000).toISOString() : null,
    },
  });
};

module.exports = {
  getAdminSession,
  loginAdminSession,
};
