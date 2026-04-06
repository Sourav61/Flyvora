const express = require("express");
const { getFlightSeatMap, searchFlights } = require("../controllers/flightController");

const router = express.Router();

router.get("/search", searchFlights);
router.get("/:flightId/seats", getFlightSeatMap);

module.exports = router;
