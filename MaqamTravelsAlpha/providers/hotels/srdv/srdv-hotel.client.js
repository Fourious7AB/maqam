'use strict';

/**
 * providers/hotels/srdv/srdv-hotel.client.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Raw HTTP client for SRDV Hotel API v8.
 * Authenticates using API-TOKEN in HTTP request headers.
 */

const axios = require('axios');
const logger = require('../../../utils/logger');
const { AppError } = require('../../../middleware/errorHandler');

const SRDV_HOTEL_BASE_URL = (process.env.SRDV_API_BASE_HOTEL_URL || 'https://hotel.srdvapi.com/v8/rest').replace(/\/+$/, '');
const SRDV_API_TOKEN = (process.env.SRDV_API_TOKEN || process.env.SRDV_API_KEY || '')
  .replace(/['"]/g, '')
  .trim();

const client = axios.create({
  baseURL: SRDV_HOTEL_BASE_URL,
  headers: {
    'API-TOKEN': SRDV_API_TOKEN,
    'Content-Type': 'application/json',
  },
  timeout: process.env.SRDV_TIMEOUT ? Number(process.env.SRDV_TIMEOUT) : 60000,
});

logger.info(`[SRDV Hotel Client] API key header presence: ${SRDV_API_TOKEN ? 'present' : 'missing'}`);

/**
 * postRequest
 * ─────────────────────────────────────────────────────────────────────────────
 * Generic HTTP POST wrapper for all SRDV Hotel API endpoints.
 * Sends request payload with API-TOKEN in headers and normalizes SRDV error responses.
 *
 * Error handling:
 *   - SRDV ErrorCode 0 is treated as a non-fatal informational response.
 *   - Any non-zero ErrorCode throws AppError(message, 502).
 *   - HTTP errors and timeouts also throw AppError(message, 502).
 *
 * @async
 * @param {string} path - SRDV API endpoint path (e.g. '/Search', '/BlockRoom').
 * @param {object} body - Request body fields.
 * @param {string} [correlationId=''] - Correlation ID for distributed tracing in logs.
 * @returns {Promise<object>} Parsed SRDV JSON response body.
 * @throws {AppError} 502 if SRDV returns a non-zero error code or HTTP error.
 */
const postRequest = async (path, body, correlationId = '') => {
  const payload = { ...body };

  logger.info(`[SRDV Hotel Client] [${correlationId}] POST ${path} payload: ${JSON.stringify(payload)}`);
  const startTime = Date.now();

  try {
    const normalizedPath = path.replace(/^\/+/, '');
    const response = await client.post(normalizedPath, payload);
    const duration = Date.now() - startTime;
    logger.info(`[SRDV Hotel Client] [${correlationId}] Response from POST /${normalizedPath} status ${response.status} in ${duration}ms`);
    const data = response.data;

    const wrapperKeys = [
      'HotelSearchResult',
      'SearchResult',
      'GetHotelRoomResult',
      'HotelRoomResult',
      'GetHotelInfoResult',
      'HotelInfoResult',
      'BlockRoomResult',
      'BookResult',
      'CancelResult',
    ];

    const wrapper = wrapperKeys.reduce((result, key) => result || data[key], null) || data;
    const errorPayload = wrapper?.Error;
    if (errorPayload) {
      if (errorPayload.ErrorCode === 0 || errorPayload.ErrorCode === '0') {
        logger.info(`[SRDV Hotel Client] [${correlationId}] SRDV returned ErrorCode 0; treating as non-fatal response.`);
        return data;
      }

      const codeStr = String(errorPayload.ErrorCode);
      let hint = '';
      if (codeStr === '900' || codeStr === '1005') hint = ' (Outbound public IP not whitelisted in SRDV DSA Portal)';
      if (codeStr === '2008') hint = ' (Invalid API Token)';
      if (codeStr === '998') hint = ' (API module not activated by SRDV Support for this account)';
      if (codeStr === '999') hint = ' (Invalid API-TOKEN)';
      const errMsg = `${errorPayload.ErrorMessage || JSON.stringify(errorPayload)}${hint}`;

      logger.error(`[SRDV Hotel Client] [${correlationId}] SRDV returned error [${codeStr}]: ${errMsg}`);
      throw new AppError(`SRDV Hotel API error [${codeStr}]: ${errMsg}`, 502, {
        srdvErrorCode: codeStr,
        rawError: errorPayload,
      });
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    const duration = Date.now() - startTime;
    const errorMsg = error.response
      ? `status ${error.response.status} - ${JSON.stringify(error.response.data)}`
      : error.message;

    logger.error(`[SRDV Hotel Client] [${correlationId}] POST ${path} failed after ${duration}ms: ${errorMsg}`);
    const detail = error.response?.data ? (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data) : error.message;
    throw new AppError(`SRDV Hotel API error during ${path}: ${detail}`, 502);
  }
};

/**
 * SRDV Hotel API client.
 * All methods accept an optional `correlationId` string for distributed tracing.
 * All methods throw `AppError(message, 502)` on SRDV or network errors.
 */
module.exports = {
  /** POST /Search — Hotel availability search. */
  search: (body, correlationId) => postRequest('/Search', body, correlationId),
  /** POST /GetHotelInfo — Hotel property info (description, images, address). */
  hotelInfo: (body, correlationId) => postRequest('/GetHotelInfo', body, correlationId),
  /** POST /GetHotelRoom — Hotel room rates and availability. */
  hotelRoom: (body, correlationId) => postRequest('/GetHotelRoom', body, correlationId),
  /** POST /BlockRoom — Rate lock / recheck before booking (mandatory pre-booking step). */
  blockRoom: (body, correlationId) => postRequest('/BlockRoom', body, correlationId),
  /** POST /Book — Submit passenger details and confirm reservation with supplier. */
  book: (body, correlationId) => postRequest('/Book', body, correlationId),
  /** POST /HotelBookingDetail — Query booking status for a pending reservation. */
  hotelBookingDetail: (body, correlationId) => postRequest('/HotelBookingDetail', body, correlationId),
  /** POST /HotelCancel — Cancel a confirmed supplier reservation. */
  hotelCancel: (body, correlationId) => postRequest('/HotelCancel', body, correlationId),
};
