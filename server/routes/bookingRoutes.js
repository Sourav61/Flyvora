const express = require("express");
const { getTravelerBookings, reserveBookingSeat } = require("../controllers/bookingController");
const { releaseCheckoutHold, verifyDodoPayment } = require("../controllers/paymentController");

const router = express.Router();

router.get("/", getTravelerBookings);
router.post("/reserve", reserveBookingSeat);
router.post("/confirm", verifyDodoPayment);
router.post("/cancel", releaseCheckoutHold);

module.exports = router;
