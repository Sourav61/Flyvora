const flightModel = require("../models/flightModel");

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTime = (value) => /^\d{2}:\d{2}$/.test(value);

const searchFlights = async (req, res, next) => {
  try {
    const source = req.query.source?.trim() || "";
    const destination = req.query.destination?.trim() || "";
    const date = req.query.date?.trim() || "";
    const departureTime = req.query.departureTime?.trim() || "";
    const sortBy = req.query.sortBy?.trim() || "departure_asc";
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 6, 1), 20);
    const parsedMaxPrice = req.query.maxPrice ? Number.parseInt(req.query.maxPrice, 10) : null;
    const maxPrice = Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : null;

    if (date && !isValidDate(date)) {
      return res.status(400).json({ message: "Date must be in YYYY-MM-DD format" });
    }

    if (departureTime && !isValidTime(departureTime)) {
      return res.status(400).json({ message: "Departure time must be in HH:MM format" });
    }

    if (req.query.maxPrice && maxPrice === null) {
      return res.status(400).json({ message: "Max price must be a valid number" });
    }

    const { flights, total } = await flightModel.searchFlights({
      source,
      destination,
      date,
      departureTime,
      maxPrice,
      sortBy,
      page,
      limit,
    });

    return res.status(200).json({
      flights,
      filters: {
        source,
        destination,
        date,
        departureTime,
        maxPrice,
        sortBy,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  searchFlights,
};
