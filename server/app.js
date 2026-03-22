const express = require("express");
const authRoutes = require("./routes/authRoutes");
const flightRoutes = require("./routes/flightRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const cors = require("cors");

const app = express();
const configuredOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000,http://localhost:3001,http://localhost:5001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// app.use((req, res, next) => {
//   const requestOrigin = req.headers.origin;

//   if (requestOrigin && configuredOrigins.includes(requestOrigin)) {
//     res.header("Access-Control-Allow-Origin", requestOrigin);
//     res.header("Vary", "Origin");
//   }

//   res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

//   if (req.method === "OPTIONS") {
//     return res.sendStatus(204);
//   }

//   return next();
// });

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/flights", flightRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
