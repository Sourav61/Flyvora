const crypto = require("crypto");

const SCRYPT_KEY_LENGTH = 64;

const scryptAsync = (value, salt) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(value, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
};

const comparePassword = async (password, storedHash) => {
  const [salt, hashedPassword] = storedHash.split(":");

  if (!salt || !hashedPassword) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt);
  const storedBuffer = Buffer.from(hashedPassword, "hex");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedKey);
};

module.exports = {
  hashPassword,
  comparePassword,
};
