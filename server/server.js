require("dotenv").config();

const app = require("./app");
const { initializeDatabase } = require("./config/db");
const { startSeatHoldCleanupJob } = require("./services/seatHoldService");

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await initializeDatabase();
    startSeatHoldCleanupJob();

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend server:", error.message);
    process.exit(1);
  }
};

startServer();
