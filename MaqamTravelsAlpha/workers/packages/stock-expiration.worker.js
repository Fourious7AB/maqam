'use strict';

const { expireUnpaidStockBookings } = require('../../modules/packages/stock/stockExpiration.service');
const logger = require('../../utils/logger');

let intervalId = null;

/**
 * Starts the stock expiration background worker.
 * Runs routinely (default: every 5 minutes) to clean up expired unpaid package/offer bookings.
 */
const startStockExpirationWorker = (intervalMs = 5 * 60 * 1000, timeoutMs = 30 * 60 * 1000) => {
  logger.info(`🤖 Stock Expiration Worker started (interval: ${intervalMs / 1000}s, timeout: ${timeoutMs / 60000}m)`);

  expireUnpaidStockBookings({ timeoutMs }).catch((err) => {
    logger.error(`[Stock Expiration Worker] Error during run: ${err.message}`);
  });

  intervalId = setInterval(() => {
    expireUnpaidStockBookings({ timeoutMs }).catch((err) => {
      logger.error(`[Stock Expiration Worker] Error during run: ${err.message}`);
    });
  }, intervalMs);

  return intervalId;
};  

const stopStockExpirationWorker = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('🛑 Stock Expiration Worker stopped');
  }
};

module.exports = {
  startStockExpirationWorker,
  stopStockExpirationWorker,
  expireUnpaidStockBookings,
};
