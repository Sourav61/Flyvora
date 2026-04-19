require("dotenv").config();

const app = require("./app");
const { getDatabaseConfigSummary, initializeDatabase } = require("./config/db");
const { startSeatHoldCleanupJob } = require("./services/seatHoldService");

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    const databaseConfigSummary = getDatabaseConfigSummary();

    console.log(
      `Starting backend bootstrap. Target port=${PORT}. Database source=${databaseConfigSummary.source}, host=${databaseConfigSummary.host}, port=${databaseConfigSummary.port}, database=${databaseConfigSummary.database}, ssl=${databaseConfigSummary.ssl}.`
    );
    await initializeDatabase();
    console.log("Database initialization completed.");
    startSeatHoldCleanupJob();
    console.log("Seat hold cleanup job started.");

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend server:", error.message);
    process.exit(1);
  }
};

startServer();
