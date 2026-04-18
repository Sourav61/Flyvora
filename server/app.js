const express = require("express");
const authRoutes = require("./routes/authRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const flightRoutes = require("./routes/flightRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const contactRoutes = require("./routes/contactRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const cors = require("cors");

const app = express();
const configuredOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5001,http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || configuredOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/contact", contactRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
