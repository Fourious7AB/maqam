'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const connectDB = require('../config/db');
const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const FlightBooking = require('../modules/flights/flight.model');
const srdvClient = require('../providers/srdv/srdv.client');
const srdvAdapter = require('../providers/srdv/srdv.adapter');
const { getCancellationChargesService } = require('../modules/flights/flight.service');

async function runCancellationChargesTestSuite() {
  console.log('\n===============================================================');
  console.log('✈️  STARTING FLIGHT GET CANCELLATION CHARGES INTEGRATION TEST');
  console.log('===============================================================\n');

  await connectDB();

  try {
    // 1. Setup mock customer & booking
    const uniqueSuffix = Date.now();
    const customer = await User.create({
      firstName: 'Cancel',
      lastName: 'Customer',
      email: `cancel_charges_${uniqueSuffix}@test.com`,
      phone: `98765${uniqueSuffix.toString().slice(-5)}`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    });

    const otherUser = await User.create({
      firstName: 'Other',
      lastName: 'Customer',
      email: `other_charges_${uniqueSuffix}@test.com`,
      phone: `98764${uniqueSuffix.toString().slice(-5)}`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    });

    const traveller = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mr',
      firstName: 'Rahul',
      lastName: 'Verma',
      gender: 'Male',
      dateOfBirth: new Date('1990-05-15'),
      email: customer.email,
      phone: customer.phone,
    });

    const sampleTraceId = `TRACE_CANCEL_${uniqueSuffix}`;

    const booking = await FlightBooking.create({
      user: customer._id,
      traceId: sampleTraceId,
      srdvType: 'mock',
      srdvIndex: '1',
      resultIndex: ['RES_1'],
      isLCC: true,
      totalAmount: 7500, // Total customer price
      markupAmount: 750, // Agency 10% markup retained
      pnr: `PNR${uniqueSuffix.toString().slice(-5)}`,
      srdvBookingId: 987654,
      status: 'confirmed',
      passengers: [
        {
          travellerId: traveller._id,
          isLeadPax: true,
          ticketNumber: '6E-9081234',
          ticketStatus: 'OK',
        },
      ],
    });

    console.log('--- 1. Testing srdvClient.getCancellationCharges with Mock ---');
    // Mock the HTTP call for isolation in test
    const originalPost = srdvClient.flightClient.post;
    srdvClient.flightClient.post = async (url, payload) => {
      if (url === '/GetCancellationCharges') {
        assert.strictEqual(payload.TraceId, sampleTraceId);
        assert.strictEqual(payload.RequestType, 1);
        return {
          data: {
            Error: { ErrorCode: 0, ErrorMessage: '' },
            Result: [
              {
                CancellationType: 'FullCancellation',
                TotalRefundAmount: '4500.00',
                TotalCancellationCharge: '2250.00',
                Segments: [
                  {
                    FromAirport: 'DEL',
                    ToAirport: 'BOM',
                    RefundAmount: '4500.00',
                    CancellationCharge: '2250.00',
                    Remarks: 'Airline cancellation fee applied',
                  },
                ],
              },
            ],
          },
        };
      }
      return originalPost.call(srdvClient.flightClient, url, payload);
    };

    const clientRaw = await srdvClient.getCancellationCharges({
      requestType: 1,
      traceId: sampleTraceId,
    });
    assert.strictEqual(clientRaw.Error.ErrorCode, 0);
    assert.strictEqual(clientRaw.Result[0].TotalCancellationCharge, '2250.00');
    console.log('✔ srdvClient.getCancellationCharges returned valid SRDV payload');

    console.log('\n--- 2. Testing srdvAdapter.getCancellationChargesAdapter ---');
    const adapterResult = await srdvAdapter.getCancellationChargesAdapter({
      requestType: 1,
      traceId: sampleTraceId,
    });
    assert.strictEqual(adapterResult.cancellationType, 'FullCancellation');
    assert.strictEqual(adapterResult.totalCancellationCharge, 2250);
    assert.strictEqual(adapterResult.totalRefundAmount, 4500);
    assert.strictEqual(adapterResult.segments.length, 1);
    assert.strictEqual(adapterResult.segments[0].fromAirport, 'DEL');
    assert.strictEqual(adapterResult.segments[0].toAirport, 'BOM');
    console.log('✔ srdvAdapter normalized cancellation charge payload successfully:');
    console.log(`    Cancellation Type: ${adapterResult.cancellationType}`);
    console.log(`    Total Airline Penalty: ₹${adapterResult.totalCancellationCharge}`);
    console.log(`    Supplier Net Refund: ₹${adapterResult.totalRefundAmount}`);

    console.log('\n--- 3. Testing getCancellationChargesService Financial Calculation ---');
    const serviceQuote = await getCancellationChargesService({
      bookingId: booking._id,
      requestType: 1,
      userId: customer._id,
      isAdmin: false,
    });

    console.log('✔ Financial Quote Breakdown:');
    console.log(`    Total Booking Amount:    ₹${serviceQuote.totalBookingAmount}`);
    console.log(`    Airline Penalty:        -₹${serviceQuote.airlinePenalty}`);
    console.log(`    Agency Markup Fee:      -₹${serviceQuote.agencyFee}`);
    console.log(`    Expected Customer Refund =₹${serviceQuote.expectedCustomerRefund}`);

    // Calculation verification: 7500 (total) - 2250 (penalty) - 750 (agency markup) = 4500
    assert.strictEqual(serviceQuote.totalBookingAmount, 7500);
    assert.strictEqual(serviceQuote.airlinePenalty, 2250);
    assert.strictEqual(serviceQuote.agencyFee, 750);
    assert.strictEqual(serviceQuote.expectedCustomerRefund, 4500);

    console.log('\n--- 4. Testing Authorization & Validation Guards ---');
    // Non-owner rejection
    try {
      await getCancellationChargesService({
        bookingId: booking._id,
        requestType: 1,
        userId: otherUser._id,
        isAdmin: false,
      });
      assert.fail('Should have rejected unauthorized user');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      console.log(`✔ Unauthorized access correctly rejected with 403: "${err.message}"`);
    }

    // Admin override succeeds
    const adminQuote = await getCancellationChargesService({
      bookingId: booking._id,
      requestType: 1,
      userId: otherUser._id,
      isAdmin: true,
    });
    assert.strictEqual(adminQuote.expectedCustomerRefund, 4500);
    console.log('✔ Admin override successfully bypassed ownership check');

    // Restore mock
    srdvClient.flightClient.post = originalPost;

    console.log('\n===============================================================');
    console.log('🎉 ALL FLIGHT CANCELLATION CHARGES TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ CANCELLATION CHARGES TEST FAILED:', error);
    process.exit(1);
  }
}

runCancellationChargesTestSuite();
