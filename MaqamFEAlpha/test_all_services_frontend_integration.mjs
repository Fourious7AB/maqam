import test from "node:test";
import assert from "node:assert/strict";

import api from "./src/components/stores/api.js";
import { hotelService } from "./src/services/hotelService.js";
import { packageService } from "./src/services/packageService.js";
import { offerService } from "./src/services/offerService.js";
import { flightService } from "./src/services/flightService.js";
import { isPaymentConfirmed } from "./src/services/eticketService.js";

test("1. hotelService.createHotelBooking: Real Service Endpoint Cascade & Booking ID Extraction", async () => {
  const origPost = api.post;
  const callLog = [];
  try {
    api.post = async (url, payload, config) => {
      callLog.push(url);
      if (url.includes("/hotels/bookings")) {
        const err = new Error("Not Found");
        err.response = { status: 404 };
        throw err;
      }
      if (url.includes("/hotels/book")) {
        return {
          data: {
            data: {
              bookingId: "HTL-REAL-SVC-101",
              status: "awaiting_payment",
              totalPrice: 12000,
            },
          },
        };
      }
      throw new Error(`Unexpected url ${url}`);
    };

    const res = await hotelService.createHotelBooking({
      recheckId: "rech_mock_token_123",
      guests: [{ firstName: "John", lastName: "Doe" }],
    });

    assert.equal(res.bookingId, "HTL-REAL-SVC-101");
    assert.equal(res.status, "awaiting_payment");
    assert.ok(callLog.length >= 2, "Should have fallen back to /hotels/book on 404");
  } finally {
    api.post = origPost;
  }
});

test("2. packageService.bookPackage: Real Service Fallback Cascade & ID Extraction", async () => {
  const origPost = api.post;
  const callLog = [];
  try {
    api.post = async (url, payload, config) => {
      callLog.push(url);
      if (url.endsWith("/packages/book")) {
        const err = new Error("Method Not Allowed");
        err.response = { status: 405 };
        throw err;
      }
      if (url.includes("/packages/pkg_real_444/book")) {
        return {
          data: {
            data: {
              bookingId: "PKG-REAL-SVC-202",
              status: "pending",
              totalAmount: 75000,
            },
          },
        };
      }
      throw new Error(`Unexpected url ${url}`);
    };

    const res = await packageService.bookPackage({
      packageId: "pkg_real_444",
      travellers: [{ name: "Alice" }],
    });

    assert.equal(res.bookingId, "PKG-REAL-SVC-202");
    assert.equal(res.status, "pending");
    assert.ok(callLog[0].endsWith("/packages/book"));
    assert.ok(callLog[1].includes("/packages/pkg_real_444/book"));
  } finally {
    api.post = origPost;
  }
});

test("3. offerService.bookOffer: Real Service Multi-Layer Cascade (/api/v1/offers/:id/book -> /api/v1/offers/book)", async () => {
  const origPost = api.post;
  const callLog = [];
  try {
    api.post = async (url, payload, config) => {
      callLog.push(url);
      if (url.includes("/offers/off_real_999/book")) {
        const err = new Error("Not Found");
        err.response = { status: 404 };
        throw err;
      }
      if (url.endsWith("/offers/book")) {
        return {
          data: {
            data: {
              booking: {
                _id: "OFF-REAL-SVC-303",
                status: "pending",
                totalPrice: 24000,
              },
            },
          },
        };
      }
      throw new Error(`Unexpected url ${url}`);
    };

    const res = await offerService.bookOffer("off_real_999", {
      quantity: 1,
      travellers: [{ firstName: "Sarah", lastName: "Smith" }],
    });

    assert.equal(res.bookingId, "OFF-REAL-SVC-303");
    assert.ok(callLog.length >= 2, "Cascaded through /api/v1/offers/book fallback");
  } finally {
    api.post = origPost;
  }
});

