/**
 * scripts/test-fast2sms.js
 *
 * Quick smoke-test for the Fast2SMS DLT route.
 *
 * Usage:
 *   node scripts/test-fast2sms.js <10-digit-phone>
 *
 * Example:
 *   node scripts/test-fast2sms.js 9876543210
 */

const axios = require('axios');

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';
const API_KEY = 'Vt1l9nkQasFWNzO34py7wMfA0oHJ8mCxZUP5DIGqcgXdRj2LBvHfUzTS97GZXnvcQEV86ClpLaIskAwW';

// ── helpers ────────────────────────────────────────────────
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000)); // 6-digit

// ── main ───────────────────────────────────────────────────
const testFast2sms = async (phone) => {
  const otp = generateOtp();

  // DLT route payload — same shape as the working codebase
  const payload = {
    route: 'dlt',
    sender_id: 'MAQAMH',
    message: '224018',
    variables_values: otp,
    flash: 0,
    numbers: phone,
  };

  console.log('──────────────────────────────────────');
  console.log('Fast2SMS DLT Test');
  console.log('──────────────────────────────────────');
  console.log(`Phone       : ${phone}`);
  console.log(`OTP         : ${otp}`);
  console.log(`Sender ID   : ${payload.sender_id}`);
  console.log(`Message ID  : ${payload.message}`);
  console.log(`API URL     : ${FAST2SMS_API_URL}`);
  console.log('──────────────────────────────────────\n');

  try {
    const response = await axios.post(FAST2SMS_API_URL, payload, {
      headers: {
        authorization: API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅  Response status:', response.status);
    console.log('✅  Response body :', JSON.stringify(response.data, null, 2));

    if (!response.data.return) {
      console.warn('⚠️   Gateway returned return=false:', response.data.message);
    }
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    console.error('❌  Request failed:', errMsg);
    if (error.response?.data) {
      console.error('    Full error body:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

// ── CLI entry ──────────────────────────────────────────────
const phone = process.argv[2];

if (!phone || !/^\d{10}$/.test(phone)) {
  console.error('Usage: node scripts/test-fast2sms.js <10-digit-phone>');
  process.exit(1);
}

testFast2sms(phone);
