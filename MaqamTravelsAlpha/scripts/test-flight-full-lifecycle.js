'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const connectDB = require('../config/db');
const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const FlightBooking = require('../modules/flights/flight.model');
const FlightRefund = require('../modules/flights/flightRefund.model');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');

const srdvClient = require('../providers/srdv/srdv.client');
const srdvAdapter = require('../providers/srdv/srdv.adapter');
const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
const paypalService = require('../modules/payments/gateways/paypal/paypal.service');

const {
  bookFlightService,
  getCancellationChargesService,
  cancelFlightBookingService,
  getCancelStatusService,
  getFlightRefundService,
} = require('../modules/flights/flight.service');
const { processGDSTicketing } = require('../workers/flights/flight-ticket-gds.worker');

async function runFlightFullLifecycleTestSuite() {
  console.log('\n========================================================================');
  console.log('✈️  STARTING COMPLETE END-TO-END FLIGHT LIFECYCLE & REFUND TEST SUITE');
  console.log('========================================================================\n');

  await connectDB();

  // Save originals to restore at end
  const originalPost = srdvClient.flightClient.post;
  const originalPaypalOrderCreate = paypalClient.orders.create;
  const originalPaypalCapture = paypalClient.orders.capture;
  const originalPaypalRefund = paypalClient.payments.refund;

  try {
    const uniqueSuffix = Date.now();
    const traceId = `TRACE_E2E_${uniqueSuffix}`;
    const pnrCode = `6E${uniqueSuffix.toString().slice(-4)}`;
    const srdvBookingId = 889900;

    // -------------------------------------------------------------
    // Mocking External SRDV & PayPal Gateway Endpoints
    // -------------------------------------------------------------
    let backendRefundCalled = false;
    let backendRefundPayload = null;
    let changeRequestCalls = [];

    srdvClient.flightClient.post = async (url, payload) => {
      // 1. Hold GDS / Book
      if (url === '/hold' || url === '/Book') {
        return {
          data: {
            Error: { ErrorCode: 0, ErrorMessage: '' },
            Response: {
              ResponseStatus: 1,
              PNR: pnrCode,
              BookingId: srdvBookingId,
              LastTicketDate: new Date(Date.now() + 86400000 * 2).toISOString(),
              ETicketData: 'MOCK_ETICKET_HOLD',
            },
          },
        };
      }
      // 2. Ticket GDS
      if (url === '/TicketGDS') {
        return {
          data: {
            Error: { ErrorCode: 0, ErrorMessage: '' },
            Response: {
              ResponseStatus: 1,
              PNR: pnrCode,
              BookingId: srdvBookingId,
              InvoiceNo: `INV-E2E-${uniqueSuffix}`,
              InvoiceStatus: 1,
              TicketStatus: 1,
              FlightItinerary: {
                Passenger: [
                  {
                    FirstName: 'Karan',
                    LastName: 'Mehra',
                    Ticket: { TicketNumber: '098-9988776655', TicketStatus: 'OK' },
                  },
                ],
              },
            },
          },
        };
      }
      // 3. GetCancellationCharges
      if (url === '/GetCancellationCharges') {
        return {
          data: {
            Error: { ErrorCode: 0, ErrorMessage: '' },
            Result: [
              {
                CancellationType: 'FullCancellation',
                TotalRefundAmount: '4500.00',
                TotalCancellationCharge: '1500.00',
                Segments: [
                  {
                    FromAirport: 'DEL',
                    ToAirport: 'BOM',
                    RefundAmount: '4500.00',
                    CancellationCharge: '1500.00',
                    Remarks: 'Airline penalty ₹1500',
                  },
                ],
              },
            ],
          },
        };
      }
      // 4. SendChangeRequest
      if (url === '/SendChangeRequest') {
        changeRequestCalls.push(payload);
        const paxName = payload.TicketData?.[0]?.FirstName || 'Pax';
        return {
          data: {
            Error: { ErrorCode: '0', ErrorMessage: '' },
            ResponseStatus: 'Success',
            SrdvType: payload.SrdvType,
            SrdvIndex: payload.SrdvIndex,
            TraceId: traceId,
            TicketCRInfo: [
              {
                ChangeRequestId: `CR_${paxName.toUpperCase()}_${uniqueSuffix}`,
                TicketId: payload.TicketData?.[0]?.TicketId || '098-9988776655',
                Status: 'Pending',
                ChangeRequestStatus: 'Pending',
                Remarks: 'Submitted to airline for cancellation',
              },
            ],
          },
        };
      }
      // 5. GetCancelStatus
      if (url === '/GetCancelStatus') {
        return {
          data: {
            Error: { ErrorCode: '0', ErrorMessage: '' },
            ChangeRequestId: payload.ChangeRequestId,
            PaxName: 'Karan Mehra',
            PNR: pnrCode,
            Sector: 'DEL-BOM',
            DepartDate: '2026-09-15T10:00:00',
            CancelStatus: 'Cancelled',
            RefundStatus: 'Processed',
            RefundAmount: '4500.00',
            CancellationCharge: 1500.0,
            RefundDate: new Date().toISOString(),
            AdminRemark: 'Refund credited to agency SRDV wallet',
            YourRemark: 'Customer cancellation',
          },
        };
      }

      return originalPost.call(srdvClient.flightClient, url, payload);
    };

    paypalClient.orders.create = async (amount, bookingId, currency) => ({
      orderId: `PAYPAL_ORD_${uniqueSuffix}`,
      redirectUrl: 'https://sandbox.paypal.com/checkoutnow?token=mock_e2e',
      currency,
      raw: {},
    });

    paypalClient.orders.capture = async (orderId) => ({
      transactionId: `PAYPAL_CAP_${uniqueSuffix}`,
      captureId: `PAYPAL_CAP_${uniqueSuffix}`,
      status: 'COMPLETED',
      amount: { value: '6600.00', currency_code: 'INR' },
      raw: {},
    });

    paypalClient.payments.refund = async (captureId, amount, currency) => {
      backendRefundCalled = true;
      backendRefundPayload = { captureId, amount, currency };
      return {
        refundId: `PAYPAL_REF_${Date.now()}`,
        status: 'COMPLETED',
        amount: { value: amount.toString(), currency_code: currency },
      };
    };

    // -------------------------------------------------------------
    // PHASE 1: User & Traveller Setup
    // -------------------------------------------------------------
    console.log('--- PHASE 1: User & Traveller Registration ---');
    const customer = await User.create({
      firstName: 'Karan',
      lastName: 'Mehra',
      email: `e2e_flight_${uniqueSuffix}@test.com`,
      phone: `98991${uniqueSuffix.toString().slice(-5)}`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    });

    const traveller = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mr',
      firstName: 'Karan',
      lastName: 'Mehra',
      gender: 'Male',
      dateOfBirth: new Date('1992-07-22'),
      email: customer.email,
      phone: customer.phone,
    });
    console.log(`✔ Created Customer: ${customer.email} (${customer._id})`);
    console.log(`✔ Created Traveller: ${traveller.firstName} ${traveller.lastName} (${traveller._id})`);

    // -------------------------------------------------------------
    // PHASE 2: Flight Booking Creation (Hold)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: Flight Booking Creation (Hold) ---');
    // Set cached FareQuote snapshot
    const cache = require('../utils/cache');
    await cache.set(
      `flight:farequote:${traceId}:RES_GDS_1`,
      {
        entries: [
          {
            srdvType: 'mock',
            resultIndex: 'RES_GDS_1',
            srdvIndex: '1',
            isLCC: false,
            fare: {
              BaseFare: 5000,
              Tax: 1000,
              OfferedFare: 6000,
            },
          },
        ],
        isGstMandatory: false,
      },
      600
    );

    const bookingResult = await bookFlightService({
      userId: customer._id,
      traceId,
      resultIndex: 'RES_GDS_1',
      passengers: [{ travellerId: traveller._id, isLeadPax: true }],
    });

    // Total Amount = 6000 + 10% markup (600) = 6600
    assert.strictEqual(bookingResult.totalAmount, 6600);
    assert.strictEqual(bookingResult.status, 'pending');
    console.log(`✔ Flight Hold Created: BookingId = ${bookingResult.bookingId}, PNR = ${bookingResult.pnr}`);
    console.log(`    Offered Fare: ₹6,000 | Maqam Markup: ₹600 | Total Price: ₹${bookingResult.totalAmount}`);

    // -------------------------------------------------------------
    // PHASE 3: Payment Capture via PayPal
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: Payment Order Creation & Capture ---');
    const paypalOrder = await paypalService.createPaymentOrder(customer._id, bookingResult.bookingId, 'flight');
    console.log(`✔ PayPal Order Created: ${paypalOrder.paypalOrderId}`);

    const captureResult = await paypalService.captureAndVerifyPayment(paypalOrder.paypalOrderId, customer._id);
    console.log(`✔ PayPal Payment Captured: Payment ID = ${captureResult.paymentId}, Status = ${captureResult.status}`);

    const paymentDoc = await Payment.findById(captureResult.paymentId);
    assert.strictEqual(paymentDoc.status, 'paid');
    assert.strictEqual(paymentDoc.amount, 6600);

    // -------------------------------------------------------------
    // PHASE 4: Background GDS Ticketing Worker Execution
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: GDS Worker E-Ticket Issuance ---');
    const workerResult = await processGDSTicketing(bookingResult.bookingId);
    assert.strictEqual(workerResult.status, 'confirmed');

    const confirmedFlightBooking = await FlightBooking.findById(bookingResult.bookingId);
    assert.strictEqual(confirmedFlightBooking.status, 'confirmed');
    assert.strictEqual(confirmedFlightBooking.passengers[0].ticketNumber, '098-9988776655');

    const masterBooking = await Booking.findOne({ itemId: bookingResult.bookingId });
    assert.ok(masterBooking);
    assert.strictEqual(masterBooking.status, 'confirmed');
    console.log(`✔ GDS Worker Issued E-Ticket: ${confirmedFlightBooking.passengers[0].ticketNumber}`);
    console.log(`✔ FlightBooking & Master Booking status = "confirmed"`);

    // -------------------------------------------------------------
    // PHASE 5: Pre-Cancellation Penalty & Refund Preview
    // -------------------------------------------------------------
    console.log('\n--- PHASE 5: Pre-Cancellation Quote Preview ---');
    const quote = await getCancellationChargesService({
      bookingId: bookingResult.bookingId,
      requestType: 1,
      userId: customer._id,
      isAdmin: false,
    });

    console.log('✔ Cancellation Financial Preview:');
    console.log(`    Total Paid by Customer:  ₹${quote.totalBookingAmount}`);
    console.log(`    Airline Cancellation Fee:-₹${quote.airlinePenalty}`);
    console.log(`    Maqam Retained Markup:   -₹${quote.agencyFee}`);
    console.log(`    Estimated Net Refund:    =₹${quote.expectedCustomerRefund}`);

    // Arithmetic: 6600 (Total) - 1500 (Airline penalty) - 600 (Markup fee) = 4500
    assert.strictEqual(quote.totalBookingAmount, 6600);
    assert.strictEqual(quote.airlinePenalty, 1500);
    assert.strictEqual(quote.agencyFee, 600);
    assert.strictEqual(quote.expectedCustomerRefund, 4500);

    // -------------------------------------------------------------
    // PHASE 6: Cancellation & Backend PayPal Refund Execution
    // -------------------------------------------------------------
    console.log('\n--- PHASE 6: Cancellation Execution & Backend Gateway Refund ---');
    const cancelResult = await cancelFlightBookingService({
      bookingId: bookingResult.bookingId,
      penaltyAmount: 1500,
      reason: 'Customer requested cancellation due to personal reasons',
      userId: customer._id,
      isAdmin: false,
    });

    console.log(`✔ Cancellation Message: ${cancelResult.message}`);
    console.log(`✔ Backend Gateway Refund Triggered: ${backendRefundCalled}`);
    console.log(`    PayPal Capture ID Target: ${backendRefundPayload.captureId}`);
    console.log(`    PayPal Refund Amount:     ₹${backendRefundPayload.amount}`);
    console.log(`    PayPal Gateway Refund ID: ${cancelResult.refund.gatewayRefundId}`);
    console.log(`    SRDV Change Request Ref:  ${cancelResult.refund.supplierRefundReference}`);

    assert.ok(backendRefundCalled);
    assert.strictEqual(backendRefundPayload.amount, 4500);
    assert.strictEqual(cancelResult.refund.customerRefundAmount, 4500);
    assert.strictEqual(cancelResult.refund.status, 'processed');

    // -------------------------------------------------------------
    // PHASE 7: Live Cancel Status & Supplier Wallet Sync
    // -------------------------------------------------------------
    console.log('\n--- PHASE 7: Live Cancel Status Polling & DB Sync ---');
    const cancelStatus = await getCancelStatusService({
      bookingId: bookingResult.bookingId,
      userId: customer._id,
      isAdmin: false,
    });

    console.log('✔ Live Supplier Cancellation Status Polled:');
    console.log(`    Refund Status:               ${cancelStatus.refundStatus}`);
    console.log(`    Airline Credit Status:       ${cancelStatus.changeRequestStatuses[0].refundStatus}`);
    console.log(`    Airline Refund Credited:     ₹${cancelStatus.changeRequestStatuses[0].refundAmount}`);
    console.log(`    Is Fully Processed by Airline: ${cancelStatus.isFullyProcessedByAirline}`);

    assert.strictEqual(cancelStatus.isFullyProcessedByAirline, true);
    assert.strictEqual(cancelStatus.changeRequestStatuses[0].cancelStatus, 'Cancelled');
    assert.strictEqual(cancelStatus.changeRequestStatuses[0].refundStatus, 'Processed');

    // -------------------------------------------------------------
    // PHASE 8: Final Database Integrity Check
    // -------------------------------------------------------------
    console.log('\n--- PHASE 8: Final Database State Verification ---');
    const finalFlightBooking = await FlightBooking.findById(bookingResult.bookingId);
    const finalMasterBooking = await Booking.findOne({ itemId: bookingResult.bookingId });
    const finalPayment = await Payment.findById(captureResult.paymentId);
    const finalRefund = await FlightRefund.findOne({ bookingId: bookingResult.bookingId });

    assert.strictEqual(finalFlightBooking.status, 'cancelled');
    assert.strictEqual(finalMasterBooking.status, 'cancelled');
    assert.strictEqual(finalPayment.status, 'partially_refunded');
    assert.strictEqual(finalPayment.totalRefunded, 4500);
    assert.strictEqual(finalRefund.status, 'processed');

    console.log('✔ Final DB Verification:');
    console.log(`    FlightBooking Status: ${finalFlightBooking.status}`);
    console.log(`    Master Booking Status: ${finalMasterBooking.status}`);
    console.log(`    Payment Status:       ${finalPayment.status} (Total Refunded: ₹${finalPayment.totalRefunded})`);
    console.log(`    FlightRefund Status:  ${finalRefund.status} (Gateway Ref: ${finalRefund.gatewayRefundId})`);

    // Restore mocks
    srdvClient.flightClient.post = originalPost;
    paypalClient.orders.create = originalPaypalOrderCreate;
    paypalClient.orders.capture = originalPaypalCapture;
    paypalClient.payments.refund = originalPaypalRefund;

    console.log('\n========================================================================');
    console.log('🎉 COMPLETE END-TO-END FLIGHT LIFECYCLE & REFUND TEST PASSED (100%)');
    console.log('========================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ FULL LIFECYCLE TEST FAILED:', error);
    srdvClient.flightClient.post = originalPost;
    paypalClient.orders.create = originalPaypalOrderCreate;
    paypalClient.orders.capture = originalPaypalCapture;
    paypalClient.payments.refund = originalPaypalRefund;
    process.exit(1);
  }
}

runFlightFullLifecycleTestSuite();
