const express = require("express");
const { searchFlights } = require("../controllers/flightController");

const router = express.Router();

router.get("/search", searchFlights);

module.exports = router;
