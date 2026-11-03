const logger = require('./logger');

/**
 * ─── FARE CACHE ───────────────────────────────────────
 * In-memory cache for storing flight search results
 * Between Search API → FareQuote → Book API
 * 
 * In production, use Redis for distributed caching
 * For now, simple in-memory with TTL
 */

class FareCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    /**
     * Store fare quote after search
     * @param {string} key - traceId_resultIndex (unique identifier)
     * @param {object} fareData - Fare object from FareQuote API
     * @param {object} flightInfo - Flight details (airline, departure, etc.)
     */
    set(key, fareData, flightInfo = {}) {
        try {
            const entry = {
                fareData,
                flightInfo,
                storedAt: Date.now(),
                expiresAt: Date.now() + this.ttl,
            };

            this.cache.set(key, entry);
            logger.info(`Fare cached for key: ${key}, expires in 24h`);

            // Schedule cleanup
            this._scheduleCleanup(key);
        } catch (error) {
            logger.error(`Fare cache set failed: ${error.message}`);
        }
    }

    /**
     * Get cached fare quote
     * @param {string} key - traceId_resultIndex
     * @returns {object|null}
     */
    get(key) {
        try {
            const entry = this.cache.get(key);

            if (!entry) {
                logger.warn(`Fare not in cache: ${key}`);
                return null;
            }

            // Check if expired
            if (Date.now() > entry.expiresAt) {
                logger.warn(`Fare cache expired: ${key}`);
                this.cache.delete(key);
                return null;
            }

            logger.info(`Fare retrieved from cache: ${key}`);
            return entry.fareData;
        } catch (error) {
            logger.error(`Fare cache get failed: ${error.message}`);
            return null;
        }
    }
    /**
     * Get full entry (fare + flight info)
     * @param {string} key
     * @returns {object|null}
     */
    getEntry(key) {
        try {
            const entry = this.cache.get(key);

            if (!entry) {
                return null;
            }

            if (Date.now() > entry.expiresAt) {
                this.cache.delete(key);
                return null;
            }

            return entry;
        } catch (error) {
            logger.error(`Fare cache getEntry failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Delete cached fare
     * @param {string} key
     */
    delete(key) {
        try {
            this.cache.delete(key);
            logger.info(`Fare cache deleted: ${key}`);
        } catch (error) {
            logger.error(`Fare cache delete failed: ${error.message}`);
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        try {
            this.cache.clear();
            logger.info('Fare cache cleared');
        } catch (error) {
            logger.error(`Fare cache clear failed: ${error.message}`);
        }
    }

    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }

    /**
     * Schedule automatic cleanup on expiry
     * @private
     */
    _scheduleCleanup(key) {
        setTimeout(() => {
            this.cache.delete(key);
            logger.info(`Fare cache auto-cleaned: ${key}`);
        }, this.ttl);
    }
}

// Export singleton instance
module.exports = new FareCache();
