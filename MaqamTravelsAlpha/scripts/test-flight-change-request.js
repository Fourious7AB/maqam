'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const connectDB = require('../config/db');
const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const FlightBooking = require('../modules/flights/flight.model');
const FlightRefund = require('../modules/flights/flightRefund.model');
const Payment = require('../modules/payments/payment.model');
const Booking = require('../modules/bookings/booking.model');
const srdvClient = require('../providers/srdv/srdv.client');
const srdvAdapter = require('../providers/srdv/srdv.adapter');
const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
const {
  sendFlightChangeRequestService,
  cancelFlightBookingService,
} = require('../modules/flights/flight.service');

async function runFlightChangeRequestTestSuite() {
  console.log('\n===============================================================');
  console.log('✈️  STARTING FLIGHT SEND CHANGE REQUEST & CANCELLATION TEST');
  console.log('===============================================================\n');

  await connectDB();

  try {
    const uniqueSuffix = Date.now();

    // 1. Setup Customer User & 2 Travellers (Multi-pax test)
    console.log('--- 1. Setting up Customer User & Multi-Traveller Booking ---');
    const customer = await User.create({
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: `change_req_${uniqueSuffix}@test.com`,
      phone: `98711${uniqueSuffix.toString().slice(-5)}`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    });

    const otherUser = await User.create({
      firstName: 'Unauthorized',
      lastName: 'User',
      email: `unauth_${uniqueSuffix}@test.com`,
      phone: `98712${uniqueSuffix.toString().slice(-5)}`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    });

    const pax1 = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mr',
      firstName: 'Aarav',
      lastName: 'Sharma',
      gender: 'Male',
      dateOfBirth: new Date('1988-06-15'),
      email: customer.email,
      phone: customer.phone,
    });

    const pax2 = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mrs',
      firstName: 'Pooja',
      lastName: 'Sharma',
      gender: 'Female',
      dateOfBirth: new Date('1990-09-20'),
      email: customer.email,
      phone: customer.phone,
    });

    const booking = await FlightBooking.create({
      user: customer._id,
      traceId: `TRACE_CR_${uniqueSuffix}`,
      srdvType: 'mock',
      srdvIndex: '1',
      resultIndex: ['RES_1'],
      isLCC: true,
      totalAmount: 12000,
      markupAmount: 1200,
      pnr: `PNR${uniqueSuffix.toString().slice(-5)}`,
      srdvBookingId: 789123,
      status: 'confirmed',
      fareSnapshot: {
        Segments: [{ Origin: 'DEL', Destination: 'BOM' }],
      },
      passengers: [
        {
          travellerId: pax1._id,
          isLeadPax: true,
          ticketNumber: '6E-1001',
          ticketStatus: 'OK',
        },
        {
          travellerId: pax2._id,
          isLeadPax: false,
          ticketNumber: '6E-1002',
          ticketStatus: 'OK',
        },
      ],
    });

    // Create payment record
    const payment = await Payment.create({
      userId: customer._id,
      bookingId: booking._id,
      bookingType: 'flight',
      bookingModel: 'FlightBooking',
      amount: 12000,
      currency: 'INR',
      paymentMethod: 'paypal',
      status: 'paid',
      gatewayPaymentId: `PAYPAL_CR_PAY_${uniqueSuffix}`,
      gatewayData: {
        captureId: `PAYPAL_CAP_${uniqueSuffix}`,
      },
    });

    booking.paymentId = payment._id;
    await booking.save();

    await Booking.create({
      userId: customer._id,
      itemId: booking._id,
      bookingType: 'flight',
      details: {
        totalPrice: 12000,
        destination: 'BOM',
      },
      status: 'confirmed',
    });

    console.log(`✔ Created 2-Pax Booking: ${booking._id}, PNR: ${booking.pnr}, Total: ₹${booking.totalAmount}`);

    // Mock SRDV SendChangeRequest endpoint
    let capturedCRPayloads = [];
    const originalPost = srdvClient.flightClient.post;
    srdvClient.flightClient.post = async (url, payload) => {
      if (url === '/SendChangeRequest') {
        capturedCRPayloads.push(payload);
        const paxName = payload.TicketData?.[0]?.FirstName || 'Pax';
        return {
          data: {
            Error: { ErrorCode: '0', ErrorMessage: '' },
            ResponseStatus: 'Success',
            SrdvType: payload.SrdvType,
            SrdvIndex: payload.SrdvIndex,
            TraceId: `CR_TRACE_${uniqueSuffix}`,
            TicketCRInfo: [
              {
                ChangeRequestId: `CR_${paxName.toUpperCase()}_${Date.now()}`,
                TicketId: payload.TicketData?.[0]?.TicketId || '',
                Status: 'Pending',
                ChangeRequestStatus: 'Pending',
                Remarks: `Cancellation submitted for ${paxName}`,
              },
            ],
          },
        };
      }
      return originalPost.call(srdvClient.flightClient, url, payload);
    };

    // Mock PayPal refund call
    const originalPaypalRefund = paypalClient.payments.refund;
    let mockRefundExecuted = false;
    paypalClient.payments.refund = async (captureId, amount, currency) => {
      mockRefundExecuted = true;
      return {
        refundId: `PAYPAL_REFUND_CR_${Date.now()}`,
        status: 'COMPLETED',
        amount: { value: amount.toString(), currency_code: currency },
      };
    };

    console.log('\n--- 2. Testing srdvClient.sendChangeRequest Direct Client ---');
    const directClientRes = await srdvClient.sendChangeRequest({
      bookingId: booking.srdvBookingId,
      pnr: booking.pnr,
      srdvType: booking.srdvType,
      srdvIndex: booking.srdvIndex,
      requestType: "1",
      cancellationType: "3",
      remarks: "Customer requested voluntary cancel",
      sectors: [{ Origin: 'DEL', Destination: 'BOM' }],
      ticketData: [{ FirstName: 'Aarav', LastName: 'Sharma', TicketId: '6E-1001' }],
    });

    assert.strictEqual(directClientRes.ResponseStatus, 'Success');
    assert.strictEqual(directClientRes.TicketCRInfo.length, 1);
    console.log('✔ srdvClient.sendChangeRequest successfully transmitted payload and received ChangeRequestId:');
    console.log(`    ChangeRequestId: ${directClientRes.TicketCRInfo[0].ChangeRequestId}`);
    console.log(`    Status: ${directClientRes.TicketCRInfo[0].Status}`);

    console.log('\n--- 3. Testing sendFlightChangeRequestService (Multi-Pax Loop) ---');
    capturedCRPayloads = [];
    const crServiceResult = await sendFlightChangeRequestService({
      bookingId: booking._id,
      requestType: "1",
      cancellationType: "3",
      remarks: "Customer requested full cancellation",
      userId: customer._id,
      isAdmin: false,
    });

    // Verify separate requests were sent for each passenger
    assert.strictEqual(capturedCRPayloads.length, 2);
    assert.strictEqual(capturedCRPayloads[0].TicketData[0].FirstName, 'Aarav');
    assert.strictEqual(capturedCRPayloads[1].TicketData[0].FirstName, 'Pooja');
    assert.strictEqual(crServiceResult.changeRequests.length, 2);
    console.log('✔ Verified per-passenger submission rule (2 requests sent for 2 passengers):');
    crServiceResult.changeRequests.forEach((cr, idx) => {
      console.log(`    Pax ${idx + 1}: ChangeRequestId = ${cr.changeRequestId}, Ticket = ${cr.ticketId}, Status = ${cr.status}`);
    });

    console.log('\n--- 4. Testing cancelFlightBookingService Full Orchestration ---');
    // Test end-to-end cancellation: change requests submitted + refund calculated & processed + payment gateway refunded
    capturedCRPayloads = [];
    const cancelRes = await cancelFlightBookingService({
      bookingId: booking._id,
      penaltyAmount: 3000, // Airline penalty
      reason: 'Trip cancelled by customer',
      userId: customer._id,
      isAdmin: false,
    });

    console.log('✔ Full Cancellation Response:');
    console.log(`    Message: ${cancelRes.message}`);
    console.log(`    Status: ${cancelRes.status}`);
    console.log(`    Financial Breakdown:`);
    console.log(`        Total Booking Amount:    ₹${cancelRes.refund.totalBookingAmount}`);
    console.log(`        Airline Penalty:        -₹${cancelRes.refund.airlinePenalty}`);
    console.log(`        Agency Fee Retained:    -₹${cancelRes.refund.agencyFee}`);
    console.log(`        Customer Refund Amount: =₹${cancelRes.refund.customerRefundAmount}`);
    console.log(`    Gateway Refund ID: ${cancelRes.refund.gatewayRefundId}`);
    console.log(`    SRDV Change Request Ref: ${cancelRes.refund.supplierRefundReference}`);

    // Expected refund: 12000 (total) - 3000 (penalty) - 1200 (agency fee) = 7800
    assert.strictEqual(cancelRes.refund.totalBookingAmount, 12000);
    assert.strictEqual(cancelRes.refund.airlinePenalty, 3000);
    assert.strictEqual(cancelRes.refund.agencyFee, 1200);
    assert.strictEqual(cancelRes.refund.customerRefundAmount, 7800);
    assert.strictEqual(cancelRes.refund.status, 'processed');
    assert.ok(cancelRes.refund.changeRequests.length >= 2);
    assert.ok(mockRefundExecuted);

    // Verify DB states
    const updatedFlightBooking = await FlightBooking.findById(booking._id);
    assert.strictEqual(updatedFlightBooking.status, 'cancelled');

    const updatedMasterBooking = await Booking.findOne({ itemId: booking._id });
    assert.strictEqual(updatedMasterBooking.status, 'cancelled');

    console.log('✔ FlightBooking and Master Booking records marked as "cancelled" in DB');

    console.log('\n--- 5. Testing Authorization Guard ---');
    try {
      await sendFlightChangeRequestService({
        bookingId: booking._id,
        userId: otherUser._id,
        isAdmin: false,
      });
      assert.fail('Should have blocked unauthorized user');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      console.log(`✔ Blocked unauthorized user with 403: "${err.message}"`);
    }

    // Cleanup mocks
    srdvClient.flightClient.post = originalPost;
    paypalClient.payments.refund = originalPaypalRefund;

    console.log('\n===============================================================');
    console.log('🎉 ALL SEND CHANGE REQUEST & CANCELLATION TESTS PASSED!');
    console.log('===============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ CHANGE REQUEST TEST FAILED:', error);
    process.exit(1);
  }
}

runFlightChangeRequestTestSuite();
