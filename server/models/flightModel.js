const { pool } = require("../config/db");

const buildSearchQuery = ({ source, destination, date, departureTime, maxPrice, sortBy, page, limit }) => {
  const filters = [];
  const values = [];
  let parameterIndex = 1;

  if (source) {
    filters.push(`source ILIKE $${parameterIndex}`);
    values.push(`%${source}%`);
    parameterIndex += 1;
  }

  if (destination) {
    filters.push(`destination ILIKE $${parameterIndex}`);
    values.push(`%${destination}%`);
    parameterIndex += 1;
  }

  if (date) {
    filters.push(`DATE(departure_time) = $${parameterIndex}`);
    values.push(date);
    parameterIndex += 1;
  }

  if (departureTime) {
    filters.push(`departure_time::time >= $${parameterIndex}`);
    values.push(departureTime);
    parameterIndex += 1;
  }

  if (typeof maxPrice === "number") {
    filters.push(`price <= $${parameterIndex}`);
    values.push(maxPrice);
    parameterIndex += 1;
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const sortOptions = {
    departure_asc: "departure_time ASC",
    departure_desc: "departure_time DESC",
    price_asc: "price ASC, departure_time ASC",
    price_desc: "price DESC, departure_time ASC",
  };

  const orderBy = sortOptions[sortBy] || sortOptions.departure_asc;

  return {
    countQuery: `SELECT COUNT(*)::int AS total FROM flights ${whereClause}`,
    dataQuery: `
      SELECT id, source, destination, departure_time, arrival_time, price
      FROM flights
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${parameterIndex} OFFSET $${parameterIndex + 1}
    `,
    values,
    paginationValues: [...values, limit, offset],
  };
};

const searchFlights = async (filters) => {
  const { countQuery, dataQuery, values, paginationValues } = buildSearchQuery(filters);

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, values),
    pool.query(dataQuery, paginationValues),
  ]);

  return {
    flights: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

module.exports = {
  searchFlights,
};
