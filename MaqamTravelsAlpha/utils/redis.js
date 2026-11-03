'use strict';

/**
 * utils/redis.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton ioredis client + a separate BullMQ-safe connection factory.
 *
 * BullMQ requires  maxRetriesPerRequest: null  — use getBullMQConnection()
 * for all BullMQ Queue / Worker / QueueEvents constructors.
 * Use getRedisClient() for cache operations.
 */

const Redis = require('ioredis');
const logger = require('./logger');

let _cacheClient = null;

// ─── Cache client (used by utils/cache.js) ────────────────────────────────────

const getRedisClient = () => {
  if (_cacheClient) return _cacheClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('[Redis] REDIS_URL not set — in-memory cache will be used.');
    return null;
  }

  _cacheClient = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => {
      if (times > 6) { logger.error('[Redis] Max reconnect attempts reached — giving up.'); return null; }
      const delay = Math.min(times * 300, 3000);
      logger.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})…`);
      return delay;
    },
    reconnectOnError: (err) => {
      logger.error(`[Redis] Error triggered reconnect: ${err.message}`);
      return true;
    },
  });

  _cacheClient.on('connect', () => logger.info('[Redis] Cache client connected.'));
  _cacheClient.on('ready', () => logger.info('[Redis] Cache client ready.'));
  _cacheClient.on('error', (err) => logger.error(`[Redis] Cache client error: ${err.message}`));
  _cacheClient.on('close', () => logger.warn('[Redis] Cache client connection closed.'));
  _cacheClient.on('reconnecting', () => logger.warn('[Redis] Cache client reconnecting…'));

  return _cacheClient;
};

// ─── BullMQ connection factory ────────────────────────────────────────────────
// BullMQ MUST have maxRetriesPerRequest: null.
// A new connection is created per Worker to avoid connection-sharing issues.

const getBullMQConnection = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('[Redis] REDIS_URL is required for BullMQ. Set it in .env.');
  }

  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 300, 3000);
    },
  });
};

// ─── Health check ─────────────────────────────────────────────────────────────

const healthCheck = async () => {
  const redis = getRedisClient();
  if (!redis) return { connected: false, reason: 'REDIS_URL not configured' };
  try {
    const pong = await redis.ping();
    return { connected: pong === 'PONG', host: process.env.REDIS_URL };
  } catch (err) {
    return { connected: false, reason: err.message };
  }
};

module.exports = { getRedisClient, getBullMQConnection, healthCheck };
