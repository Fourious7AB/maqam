const axios = require('axios');
const logger = require('../utils/logger');

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';
const DLT_SENDER_ID = process.env.FAST2SMS_SENDER_ID || 'MAQAMH';
const DLT_MESSAGE_ID = process.env.FAST2SMS_OTP_TEMPLATE_ID || '224018';

/**
 * Send OTP via Fast2SMS DLT-approved route
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<object>} 
 */
const sendOtpSMS = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  // Development fallback if no API key is provided
  if (!apiKey) {
    logger.warn(`[Fast2SMS] API key is not configured. Dev OTP for ${phone}: ${otp}`);
    return {
      success: true,
      message: 'Fast2SMS API key not configured. OTP logged to console.',
      devOtp: otp,
    };
  }

  const payload = {
    route: 'dlt',
    sender_id: DLT_SENDER_ID,
    message: DLT_MESSAGE_ID,
    variables_values: otp,
    flash: 0,
    numbers: phone,
  };

  try {
    logger.info(`[Fast2SMS] Sending DLT SMS → phone=${phone}, sender_id=${DLT_SENDER_ID}, template_id=${DLT_MESSAGE_ID}, variables_values=${otp}`);
    logger.debug(`[Fast2SMS] Full payload: ${JSON.stringify(payload)}`);

    const response = await axios.post(FAST2SMS_API_URL, payload, {
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
    });

    logger.info(`[Fast2SMS] API Response: ${JSON.stringify(response.data)}`);

    if (!response.data.return) {
      throw new Error(response.data.message || 'Fast2SMS gateway error');
    }

    logger.info(`[Fast2SMS] OTP SMS successfully dispatched to ${phone} — request_id: ${response.data.request_id || 'N/A'}`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const apiError =
      error.response?.data?.message ||
      error.response?.data?.status_message ||
      error.message ||
      'Failed to dispatch SMS via Fast2SMS';

    logger.error(`[Fast2SMS] API Error for ${phone}: ${JSON.stringify(apiError)}`);

    // In development mode, log OTP so developers aren't blocked
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(`[DEV FALLBACK] Fast2SMS dispatch failed (${apiError}). Use Dev OTP for ${phone}: ${otp}`);
      return {
        success: true,
        isDevFallback: true,
        message: `Fast2SMS Gateway Error: ${apiError}. Dev OTP: ${otp}`,
        devOtp: otp,
      };
    }

    throw new Error(apiError);
  }
};

module.exports = {
  sendOtpSMS,
};
