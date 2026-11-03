'use strict';

/**
 * utils/cache.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Redis-backed cache with in-memory fallback.
 *
 * Interface:
 *   set(key, value, ttlMs)   — store a JSON-serializable value with expiry
 *   get(key)                 — retrieve value (null if expired/missing)
 *   del(key)                 — explicit deletion
 *   consume(key)             — atomic read-then-delete (for single-use tokens)
 */

const { getRedisClient } = require('./redis');
const logger = require('./logger');

// ─── In-memory fallback (used when Redis is unavailable) ──────────────────────
const memoryStore = new Map();

const memOps = {
  set: (key, value, ttlMs) => {
    memoryStore.set(key, { value, expiresAt: Date.now() + ttlMs });
  },
  get: (key) => {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { memoryStore.delete(key); return null; }
    return entry.value;
  },
  del: (key) => { memoryStore.delete(key); },
  consume: (key) => {
    const val = memOps.get(key);
    if (val !== null) memoryStore.delete(key);
    return val;
  },
};

// ─── Redis-backed operations ──────────────────────────────────────────────────

const redisOps = {
  set: async (key, value, ttlMs) => {
    const redis = getRedisClient();
    if (!redis) return memOps.set(key, value, ttlMs);
    try {
      await redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch (err) {
      logger.error(`[Cache] Redis SET failed for ${key}: ${err.message} — using memory fallback`);
      memOps.set(key, value, ttlMs);
    }
  },

  get: async (key) => {
    const redis = getRedisClient();
    if (!redis) return memOps.get(key);
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.error(`[Cache] Redis GET failed for ${key}: ${err.message} — using memory fallback`);
      return memOps.get(key);
    }
  },

  del: async (key) => {
    const redis = getRedisClient();
    if (!redis) return memOps.del(key);
    try {
      await redis.del(key);
    } catch (err) {
      logger.error(`[Cache] Redis DEL failed for ${key}: ${err.message}`);
      memOps.del(key);
    }
  },

  /**
   * Atomic consume: GET + DEL in a single pipeline call.
   * Used for single-use recheckId tokens — ensures a token cannot be used twice
   * even with concurrent requests.  
   */
  consume: async (key) => {
    const redis = getRedisClient();
    if (!redis) return memOps.consume(key);
    try {
      const results = await redis.multi().get(key).del(key).exec();
      // results = [[null, rawValue], [null, delCount]]
      if (!results || !results[0] || !results[0][1]) return null;
      return JSON.parse(results[0][1]);
    } catch (err) {
      logger.error(`[Cache] Redis CONSUME failed for ${key}: ${err.message} — using memory fallback`);
      return memOps.consume(key);
    }
  },
};

module.exports = redisOps;
