const express = require("express");
const { submitContactInquiry } = require("../controllers/contactController");

const router = express.Router();

router.post("/", submitContactInquiry);

module.exports = router;
