'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const connectDB = require('../config/db');
const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const FlightBooking = require('../modules/flights/flight.model');
const FlightRefund = require('../modules/flights/flightRefund.model');
const srdvClient = require('../providers/srdv/srdv.client');
const srdvAdapter = require('../providers/srdv/srdv.adapter');
const { getCancelStatusService } = require('../modules/flights/flight.service');

async function runFlightCancelStatusTestSuite() {
  console.log('\n===============================================================');
  console.log('✈️  STARTING FLIGHT GET CANCEL STATUS INTEGRATION TEST');
  console.log('===============================================================\n');

  await connectDB();

  try {
    const uniqueSuffix = Date.now();

    // 1. Setup Customer User & Booking
    console.log('--- 1. Setting up Customer User, Booking & FlightRefund ---');
    const customer = await User.create({
      firstName: 'Rohan',
      lastName: 'Kapoor',
      email: `cancel_stat_${uniqueSuffix}@test.com`,
      phone: `98722${uniqueSuffix.toString().slice(-5)}`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    });

    const otherUser = await User.create({
      firstName: 'Unauthorized',
      lastName: 'User',
      email: `unauth_stat_${uniqueSuffix}@test.com`,
      phone: `98723${uniqueSuffix.toString().slice(-5)}`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    });

    const traveller = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mr',
      firstName: 'Rohan',
      lastName: 'Kapoor',
      gender: 'Male',
      dateOfBirth: new Date('1987-03-10'),
      email: customer.email,
      phone: customer.phone,
    });

    const sampleCRId = `CR_ROHAN_${uniqueSuffix}`;

    const booking = await FlightBooking.create({
      user: customer._id,
      traceId: `TRACE_STAT_${uniqueSuffix}`,
      srdvType: 'mock',
      srdvIndex: '1',
      resultIndex: ['RES_1'],
      isLCC: true,
      totalAmount: 9000,
      markupAmount: 900,
      pnr: `PNR${uniqueSuffix.toString().slice(-5)}`,
      srdvBookingId: 654321,
      status: 'cancelled',
      passengers: [
        {
          travellerId: traveller._id,
          isLeadPax: true,
          ticketNumber: '6E-5544',
          ticketStatus: 'OK',
        },
      ],
    });

    const refund = await FlightRefund.create({
      bookingId: booking._id,
      userId: customer._id,
      pnr: booking.pnr,
      srdvBookingId: booking.srdvBookingId,
      cancellationType: 'full',
      totalBookingAmount: 9000,
      airlinePenalty: 2500,
      agencyFee: 900,
      customerRefundAmount: 5600,
      status: 'processed',
      idempotencyKey: `FLIGHT_REF_STAT_${uniqueSuffix}`,
      supplierRefundReference: sampleCRId,
      changeRequests: [
        {
          changeRequestId: sampleCRId,
          ticketId: '6E-5544',
          status: 'Pending',
          changeRequestStatus: 'Pending',
          remarks: 'Submitted to airline',
        },
      ],
    });

    console.log(`✔ Created Cancelled Booking: ${booking._id}, CR ID: ${sampleCRId}`);

    // Mock SRDV GetCancelStatus endpoint
    const originalPost = srdvClient.flightClient.post;
    srdvClient.flightClient.post = async (url, payload) => {
      if (url === '/GetCancelStatus') {
        assert.strictEqual(payload.ChangeRequestId, sampleCRId);
        return {
          data: {
            Error: { ErrorCode: '0', ErrorMessage: '' },
            ChangeRequestId: sampleCRId,
            PaxName: 'Rohan Kapoor',
            PNR: booking.pnr,
            Sector: 'DEL-BOM',
            DepartDate: '2026-09-10T08:30:00',
            CancelStatus: 'Cancelled',
            RefundStatus: 'Processed',
            RefundAmount: '6500.00',
            CancellationCharge: 2500.0,
            RefundDate: '2026-08-29T11:30:00',
            AdminRemark: 'Refund credited to agency wallet',
            YourRemark: 'Customer requested cancellation',
          },
        };
      }
      return originalPost.call(srdvClient.flightClient, url, payload);
    };

    console.log('\n--- 2. Testing srdvClient.getCancelStatus Direct Client ---');
    const directRes = await srdvClient.getCancelStatus({
      changeRequestId: sampleCRId,
    });
    assert.strictEqual(directRes.Error.ErrorCode, '0');
    assert.strictEqual(directRes.CancelStatus, 'Cancelled');
    assert.strictEqual(directRes.RefundStatus, 'Processed');
    console.log('✔ srdvClient.getCancelStatus returned valid payload:');
    console.log(`    ChangeRequestId: ${directRes.ChangeRequestId}`);
    console.log(`    CancelStatus: ${directRes.CancelStatus}`);
    console.log(`    RefundStatus: ${directRes.RefundStatus}`);
    console.log(`    RefundAmount: ₹${directRes.RefundAmount}`);

    console.log('\n--- 3. Testing srdvAdapter.getCancelStatusAdapter Normalization ---');
    const adapterRes = await srdvAdapter.getCancelStatusAdapter({
      changeRequestId: sampleCRId,
    });
    assert.strictEqual(adapterRes.changeRequestId, sampleCRId);
    assert.strictEqual(adapterRes.cancelStatus, 'Cancelled');
    assert.strictEqual(adapterRes.refundStatus, 'Processed');
    assert.strictEqual(adapterRes.refundAmount, 6500);
    assert.strictEqual(adapterRes.cancellationCharge, 2500);
    console.log('✔ srdvAdapter normalized cancellation status:');
    console.log(`    Pax Name: ${adapterRes.paxName}`);
    console.log(`    Airline Penalty: ₹${adapterRes.cancellationCharge}`);
    console.log(`    Supplier Refund Credited: ₹${adapterRes.refundAmount}`);
    console.log(`    Admin Remark: "${adapterRes.adminRemark}"`);

    console.log('\n--- 4. Testing getCancelStatusService by bookingId & DB Sync ---');
    const serviceRes = await getCancelStatusService({
      bookingId: booking._id,
      userId: customer._id,
      isAdmin: false,
    });

    assert.strictEqual(serviceRes.bookingId.toString(), booking._id.toString());
    assert.strictEqual(serviceRes.isFullyProcessedByAirline, true);
    assert.strictEqual(serviceRes.changeRequestStatuses.length, 1);
    assert.strictEqual(serviceRes.changeRequestStatuses[0].refundStatus, 'Processed');

    // Verify DB record was updated
    const updatedRefund = await FlightRefund.findById(refund._id);
    assert.strictEqual(updatedRefund.changeRequests[0].status, 'Cancelled');
    assert.strictEqual(updatedRefund.changeRequests[0].changeRequestStatus, 'Processed');
    assert.strictEqual(updatedRefund.changeRequests[0].remarks, 'Refund credited to agency wallet');
    console.log('✔ getCancelStatusService successfully synced live supplier status back to FlightRefund DB record:');
    console.log(`    DB Change Request Status: ${updatedRefund.changeRequests[0].status}`);
    console.log(`    DB Change Request Refund Status: ${updatedRefund.changeRequests[0].changeRequestStatus}`);
    console.log(`    DB Change Request Remark: "${updatedRefund.changeRequests[0].remarks}"`);

    console.log('\n--- 5. Testing Direct Lookup by changeRequestId ---');
    const directLookupRes = await getCancelStatusService({
      changeRequestId: sampleCRId,
    });
    assert.strictEqual(directLookupRes.changeRequestId, sampleCRId);
    assert.strictEqual(directLookupRes.details.cancelStatus, 'Cancelled');
    console.log('✔ Direct lookup by changeRequestId succeeded');

    console.log('\n--- 6. Testing Authorization Guard ---');
    try {
      await getCancelStatusService({
        bookingId: booking._id,
        userId: otherUser._id,
        isAdmin: false,
      });
      assert.fail('Should have rejected unauthorized user');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      console.log(`✔ Blocked unauthorized user with 403: "${err.message}"`);
    }

    // Cleanup mock
    srdvClient.flightClient.post = originalPost;

    console.log('\n===============================================================');
    console.log('🎉 ALL FLIGHT GET CANCEL STATUS TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ CANCEL STATUS TEST FAILED:', error);
    process.exit(1);
  }
}

runFlightCancelStatusTestSuite();
