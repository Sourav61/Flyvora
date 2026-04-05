const express = require("express");
const { getAdminSession, loginAdminSession } = require("../controllers/adminController");
const { authenticateAdminSession } = require("../middleware/adminSessionMiddleware");

const router = express.Router();

router.post("/session/login", loginAdminSession);
router.get("/session/me", authenticateAdminSession, getAdminSession);

module.exports = router;
