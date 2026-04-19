require("dotenv").config();

const { initializeDatabase, pool } = require("../config/db");

const DEFAULT_START_DATE = "2026-05-01";
const DEFAULT_DATE_COUNT = 8;
const DEFAULT_INTERVAL_DAYS = 7;
const LONG_SPAN_TEST_BASE_DATE = "2026-05-01";

const ROUTES = [
  {
    source: "Delhi",
    destination: "Mumbai",
    basePrice: 5200,
    durationMinutes: 135,
    timeSlots: ["06:10", "11:35", "19:20"],
    longSpanSlotIndex: 2,
  },
  {
    source: "Mumbai",
    destination: "Delhi",
    basePrice: 5450,
    durationMinutes: 140,
    timeSlots: ["07:20", "14:05", "21:00"],
  },
  {
    source: "Bengaluru",
    destination: "Goa",
    basePrice: 4200,
    durationMinutes: 80,
    timeSlots: ["08:05", "13:10", "18:45"],
    longSpanSlotIndex: 1,
  },
  {
    source: "Goa",
    destination: "Bengaluru",
    basePrice: 4350,
    durationMinutes: 85,
    timeSlots: ["09:00", "15:15", "20:35"],
  },
  {
    source: "Chennai",
    destination: "Dubai",
    basePrice: 18200,
    durationMinutes: 255,
    timeSlots: ["04:55", "10:40", "21:15"],
    longSpanSlotIndex: 0,
  },
  {
    source: "Dubai",
    destination: "Chennai",
    basePrice: 18650,
    durationMinutes: 265,
    timeSlots: ["02:25", "12:15", "20:50"],
  },
];

const normalizeDateString = (value = "") => String(value).trim();

const parseBooleanFlag = (value = "") => ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());

const parseCliOptions = (argv) =>
  argv.reduce((options, argument) => {
    if (!argument.startsWith("--")) {
      return options;
    }

    const [rawKey, rawValue] = argument.slice(2).split("=");
    options[rawKey] = rawValue === undefined ? "true" : rawValue;
    return options;
  }, {});

const cliOptions = parseCliOptions(process.argv.slice(2));

const combineDateAndTime = (date, time) => `${date}T${time}:00`;

const addMinutes = (timestamp, minutes) => {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateOnlyString(date);
};

const toTimestamp = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const toDateOnlyString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const getDateOptions = () => {
  const explicitDates = normalizeDateString(cliOptions.dates || process.env.SEED_FLIGHT_DATES || "");

  if (explicitDates) {
    const dateOptions = explicitDates
      .split(",")
      .map((date) => normalizeDateString(date))
      .filter(Boolean);

    const invalidDate = dateOptions.find((date) => !isValidDateString(date));

    if (invalidDate) {
      throw new Error(`Invalid seed date "${invalidDate}". Expected YYYY-MM-DD.`);
    }

    return dateOptions;
  }

  const startDate = normalizeDateString(
    cliOptions["start-date"] || process.env.SEED_FLIGHT_START_DATE || DEFAULT_START_DATE
  );

  if (!isValidDateString(startDate)) {
    throw new Error(`Invalid --start-date value "${startDate}". Expected YYYY-MM-DD.`);
  }

  const dateCount = parsePositiveInteger(cliOptions.count || process.env.SEED_FLIGHT_COUNT, DEFAULT_DATE_COUNT);
  const intervalDays = parsePositiveInteger(
    cliOptions["interval-days"] || process.env.SEED_FLIGHT_INTERVAL_DAYS,
    DEFAULT_INTERVAL_DAYS
  );

  return Array.from({ length: dateCount }, (_, index) => addDays(startDate, index * intervalDays));
};

const buildFlights = (dateOptions, includeLongSpanTests) =>
  ROUTES.flatMap((route, routeIndex) =>
    dateOptions.flatMap((date, dateIndex) =>
      route.timeSlots.map((time, slotIndex) => {
        const departureTime = combineDateAndTime(date, time);
        const price =
          route.basePrice +
          dateIndex * 280 +
          slotIndex * 175 +
          routeIndex * 60 +
          ((dateIndex + slotIndex + routeIndex) % 2 === 0 ? 0 : 140);

        if (includeLongSpanTests && date === LONG_SPAN_TEST_BASE_DATE && route.longSpanSlotIndex === slotIndex) {
          const arrivalTime = addDays(date, 31);
          return {
            source: route.source,
            destination: route.destination,
            departureTime,
            arrivalTime: `${arrivalTime}T${time}:00`,
            price,
          };
        }

        return {
          source: route.source,
          destination: route.destination,
          departureTime,
          arrivalTime: toTimestamp(addMinutes(departureTime, route.durationMinutes + dateIndex * 5)),
          price,
        };
      })
    )
  );

const loadExistingFlightKeys = async () => {
  const { rows } = await pool.query(`
    SELECT source, destination, departure_time
    FROM flights
  `);

  return new Set(
    rows.map((flight) => `${flight.source}::${flight.destination}::${toTimestamp(new Date(flight.departure_time))}`)
  );
};

const seedFlights = async () => {
  const shouldReplaceExisting = process.argv.includes("--replace");
  const includeLongSpanTests = parseBooleanFlag(
    cliOptions["include-long-span-tests"] || process.env.SEED_FLIGHT_INCLUDE_LONG_SPAN || "true"
  );
  const dateOptions = getDateOptions();
  const flights = buildFlights(dateOptions, includeLongSpanTests);

  await initializeDatabase();

  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM flights");
  const total = rows[0]?.total || 0;

  if (shouldReplaceExisting) {
    await pool.query("TRUNCATE TABLE payments, bookings, seats, flights RESTART IDENTITY CASCADE");
  }

  const existingFlightKeys = shouldReplaceExisting ? new Set() : await loadExistingFlightKeys();
  let insertedCount = 0;
  let skippedCount = 0;

  for (const flight of flights) {
    const flightKey = `${flight.source}::${flight.destination}::${flight.departureTime}`;

    if (existingFlightKeys.has(flightKey)) {
      skippedCount += 1;
      continue;
    }

    await pool.query(
      `
        INSERT INTO flights (source, destination, departure_time, arrival_time, price)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [flight.source, flight.destination, flight.departureTime, flight.arrivalTime, flight.price]
    );

    existingFlightKeys.add(flightKey);
    insertedCount += 1;
  }

  console.log(
    `Flight seed complete. Inserted ${insertedCount} new flights and skipped ${skippedCount} existing flight(s).`
  );
  console.log(`Date window: ${dateOptions[0]} to ${dateOptions[dateOptions.length - 1]} (${dateOptions.length} date(s)).`);
  console.log(`Routes included: ${ROUTES.map((route) => `${route.source}-${route.destination}`).join(", ")}.`);

  if (includeLongSpanTests && dateOptions.includes(LONG_SPAN_TEST_BASE_DATE)) {
    console.log(
      `Long-span test flights are included on ${LONG_SPAN_TEST_BASE_DATE} and arrive on ${addDays(
        LONG_SPAN_TEST_BASE_DATE,
        31
      )}.`
    );
  }

  if (total > 0 && !shouldReplaceExisting && insertedCount === 0) {
    console.log("Nothing new was added. Use a later --start-date/--dates value, or pass --replace to rebuild the catalog.");
  }
};

seedFlights()
  .catch((error) => {
    console.error("Flight seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
