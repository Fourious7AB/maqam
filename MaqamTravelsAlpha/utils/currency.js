'use strict';

const axios = require('axios');
const cache = require('./cache');
const logger = require('./logger');

/**
 * Fetch the latest exchange rate from fromCurrency to toCurrency.
 * Caches results in Redis for 4 hours to respect rate limits and ensure performance.
 * Falls back gracefully if the API fails.
 * 
 * @param {string} fromCurrency - e.g. 'INR'
 * @param {string} toCurrency - e.g. 'USD'
 * @returns {Promise<number>} - Resolved conversion rate
 */
const getExchangeRate = async (fromCurrency, toCurrency) => {
  const cacheKey = `currency:rate:${fromCurrency}:${toCurrency}`;
  
  try {
    // 1. Try to fetch from Redis cache
    const cachedRate = await cache.get(cacheKey);
    if (cachedRate !== null && typeof cachedRate === 'number') {
      logger.info(`[Currency] Cache HIT for rate ${fromCurrency} -> ${toCurrency}: ${cachedRate}`);
      return cachedRate;
    }
  } catch (cacheErr) {
    logger.warn(`[Currency] Cache lookup failed: ${cacheErr.message}`);
  }

  try {
    // 2. Fetch from external exchange rate API (free and keyless endpoint)
    const url = `https://open.er-api.com/v6/latest/${fromCurrency.toUpperCase()}`;
    logger.info(`[Currency] Cache MISS. Fetching live rate from: ${url}`);
    
    const response = await axios.get(url, { timeout: 3000 });
    
    if (response.data && response.data.result === 'success' && response.data.rates) {
      const rate = response.data.rates[toCurrency.toUpperCase()];
      if (typeof rate === 'number') {
        logger.info(`[Currency] Fetched live rate ${fromCurrency} -> ${toCurrency}: ${rate}`);
        
        // 3. Cache the resolved rate in Redis for 4 hours (14,400,000 ms)
        try {
          await cache.set(cacheKey, rate, 4 * 60 * 60 * 1000);
        } catch (cacheErr) {
          logger.warn(`[Currency] Failed to write rate to cache: ${cacheErr.message}`);
        }
        
        return rate;
      }
    }
    
    throw new Error(`Invalid response structure or missing rate for ${toCurrency}`);
  } catch (apiErr) {
    logger.error(`[Currency] Failed to fetch exchange rate for ${fromCurrency} -> ${toCurrency}: ${apiErr.message}`);
    throw apiErr;
  }
};

module.exports = { getExchangeRate };