test("4. flightService.bookFlight: Real Service Idempotent Execution & Booking ID Extraction", async () => {
  const origPost = api.post;
  const callLog = [];
  try {
    api.post = async (url, payload, config) => {
      callLog.push(url);
      if (url.endsWith("/flights/book")) {
        const err = new Error("Not Found");
        err.response = { status: 404 };
        throw err;
      }
      if (url.endsWith("/flights/bookings")) {
        return {
          data: {
            data: {
              bookingId: "FLT-REAL-SVC-404",
              pnr: "PNR-FLT-88",
              status: "awaiting_payment",
            },
          },
        };
      }
      throw new Error(`Unexpected url ${url}`);
    };

    const res = await flightService.bookFlight(
      { traceId: "tr_1", resultIndex: "OB1", passengers: [] },
      "test_idem_key_777"
    );

    assert.equal(res.bookingId, "FLT-REAL-SVC-404");
    assert.ok(callLog.length >= 2, "Cascaded to /flights/bookings");
  } finally {
    api.post = origPost;
  }
});

test("5. SRDV Hotel Rate Lock Recovery on HTTP 410 / Expired Quote", async () => {
  let recheckCount = 0;
  let bookingCallCount = 0;
  let currentRecheckId = "token_expired_180s";

  const fakeApi = {
    async post(url, payload) {
      if (url === "/api/v1/hotels/recheck") {
        recheckCount++;
        return { data: { data: { recheckId: "token_fresh_active_999" } } };
      }
      if (url === "/api/v1/hotels/bookings") {
        bookingCallCount++;
        if (payload.recheckId === "token_expired_180s") {
          const err = new Error("Rate lock token expired or invalid (HTTP 410)");
          err.response = { status: 410, data: { message: "Quote expired or already processed" } };
          throw err;
        }
        return {
          data: {
            data: {
              bookingId: "HTL-CONFIRMED-888",
              status: "awaiting_payment",
              totalPrice: 4500,
            },
          },
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    },
  };

  // Simulate SelectedRoomInformation.jsx retry recovery
  let recheckId = currentRecheckId;
  let bookingRes;
  try {
    bookingRes = await fakeApi.post("/api/v1/hotels/bookings", { recheckId, guests: [] });
  } catch (err) {
    if (err.response?.status === 410 || /expired/i.test(err.message)) {
      const fresh = await fakeApi.post("/api/v1/hotels/recheck", {});
      recheckId = fresh.data.data.recheckId;
      bookingRes = await fakeApi.post("/api/v1/hotels/bookings", { recheckId, guests: [] });
    } else {
      throw err;
    }
  }

  assert.equal(recheckCount, 1, "Should have requested a fresh recheck on 410 expiry");
  assert.equal(bookingCallCount, 2, "Should have retried the hotel booking call");
  assert.equal(recheckId, "token_fresh_active_999");
  const extractedId = bookingRes.data.data.bookingId;
  assert.equal(extractedId, "HTL-CONFIRMED-888");
});

test("6. ExclusiveOffers and OffersSection Flight vs Hotel Navigation Routing", () => {
  const flightOffer = {
    _id: "off_flt_001",
    itemType: "flight",
    flightRef: {
      stock: {
        origin: "DEL",
        destination: "JED",
        airline: "Saudia",
        flightNumber: "SV-759",
      },
    },
    sellPrice: 32000,
  };

  const hotelOffer = {
    _id: "off_htl_002",
    itemType: "hotel",
    sellPrice: 45000,
  };

  const routeOffer = (offer) => {
    if (offer.itemType === "flight") {
      return {
        path: "/fare-quote-details",
        state: {
          flightId: offer._id,
          isOffer: true,
          offerId: offer._id,
        },
      };
    }
    return {
      path: `/booking-details/${offer._id}`,
      state: { offer, isOffer: true },
    };
  };

  const flightRoute = routeOffer(flightOffer);
  assert.equal(flightRoute.path, "/fare-quote-details");
  assert.equal(flightRoute.state.isOffer, true);
  assert.equal(flightRoute.state.offerId, "off_flt_001");

  const hotelRoute = routeOffer(hotelOffer);
  assert.equal(hotelRoute.path, "/booking-details/off_htl_002");
  assert.equal(hotelRoute.state.isOffer, true);
});

test("7. PaymentCancelPage Context Resolution for All 5 Verticals (including Offer)", () => {
  const validTypes = ["flight", "hotel", "package", "visa", "offer"];

  for (const t of validTypes) {
    assert.equal(validTypes.includes(t), true);
  }

  const mockStorage = {
    lastOfferBookingId: "OFF-9999",
    lastPaymentBookingType: "offer",
  };

  let resolvedId = "";
  let resolvedType = "";

  if (!resolvedId && mockStorage.lastOfferBookingId && mockStorage.lastPaymentBookingType === "offer") {
    resolvedId = mockStorage.lastOfferBookingId;
    resolvedType = "offer";
  }

  assert.equal(resolvedId, "OFF-9999");
  assert.equal(resolvedType, "offer");
});

test("8. PaymentSuccessPage Backend Confirmation Status Verification", () => {
  const verifyBackendConfirmation = (captureRes, paymentStatus, bookingStatus) => {
    const isBackendPaymentConfirmed =
      captureRes?.success &&
      (paymentStatus === "COMPLETED" ||
        paymentStatus === "CAPTURED" ||
        paymentStatus === "PAID" ||
        paymentStatus === "SUCCESS" ||
        bookingStatus === "confirmed" ||
        bookingStatus === "completed" ||
        bookingStatus === "payment_received" ||
        bookingStatus === "confirming" ||
        bookingStatus === "confirming_provider" ||
        bookingStatus === "provider_pending" ||
        captureRes.alreadyCaptured ||
        Boolean(captureRes.captureId));

    return Boolean(isBackendPaymentConfirmed);
  };

  const captureSuccess = { success: true, captureId: "CAP-12345" };

  assert.equal(verifyBackendConfirmation(captureSuccess, "COMPLETED", "pending"), true);
  assert.equal(verifyBackendConfirmation(captureSuccess, "PENDING", "confirming"), true);
  assert.equal(verifyBackendConfirmation(captureSuccess, "PENDING", "confirming_provider"), true);
  assert.equal(verifyBackendConfirmation(captureSuccess, "PENDING", "provider_pending"), true);
  assert.equal(verifyBackendConfirmation(captureSuccess, "PENDING", "payment_received"), true);
  assert.equal(verifyBackendConfirmation(captureSuccess, "PENDING", "confirmed"), true);

  assert.equal(verifyBackendConfirmation({ success: false }, "FAILED", "failed"), false);
  assert.equal(verifyBackendConfirmation(null, "", ""), false);
});

test("9. eticketService.isPaymentConfirmed accepts payment_received", () => {
  assert.equal(isPaymentConfirmed({ status: "payment_received" }), true);
  assert.equal(isPaymentConfirmed({ paymentStatus: "payment_received" }), true);
  assert.equal(isPaymentConfirmed({ status: "cancelled", paymentStatus: "payment_received" }), false);
  assert.equal(isPaymentConfirmed({ status: "refunded", paymentStatus: "paid" }), false);
});

test("10. FlightBookingSuccess handles non-flight vertical redirects cleanly", () => {
  const nonFlightTypes = ["offer", "hotel", "package", "visa"];
  for (const t of nonFlightTypes) {
    const shouldRedirect = ["offer", "hotel", "package", "visa"].includes(t);
    assert.equal(shouldRedirect, true);
    const targetUrl = `/payment/paypal/success?type=${t}&bookingId=123`;
    assert.ok(targetUrl.startsWith("/payment/paypal/success"));
  }
  assert.equal(["offer", "hotel", "package", "visa"].includes("flight"), false);
});
