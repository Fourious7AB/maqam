const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// Define Lock Schema
const lockSchema = new mongoose.Schema({
  resource: {
    type: String,
    required: true,
    unique: true,
  },
  owner: {
    type: String,
    required: true,
  },
  acquiredAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// TTL index for automatic deletion of expired lock documents
lockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Lock = mongoose.models.PaymentLock || mongoose.model('PaymentLock', lockSchema);

/**
 * Attempts to acquire a distributed lock on a resource.
 * 
 * @param {string} resource - Unique resource identifier (e.g. 'capture:order_123')
 * @param {string} owner - Identifier representing the process/request holding the lock
 * @param {number} ttlMs - Lock duration in milliseconds
 * @returns {Promise<boolean>} True if lock was successfully acquired, false otherwise
 */
const acquireLock = async (resource, owner, ttlMs = 15000) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  
  try {
    // Attempt atomic lock check and update
    const lock = await Lock.findOneAndUpdate(
      {
        resource,
        $or: [
          { expiresAt: { $lt: now } }, // Lock has expired
          { owner } // Re-entrant lock check
        ]
      },
      {
        $set: {
          owner,
          acquiredAt: now,
          expiresAt
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    return !!lock;
  } catch (error) {
    // Duplicate key error (code 11000) occurs if another node holds the lock
    if (error.code === 11000) {
      return false;
    }
    logger.error(`[Lock Manager] Failed to acquire lock for ${resource}: ${error.message}`);
    return false;
  }
};

/**
 * Releases a distributed lock on a resource.
 * 
 * @param {string} resource - Unique resource identifier
 * @param {string} owner - Lock owner identifier
 * @returns {Promise<boolean>}
 */
const releaseLock = async (resource, owner) => {
  try {
    const result = await Lock.deleteOne({ resource, owner });
    return result.deletedCount > 0;
  } catch (error) {
    logger.error(`[Lock Manager] Failed to release lock for ${resource}: ${error.message}`);
    return false;
  }
};

/**
 * Wraps an async callback with automatic lock acquisition and cleanup.
 * 
 * @param {string} resource - Unique resource identifier
 * @param {number} ttlMs - Lock TTL
 * @param {function} fn - Async operation to execute
 * @returns {Promise<any>}
 */
const withLock = async (resource, ttlMs, fn, options = {}) => {
  const owner = `proc_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  
  // Dynamic retry strategy: allow callers or calculate retries so short operations wait safely
  const retryInterval = options.retryInterval || 350;
  const maxRetries = options.maxRetries || Math.min(Math.max(Math.ceil(ttlMs / retryInterval), 5), 25);
  
  let acquired = false;
  for (let i = 0; i < maxRetries; i++) {
    acquired = await acquireLock(resource, owner, ttlMs);
    if (acquired) break;
    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }
  
  if (!acquired) {
    throw new Error(`Lock acquisition timeout for resource: ${resource}`);
  }
  
  try {
    return await fn();
  } finally {
    await releaseLock(resource, owner);
  }
};

module.exports = {
  acquireLock,
  releaseLock,
  withLock,
};
