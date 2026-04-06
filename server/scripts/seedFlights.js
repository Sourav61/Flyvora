require("dotenv").config();

const { initializeDatabase, pool } = require("../config/db");

const DATE_OPTIONS = [
  "2026-03-26",
  "2026-03-28",
  "2026-04-02",
  "2026-04-10",
  "2026-04-18",
];

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

const combineDateAndTime = (date, time) => `${date}T${time}:00`;

const addMinutes = (timestamp, minutes) => {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
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

const buildFlights = () =>
  ROUTES.flatMap((route, routeIndex) =>
    DATE_OPTIONS.flatMap((date, dateIndex) =>
      route.timeSlots.map((time, slotIndex) => {
        const departureTime = combineDateAndTime(date, time);
        const price =
          route.basePrice +
          dateIndex * 280 +
          slotIndex * 175 +
          routeIndex * 60 +
          ((dateIndex + slotIndex + routeIndex) % 2 === 0 ? 0 : 140);

        if (date === "2026-03-26" && route.longSpanSlotIndex === slotIndex) {
          const arrivalTime = `2026-04-26T${time}:00`;
          return {
            source: route.source,
            destination: route.destination,
            departureTime,
            arrivalTime,
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

const seedFlights = async () => {
  const shouldReplaceExisting = process.argv.includes("--replace");
  const flights = buildFlights();

  await initializeDatabase();

  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM flights");
  const total = rows[0]?.total || 0;

  if (total > 0 && !shouldReplaceExisting) {
    console.log(`Skipping seed: flights table already has ${total} record(s). Run with --replace to reseed.`);
    return;
  }

  if (shouldReplaceExisting) {
    await pool.query("TRUNCATE TABLE payments, bookings, seats, flights RESTART IDENTITY CASCADE");
  }

  for (const flight of flights) {
    await pool.query(
      `
        INSERT INTO flights (source, destination, departure_time, arrival_time, price)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [flight.source, flight.destination, flight.departureTime, flight.arrivalTime, flight.price]
    );
  }

  console.log(`Seeded ${flights.length} flights across ${ROUTES.length} route directions.`);
  console.log("Routes included: Delhi-Mumbai, Mumbai-Delhi, Bengaluru-Goa, Goa-Bengaluru, Chennai-Dubai, Dubai-Chennai.");
  console.log("Long-span test flights are included on March 26, 2026 and arrive on April 26, 2026.");
};

seedFlights()
  .catch((error) => {
    console.error("Flight seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
