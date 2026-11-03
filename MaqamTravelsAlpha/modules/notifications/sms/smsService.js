const axios = require('axios');
const logger = require('../../../utils/logger');
const fast2smsService = require('../../../services/fast2sms.service');

const parsePhoneNumber = (phone) => {
  const clean = String(phone).replace(/[^\d+]/g, '');
  const isIndian = clean.startsWith('+91') || (clean.length === 10 && !clean.startsWith('+'));
  const digitsOnly = clean.replace(/^\+/, '');
  return { isIndian, clean, digitsOnly };
};

const sendSMS = async ({ phone, message, variables }) => {
  const { isIndian, digitsOnly, clean } = parsePhoneNumber(phone);

  // 1. Indian Mobile Numbers -> Fast2SMS DLT route
  if (isIndian) {
    const mobile10Digits = digitsOnly.slice(-10);
    return await fast2smsService.sendOtpSMS(mobile10Digits, variables || message);
  }

  // 2. International Mobile Numbers -> Twilio Gateway
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', clean.startsWith('+') ? clean : `+${clean}`);
    params.append('From', process.env.TWILIO_PHONE_NUMBER);
    params.append('Body', message);

    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await axios.post(url, params, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      success: true,
      provider: 'twilio',
      messageId: response.data.sid,
      data: response.data,
    };
  }

  logger.warn(`[SMS] No international provider configured. Dev fallback: to=${phone} text=${message}`);
  return { success: true, provider: 'mock', messageId: `mock_${Date.now()}` };
};

module.exports = { sendSMS, parsePhoneNumber };
