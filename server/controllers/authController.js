const userModel = require("../models/userModel");
const { comparePassword, hashPassword } = require("../utils/password");
const { signToken } = require("../utils/token");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const register = async (req, res, next) => {
  try {
    console.log(req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }

    const existingUser = await userModel.findByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await hashPassword(password);
    const user = await userModel.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = signToken({ userId: user.id, email: user.email });

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const userRecord = await userModel.findByEmailWithPassword(normalizedEmail);

    if (!userRecord) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await comparePassword(password, userRecord.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken({ userId: userRecord.id, email: userRecord.email });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: userModel.toSafeUser(userRecord),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
};
