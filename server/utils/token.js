const jwt = require("jsonwebtoken");

const signToken = (payload) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  return jwt.sign(payload, secret, { expiresIn: "1h" });
};

module.exports = {
  signToken,
};
