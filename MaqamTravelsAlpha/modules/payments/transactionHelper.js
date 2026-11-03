const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Executes a function inside a MongoDB transaction session.
 * Falls back to non-transactional execution if the environment is a standalone
 * MongoDB instance (e.g., local developer setup without replica sets).
 * 
 * @param {function} fn - Async callback to run, receives the `session` object.
 * @returns {Promise<any>}
 */
const withTransaction = async (fn) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.error(`Error aborting transaction: ${abortErr.message}`);
      }
    }
    
    // Check if MongoDB is running in standalone mode (no replica set configured)
    const isStandaloneError = 
      error.message && 
      (error.message.includes('replica set') || 
       error.code === 20 || 
       error.message.includes('Transaction numbers are only allowed on a replica set member'));

    if (isStandaloneError) {
      logger.warn('MongoDB Transactions require a replica set. Falling back to non-transactional execution.');
      session.endSession();
      return await fn(null);
    }
    
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  withTransaction,
};
