const SERVICE_FEE_PER_TRAVELER = 149;
const EXIT_ROWS = new Set([14]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundCurrency = (value) => Number(toNumber(value).toFixed(2));

const getTravelerCount = (travelers = {}) => {
  const adults = Math.max(1, Number.parseInt(travelers.adults, 10) || 1);
  const children = Math.max(0, Number.parseInt(travelers.children, 10) || 0);
  return adults + children;
};

const getSeatRowNumber = (seatCode = "") => Number.parseInt(String(seatCode), 10) || 0;

const getSeatFee = (seatCode = "") => {
  if (!seatCode) {
    return 0;
  }

  const normalizedSeatCode = String(seatCode).toUpperCase();
  const rowNumber = getSeatRowNumber(normalizedSeatCode);

  if (normalizedSeatCode === "12A") {
    return 0;
  }

  if (EXIT_ROWS.has(rowNumber)) {
    return 1650;
  }

  if (rowNumber <= 11) {
    return 1450;
  }

  if (rowNumber <= 13) {
    return 850;
  }

  if (rowNumber <= 16) {
    return 450;
  }

  return 0;
};

const getSeatPosition = (seatCode = "") => {
  const seatLetter = String(seatCode).slice(-1).toUpperCase();

  if (["A", "F"].includes(seatLetter)) {
    return "Window";
  }

  if (["C", "D"].includes(seatLetter)) {
    return "Aisle";
  }

  return "Middle";
};

const getSeatType = (seatCode = "") => {
  const normalizedSeatCode = String(seatCode).toUpperCase();
  const rowNumber = getSeatRowNumber(normalizedSeatCode);
  const seatFee = getSeatFee(normalizedSeatCode);

  if (!normalizedSeatCode) {
    return "Standard";
  }

  if (normalizedSeatCode === "12A") {
    return "Complimentary upgrade";
  }

  if (EXIT_ROWS.has(rowNumber)) {
    return "Exit row";
  }

  if (rowNumber <= 11) {
    return "Front cabin";
  }

  if (seatFee > 0) {
    return "Preferred";
  }

  return "Standard";
};

const calculateCheckoutPricing = ({ flightPrice, travelers, seatCode }) => {
  const travelerCount = getTravelerCount(travelers);
  const normalizedFlightPrice = toNumber(flightPrice);
  const baseFareTotal = roundCurrency(normalizedFlightPrice * travelerCount);
  const taxesAndFees = roundCurrency(Math.max(Math.round(normalizedFlightPrice * 0.14), 399) * travelerCount);
  const serviceFee = roundCurrency(SERVICE_FEE_PER_TRAVELER * travelerCount);
  const seatFee = roundCurrency(getSeatFee(seatCode));
  const totalAmount = roundCurrency(baseFareTotal + taxesAndFees + serviceFee + seatFee);

  return {
    travelerCount,
    baseFareTotal,
    taxesAndFees,
    serviceFee,
    seatFee,
    totalAmount,
    currency: "INR",
  };
};

module.exports = {
  SERVICE_FEE_PER_TRAVELER,
  calculateCheckoutPricing,
  getSeatFee,
  getSeatPosition,
  getSeatRowNumber,
  getSeatType,
  getTravelerCount,
};
