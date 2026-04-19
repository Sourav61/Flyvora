const adminUserModel = require("../models/adminUserModel");
const { comparePassword } = require("../utils/password");
const { signToken } = require("../utils/token");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const buildAdminProfile = (admin) => ({
  id: admin.id,
  email: admin.email,
  role: "admin",
});

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const adminRecord = await adminUserModel.findByEmailWithPassword(normalizedEmail);

    if (!adminRecord) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await comparePassword(password, adminRecord.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const admin = buildAdminProfile(adminUserModel.toSafeAdminUser(adminRecord));
    const token = signToken({
      adminUserId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return res.status(200).json({
      message: "Admin login successful",
      token,
      admin,
    });
  } catch (error) {
    return next(error);
  }
};

const getProfile = async (req, res) => {
  const normalizedEmail = normalizeEmail(req.user?.email);

  if (!normalizedEmail) {
    return res.status(401).json({ message: "Admin session is invalid" });
  }

  const adminRecord = await adminUserModel.findByEmail(normalizedEmail);

  if (!adminRecord) {
    return res.status(401).json({ message: "Admin account no longer exists" });
  }

  return res.status(200).json({
    message: "Admin session is valid",
    admin: buildAdminProfile(adminRecord),
  });
};

module.exports = {
  login,
  getProfile,
};
