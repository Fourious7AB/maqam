'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const dns = require('node:dns/promises');
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch {}

const mongoose = require('mongoose');
const Redis = require('ioredis');
const axios = require('axios');
const connectDB = require('../config/db');
const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');

async function runSoftCheck() {
  console.log('\n========================================================================');
  console.log('🩺 RUNNING PHASE 2 SOFT TEST / HEALTH CHECK (FLIGHT MODULE)');
  console.log('========================================================================\n');

  const report = {
    mongo: { status: 'PENDING', message: '' },
    redis: { status: 'PENDING', message: '' },
    srdvConfig: { status: 'PENDING', message: '' },
    srdvPing: { status: 'PENDING', message: '' },
    paypalConfig: { status: 'PENDING', message: '' },
    schemas: { status: 'PENDING', message: '' },
  };

  // 1. MongoDB Check
  try {
    console.log('[1/6] Checking MongoDB connectivity...');
    await connectDB();
    const state = mongoose.connection.readyState;
    if (state === 1) {
      report.mongo.status = 'PASS';
      report.mongo.message = `Connected to ${mongoose.connection.host} / DB: ${mongoose.connection.name}`;
      console.log(`  ✔ MongoDB: ${report.mongo.message}`);
    } else {
      report.mongo.status = 'FAIL';
      report.mongo.message = `Unexpected readyState: ${state}`;
      console.log(`  ❌ MongoDB: ${report.mongo.message}`);
    }
  } catch (err) {
    report.mongo.status = 'FAIL';
    report.mongo.message = err.message;
    console.log(`  ❌ MongoDB Error: ${err.message}`);
  }

  // 2. Redis Check
  try {
    console.log('\n[2/6] Checking Redis connectivity...');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    const pong = await redis.ping();
    if (pong === 'PONG') {
      report.redis.status = 'PASS';
      report.redis.message = `Ping returned PONG (${redisUrl})`;
      console.log(`  ✔ Redis: ${report.redis.message}`);
    } else {
      report.redis.status = 'FAIL';
      report.redis.message = `Unexpected response: ${pong}`;
      console.log(`  ❌ Redis: ${report.redis.message}`);
    }
    redis.disconnect();
  } catch (err) {
    report.redis.status = 'FAIL';
    report.redis.message = err.message;
    console.log(`  ❌ Redis Error: ${err.message}`);
  }

  // 3. SRDV Config Check
  console.log('\n[3/6] Checking SRDV credentials and environment configuration...');
  const token = process.env.SRDV_API_TOKEN || process.env.SRDV_API_KEY;
  const flightBase = process.env.SRDV_API_BASE_FLIGHT_URL;
  if (!token) {
    report.srdvConfig.status = 'FAIL';
    report.srdvConfig.message = 'SRDV_API_TOKEN / SRDV_API_KEY is missing';
    console.log(`  ❌ SRDV Config: ${report.srdvConfig.message}`);
  } else if (!flightBase) {
    report.srdvConfig.status = 'FAIL';
    report.srdvConfig.message = 'SRDV_API_BASE_FLIGHT_URL is missing';
    console.log(`  ❌ SRDV Config: ${report.srdvConfig.message}`);
  } else {
    report.srdvConfig.status = 'PASS';
    report.srdvConfig.message = `Token present (ends in ...${token.slice(-6)}), Base: ${flightBase}`;
    console.log(`  ✔ SRDV Config: ${report.srdvConfig.message}`);
  }

  // 4. Live SRDV Flight API Ping (Search)
  console.log('\n[4/6] Pinging live SRDV Flight Search Endpoint (DEL -> BOM)...');
  try {
    const departDate = new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0];
    const srdvClient = require('../providers/srdv/srdv.client');
    const { searchFlightsService } = require('../modules/flights/flight.service');

    const searchRes = await searchFlightsService({
      origin: 'DEL',
      destination: 'BOM',
      departDate,
      passengers: { adults: 1, children: 0, infants: 0 },
      journeyType: 'oneway',
    });

    if (searchRes && searchRes.traceId) {
      report.srdvPing.status = 'PASS';
      const flightCount = (searchRes.outbound || []).length;
      report.srdvPing.message = `Live TraceId: ${searchRes.traceId}, Results returned: ${flightCount}`;
      console.log(`  ✔ SRDV Ping: ${report.srdvPing.message}`);
    } else {
      report.srdvPing.status = 'WARN';
      report.srdvPing.message = 'Search responded but traceId was empty';
      console.log(`  ⚠️ SRDV Ping: ${report.srdvPing.message}`);
    }
  } catch (err) {
    report.srdvPing.status = 'FAIL';
    report.srdvPing.message = err.message;
    console.log(`  ❌ SRDV Ping Error: ${err.message}`);
  }

  // 5. PayPal Sandbox Config & Token Check
  console.log('\n[5/6] Checking PayPal Sandbox connectivity...');
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      report.paypalConfig.status = 'FAIL';
      report.paypalConfig.message = 'PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing';
      console.log(`  ❌ PayPal Config: ${report.paypalConfig.message}`);
    } else {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await axios.post(
        'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 7000,
        }
      );
      if (tokenRes.data && tokenRes.data.access_token) {
        report.paypalConfig.status = 'PASS';
        report.paypalConfig.message = `OAuth2 token generated successfully (expires in ${tokenRes.data.expires_in}s)`;
        console.log(`  ✔ PayPal: ${report.paypalConfig.message}`);
      } else {
        report.paypalConfig.status = 'FAIL';
        report.paypalConfig.message = 'Access token not in response';
        console.log(`  ❌ PayPal: ${report.paypalConfig.message}`);
      }
    }
  } catch (err) {
    report.paypalConfig.status = 'FAIL';
    report.paypalConfig.message = err.response?.data?.error_description || err.message;
    console.log(`  ❌ PayPal Error: ${report.paypalConfig.message}`);
  }

  // 6. Schemas Verification
  console.log('\n[6/6] Verifying Mongoose Schemas...');
  try {
    const FlightBooking = require('../modules/flights/flight.model');
    const FlightRefund = require('../modules/flights/flightRefund.model');
    const Booking = require('../modules/bookings/booking.model');
    const Payment = require('../modules/payments/payment.model');
    const Traveller = require('../modules/account/traveller.model');

    const checks = [
      FlightBooking.schema.path('traceId'),
      FlightBooking.schema.path('pnr'),
      FlightRefund.schema.path('airlinePenalty'),
      Booking.schema.path('bookingType'),
      Payment.schema.path('status'),
      Traveller.schema.path('passengerType'),
    ];

    if (checks.every(Boolean)) {
      report.schemas.status = 'PASS';
      report.schemas.message = 'All critical flight & payment schemas and fields defined correctly';
      console.log(`  ✔ Schemas: ${report.schemas.message}`);
    } else {
      report.schemas.status = 'FAIL';
      report.schemas.message = 'Some critical schema paths are missing';
      console.log(`  ❌ Schemas: ${report.schemas.message}`);
    }
  } catch (err) {
    report.schemas.status = 'FAIL';
    report.schemas.message = err.message;
    console.log(`  ❌ Schema Error: ${err.message}`);
  }

  console.log('\n========================================================================');
  console.log('🏁 SOFT TEST SUMMARY:');
  console.log(JSON.stringify(report, null, 2));
  console.log('========================================================================\n');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(0);
}

runSoftCheck().catch((err) => {
  console.error('Fatal soft check failure:', err);
  process.exit(1);
});
