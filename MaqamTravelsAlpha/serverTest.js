const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./utils/logger");

const PORT =  5001;

connectDB();

// Initialize all modular background workers (Hotels, Flights, Packages)
const { startAllWorkers } = require('./workers');
startAllWorkers();



const server = app.listen(PORT, () => {
  logger.info(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port. ${PORT}`,
  );
});
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

