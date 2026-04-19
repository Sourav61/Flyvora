const express = require("express");
const { login, getProfile } = require("../controllers/adminAuthController");
const { authenticateAdminToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.get("/me", authenticateAdminToken, getProfile);

module.exports = router;
