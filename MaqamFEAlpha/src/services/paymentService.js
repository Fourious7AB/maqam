import api from "../components/stores/api.js";
import { PaymentAPI } from "../configs/api.js";
import { getAuthHeaders } from "../admin/services/tokenService.js";

// Concurrency mutex cache to avoid double-captures / duplicate requests during in-flight transport
const inFlightCaptures = new Map();

/**
 * Service for handling the 3-step PayPal payment lifecycle:
 * 1. Intent / Create Order: POST /api/v1/payments/paypal/create-order
 * 2. Customer Approval: Handled by PayPal checkout redirect
 * 3. Capture / Settlement: POST /api/v1/payments/paypal/capture
 */
export const paymentService = {
  /**
   * Step 1: Create PayPal payment order for any booking type.
   * @param {Object} options
   * @param {string} options.bookingId - Booking ID (_id or reference)
   * @param {"flight" | "hotel" | "package" | "visa"} options.bookingType - Type of booking
   * @param {number} [options.amount] - Total amount in INR/USD
   * @param {string} [options.returnUrl] - Optional custom return URL for approval
   * @param {string} [options.cancelUrl] - Optional custom cancel URL
   * @returns {Promise<{ success: boolean, redirectUrl: string, paypalOrderId: string, data: any }>}
   */
  async createPayPalOrder({ bookingId, bookingType, amount, returnUrl, cancelUrl }) {
    if (!bookingId || !/^[0-9a-fA-F]{24}$/.test(String(bookingId).trim())) {
      throw new Error(
        `A valid 24-character hexadecimal MongoDB bookingId is required to create a PayPal payment order. Received: ${bookingId}`
      );
    }
    const cleanBookingId = String(bookingId).trim();
    const cleanType = String(bookingType || "flight").toLowerCase();
    const idempotencyKey = `pay_${cleanType}_${cleanBookingId}_${Date.now()}`;

    const payload = {
      bookingId: cleanBookingId,
      bookingType: cleanType,
      type: cleanType,
      idempotencyKey,
    };
    if (amount !== undefined && amount !== null && !isNaN(Number(amount))) {
      payload.amount = Number(amount);
    }
    if (returnUrl) payload.returnUrl = returnUrl;
    if (cancelUrl) payload.cancelUrl = cancelUrl;

    const response = await api.post(
      PaymentAPI.PayPalCreateOrderApi,
      payload,
      {
        headers: {
          ...getAuthHeaders(),
          "Idempotency-Key": idempotencyKey,
        },
      }
    );

    const rawData = response?.data;
    const paymentData = rawData?.data?.data || rawData?.data || rawData || {};

    const redirectUrl =
      paymentData.redirectUrl ||
      paymentData.approveUrl ||
      paymentData.approvalUrl ||
      paymentData.links?.find?.((l) => l.rel === "approve" || l.rel === "payer-action")?.href ||
      rawData?.redirectUrl ||
      rawData?.approveUrl ||
      rawData?.approvalUrl ||
      rawData?.links?.find?.((l) => l.rel === "approve" || l.rel === "payer-action")?.href;

    const paypalOrderId =
      paymentData.paypalOrderId ||
      paymentData.orderId ||
      paymentData.id ||
      rawData?.paypalOrderId ||
      rawData?.orderId ||
      rawData?.id;

    if (!redirectUrl) {
      const errMsg =
        paymentData.message ||
        rawData?.message ||
        "PayPal approval URL was not returned by the server.";
      throw new Error(errMsg);
    }

    return {
      success: true,
      redirectUrl,
      paypalOrderId,
      data: paymentData,
    };
  },

  /**
   * Step 3: Capture and settle PayPal order once user approves on PayPal.
   * Pulls the actual money and triggers ensureBookingConfirmed() on the backend.
   * Deduplicates concurrent in-flight calls and caches captured status.
   * @param {string} orderId - PayPal Order ID (usually from 'token' or 'orderId' query param)
   * @param {Object} [options] - Optional context: { bookingId, bookingType }
   * @returns {Promise<{ success: boolean, captureId?: string, alreadyCaptured?: boolean, data: any }>}
   */
  async capturePayPalOrder(orderId, options = {}) {
    if (!orderId) {
      throw new Error("PayPal order ID is required for capture.");
    }

    const cleanOrderId = String(orderId).trim();

    // 1. Fast return if complete order details were already captured in this session
    const cachedData = paymentService.getCachedCaptureData(cleanOrderId);
    if (cachedData && (cachedData.booking || cachedData.bookingId)) {
      return {
        success: true,
        alreadyCaptured: true,
        captureId: cachedData.paypalCaptureId || cachedData.captureId || cleanOrderId,
        data: cachedData,
      };
    }

    // 2. Return existing in-flight promise if capture is currently running
    if (inFlightCaptures.has(cleanOrderId)) {
      return inFlightCaptures.get(cleanOrderId);
    }

    const idempotencyKey = `cap_${cleanOrderId}`;

    const capturePromise = (async () => {
      try {
        const captureHeaders = getAuthHeaders();

        // Resolve context bookingId & bookingType if not passed explicitly
        let resolvedBookingId = options?.bookingId;
        let resolvedBookingType = options?.bookingType || options?.type;
        if (!resolvedBookingType && typeof sessionStorage !== "undefined") {
          resolvedBookingType = sessionStorage.getItem("lastPaymentBookingType") || "";
        }

        if (!resolvedBookingId && typeof sessionStorage !== "undefined") {
          const cleanType = String(resolvedBookingType || "").toLowerCase();
          if (cleanType === "offer") {
            resolvedBookingId = sessionStorage.getItem("lastOfferBookingId") || "";
          } else if (cleanType === "flight") {
            resolvedBookingId = sessionStorage.getItem("lastFlightBookingId") || "";
          } else if (cleanType === "hotel") {
            resolvedBookingId = sessionStorage.getItem("lastHotelBookingId") || "";
          } else if (cleanType === "package") {
            resolvedBookingId = sessionStorage.getItem("lastPackageBookingId") || "";
          } else if (cleanType === "visa") {
            resolvedBookingId = sessionStorage.getItem("lastVisaBookingId") || "";
          }

          if (!resolvedBookingId) {
            resolvedBookingId =
              sessionStorage.getItem("lastOfferBookingId") ||
              sessionStorage.getItem("lastPackageBookingId") ||
              sessionStorage.getItem("lastFlightBookingId") ||
              sessionStorage.getItem("lastHotelBookingId") ||
              sessionStorage.getItem("lastVisaBookingId") ||
              "";
          }
        }

        const capturePayload = {
          orderId: cleanOrderId,
          paypalOrderId: cleanOrderId,
          token: cleanOrderId,
          idempotencyKey,
          ...(resolvedBookingId ? { bookingId: resolvedBookingId } : {}),
          ...(resolvedBookingType
            ? { bookingType: resolvedBookingType, type: resolvedBookingType }
            : {}),
        };

        const response = await api.post(
          PaymentAPI.PayPalCaptureApi,
          capturePayload,
          {
            headers: {
              ...captureHeaders,
              "Idempotency-Key": idempotencyKey,
            },
          }
        );

        const raw = response?.data;
        const data = raw?.data?.data || raw?.data || raw || {};

        const captureId =
          data.captureId ||
          data.paypalCaptureId ||
          data.id ||
          data.paymentId ||
          data.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
          raw?.captureId ||
          raw?.id;

        // Mark captured in sessionStorage with full payload
        paymentService.markOrderCaptured(cleanOrderId, data);

        return {
          success: true,
          captureId,
          data,
        };
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Payment capture failed.";

        // If backend reports the order is already captured or completed, treat gracefully as success
        if (
          /already\s+(captured|paid|settled|completed)/i.test(message) ||
          /ORDER_ALREADY_CAPTURED/i.test(message) ||
          err.response?.data?.status === "COMPLETED"
        ) {
          const fallbackData = err.response?.data?.data || err.response?.data || {};
          paymentService.markOrderCaptured(cleanOrderId, fallbackData);
          return {
            success: true,
            alreadyCaptured: true,
            captureId: fallbackData.paypalCaptureId || fallbackData.captureId || cleanOrderId,
            data: fallbackData,
          };
        }

        throw err;
      } finally {
        inFlightCaptures.delete(cleanOrderId);
      }
    })();

    inFlightCaptures.set(cleanOrderId, capturePromise);
    return capturePromise;
  },

  /**
   * Extracts PayPal Order ID from search params.
   * PayPal returns '?token=ORDER_XXXX&PayerID=YYYY' by default.
   */
  extractOrderId(searchParams) {
    if (!searchParams) return "";
    return (
      searchParams.get("token") ||
      searchParams.get("orderId") ||
      searchParams.get("paypalOrderId") ||
      ""
    );
  },

  /**
   * Checks whether payment was cancelled by customer on PayPal.
   */
  isPaymentCancelled(searchParams) {
    if (!searchParams) return false;
    return (
      searchParams.get("status") === "cancelled" ||
      searchParams.get("cancel") === "true" ||
      searchParams.get("canceled") === "true"
    );
  },

  /**
   * Checks whether payment failed.
   */
  isPaymentFailed(searchParams) {
    if (!searchParams) return false;
    return (
      searchParams.get("status") === "failed" ||
      Boolean(searchParams.get("error"))
    );
  },

  /**
   * Has this order already been captured locally in this session?
   */
  isOrderCaptured(orderId) {
    if (!orderId || typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(`maqam_captured_${orderId}`) === "true";
  },

  /**
   * Mark this order as captured locally in this session and cache result details.
   */
  markOrderCaptured(orderId, details = null) {
    if (!orderId || typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(`maqam_captured_${orderId}`, "true");
    if (details) {
      try {
        sessionStorage.setItem(`maqam_captured_data_${orderId}`, JSON.stringify(details));
      } catch {
        // Fallback if sessionStorage is full
      }
    }
  },

  /**
   * Retrieve cached capture details from session storage.
   */
  getCachedCaptureData(orderId) {
    if (!orderId || typeof sessionStorage === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(`maqam_captured_data_${orderId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Complete payment via POST /webhook/paypal
   * @param {Object} payload - PayPal webhook event payload
   */
  async completePayPalWebhook(payload = {}) {
    const response = await api.post(PaymentAPI.PayPalWebhookApi, payload, {
      headers: { "Content-Type": "application/json" },
    });
    if (payload?.orderId || payload?.resource?.id) {
      paymentService.markOrderCaptured(payload.orderId || payload.resource.id);
    }
    return response?.data;
  },

  /**
   * Resolve SRDV flight booking status via POST /api/v1/flights/callback
   * Handles Status: "Success" | "Failed" | "Aborted"
   * @param {Object} callbackPayload
   */
  async processFlightCallback(callbackPayload = {}) {
    const response = await api.post(
      PaymentAPI.FlightCallbackApi,
      callbackPayload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response?.data;
  },

  /**
   * Query Payment by PayPal Order ID
   * GET /api/v1/payments/paypal/order/:orderId
   * @param {string} orderId
   * @returns {Promise<Object>} Payment document
   */
  async getPaymentByOrderId(orderId) {
    if (!orderId) throw new Error("orderId is required");
    const response = await api.get(PaymentAPI.PayPalOrderApi(orderId), {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Query Payment by MongoDB ID
   * GET /api/v1/payments/paypal/:paymentId
   * @param {string} paymentId
   * @returns {Promise<Object>} Payment document
   */
  async getPaymentById(paymentId) {
    if (!paymentId) throw new Error("paymentId is required");
    const response = await api.get(PaymentAPI.PayPalPaymentApi(paymentId), {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Refund a captured payment
   * POST /api/v1/payments/paypal/:paymentId/refund
   * @param {string} paymentId
   * @param {Object} payload - { amount, reason }
   * @returns {Promise<Object>}
   */
  async refundPayment(paymentId, payload = {}) {
    if (!paymentId) throw new Error("paymentId is required");
    const response = await api.post(PaymentAPI.PayPalRefundApi(paymentId), payload, {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },
};

export default paymentService;
