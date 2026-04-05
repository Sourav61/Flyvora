const express = require("express");
const {
  createDodoPaymentSession,
  releaseCheckoutHold,
  verifyDodoPayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/dodo/session", createDodoPaymentSession);
router.post("/dodo/verify", verifyDodoPayment);
router.post("/dodo/release", releaseCheckoutHold);

module.exports = router;
