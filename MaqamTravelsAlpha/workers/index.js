'use strict';

/**
 * workers/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Background Worker Registry & Bootloader.
 * Initializes all domain workers (Hotels, Flights, Packages) on server startup.
 */

const logger = require('../utils/logger');
const { initWorker: initHotelBookWorker } = require('./hotels/hotel-book.worker');
const { initWorker: initHotelPollWorker } = require('./hotels/hotel-poll-status.worker');
const { reconcilePendingHotelBookings } = require('./hotels/hotel-booking-status.worker');
const { initWorker: initFlightGDSWorker, processGDSTicketing, getFlightGDSQueue } = require('./flights/flight-ticket-gds.worker');
const { initWorker: initNotificationWorker, processNotificationJob, getNotificationQueue } = require('./notifications/notification.worker');
const { startStockExpirationWorker, stopStockExpirationWorker } = require('./packages/stock-expiration.worker');

let activeWorkers = {
  hotelBookWorker: null,
  hotelPollWorker: null,
  flightGDSWorker: null,
  notificationWorker: null,
  stockExpirationInterval: null,
};

/**
 * Initializes all background workers and scheduled timers.
 */
const startAllWorkers = () => {
  logger.info('🚀 Initializing application background workers...');

  // 1. Start stock expiration timer (Packages & Offers)
  try {
    activeWorkers.stockExpirationInterval = startStockExpirationWorker();
  } catch (err) {
    logger.error(`[Worker Manager] Failed to start stock expiration worker: ${err.message}`);
  }

  // 2. Initialize BullMQ Queue Workers if Redis is configured
  if (process.env.REDIS_URL) {
    try {
      activeWorkers.hotelBookWorker = initHotelBookWorker();
      activeWorkers.hotelPollWorker = initHotelPollWorker();
      activeWorkers.flightGDSWorker = initFlightGDSWorker();
      activeWorkers.notificationWorker = initNotificationWorker();
      logger.info('🤖 All BullMQ Workers (Hotels, Flights & Notifications) initialized successfully.');
    } catch (err) {
      logger.error(`[Worker Manager] Failed to initialize BullMQ Workers: ${err.message}`);
    }
  } else {
    logger.warn('[Worker Manager] REDIS_URL not set — BullMQ queue workers are disabled; fallback mode active.');
  }

  return activeWorkers;
};

/**
 * Cleanly stops all active background workers.
 */
const stopAllWorkers = async () => {
  logger.info('🛑 Stopping all background workers...');

  if (activeWorkers.stockExpirationInterval) {
    stopStockExpirationWorker();
  }

  const closePromises = [];
  if (activeWorkers.hotelBookWorker) closePromises.push(activeWorkers.hotelBookWorker.close());
  if (activeWorkers.hotelPollWorker) closePromises.push(activeWorkers.hotelPollWorker.close());
  if (activeWorkers.flightGDSWorker) closePromises.push(activeWorkers.flightGDSWorker.close());
  if (activeWorkers.notificationWorker) closePromises.push(activeWorkers.notificationWorker.close());

  await Promise.allSettled(closePromises);
  logger.info('All background workers stopped.');
};

module.exports = {
  startAllWorkers,
  stopAllWorkers,
  // Direct domain worker exports for modular usage
  hotels: {
    initHotelBookWorker,
    initHotelPollWorker,
    reconcilePendingHotelBookings,
  },
  flights: {
    initFlightGDSWorker,
    processGDSTicketing,
    getFlightGDSQueue,
  },
  packages: {
    startStockExpirationWorker,
    stopStockExpirationWorker,
  },
  notifications: {
    initNotificationWorker,
    processNotificationJob,
    getNotificationQueue,
  },
};
