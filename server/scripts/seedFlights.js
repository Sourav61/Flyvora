require("dotenv").config();

const { initializeDatabase, pool } = require("../config/db");

const sampleFlights = [
  {
    source: "Delhi",
    destination: "Mumbai",
    departureTime: "2026-03-24T06:30:00",
    arrivalTime: "2026-03-24T08:45:00",
    price: 5400,
  },
  {
    source: "Bengaluru",
    destination: "Goa",
    departureTime: "2026-03-24T09:15:00",
    arrivalTime: "2026-03-24T10:30:00",
    price: 4200,
  },
  {
    source: "Hyderabad",
    destination: "Kolkata",
    departureTime: "2026-03-25T13:05:00",
    arrivalTime: "2026-03-25T15:25:00",
    price: 6100,
  },
  {
    source: "Chennai",
    destination: "Dubai",
    departureTime: "2026-03-25T21:10:00",
    arrivalTime: "2026-03-26T00:40:00",
    price: 18900,
  },
  {
    source: "Pune",
    destination: "Jaipur",
    departureTime: "2026-03-26T07:20:00",
    arrivalTime: "2026-03-26T09:05:00",
    price: 4900,
  },
  {
    source: "Ahmedabad",
    destination: "Singapore",
    departureTime: "2026-03-26T23:15:00",
    arrivalTime: "2026-03-27T05:50:00",
    price: 27600,
  }
];

const seedFlights = async () => {
  await initializeDatabase();

  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM flights");
  const total = rows[0]?.total || 0;

  if (total > 0) {
    console.log(`Skipping seed: flights table already has ${total} record(s).`);
    return;
  }

  for (const flight of sampleFlights) {
    await pool.query(
      `
        INSERT INTO flights (source, destination, departure_time, arrival_time, price)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [flight.source, flight.destination, flight.departureTime, flight.arrivalTime, flight.price]
    );
  }

  console.log(`Seeded ${sampleFlights.length} sample flights.`);
};

seedFlights()
  .catch((error) => {
    console.error("Flight seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
