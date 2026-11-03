import api from "../components/stores/api.js";
import { tokenService, getStoredAuthToken, getAuthHeaders, isTokenExpired } from "../admin/services/tokenService.js";

/**
 * Invoice Download & Viewing Service
 * Implements Strategy 1 (In-Memory Fetch & Blob Pipeline) from
 * the Maqam Travels Invoice Download API Specification & Integration Guide.
 *
 * Supported Dedicated Endpoints:
 * - Package Bookings: /api/v1/invoices/package/:bookingId/download
 * - Flight Bookings:  /api/v1/invoices/flight/:bookingId/download
 * - Hotel Bookings:   /api/v1/invoices/hotel/:bookingId/download
 */
export const invoiceService = {
  /**
   * Internal pipeline: Fetches official invoice attachment as Blob and extracts HTML text
   *
   * @param {Object} options
   * @param {'package'|'flight'|'hotel'|string} options.vertical - Booking vertical
   * @param {string} options.bookingId - Booking identifier (MongoDB _id, PNR, Booking Ref, or Provider ID)
   * @param {string} [options.token] - Optional JWT token override for dual-auth
   * @returns {Promise<{ success: boolean, filename: string, blob: Blob, blobUrl: string, html: string, vertical: string, bookingId: string }>}
   */
  async fetchInvoice({ vertical, bookingId, token }) {
    if (!bookingId || typeof bookingId !== "string" || !bookingId.trim()) {
      throw new Error("A valid booking reference or ID is required to generate the invoice.");
    }

    // 1. Normalize vertical
    let normalizedVertical = String(vertical || "flight").toLowerCase().trim();
    if (
      normalizedVertical.startsWith("hotel") ||
      normalizedVertical.includes("stay") ||
      normalizedVertical.includes("room")
    ) {
      normalizedVertical = "hotel";
    } else if (
      normalizedVertical.startsWith("package") ||
      normalizedVertical.includes("pkg") ||
      normalizedVertical.includes("tour") ||
      normalizedVertical.includes("umrah")
    ) {
      normalizedVertical = "package";
    } else {
      normalizedVertical = "flight";
    }

    const cleanBookingId = bookingId.trim();
    const rawToken =
      token ||
      getStoredAuthToken() ||
      tokenService.getAccessToken() ||
      tokenService.getRawStoredToken();

    const isStale = rawToken && typeof isTokenExpired === "function" && isTokenExpired(rawToken);
    const validToken = !isStale && rawToken ? rawToken : null;

    // 2. Dual-Authentication & Config
    // - Primary: Authorization: Bearer <token> (explicitly attached when valid)
    // - Secondary: Query parameter ?token=<token> fallback for backend invoiceAuth middleware
    const config = {
      responseType: "blob",
      headers: validToken
        ? getAuthHeaders({ Accept: "text/html, application/json" })
        : { Accept: "text/html, application/json" },
      params: validToken ? { token: validToken } : {},
    };

    const endpoint = `/api/v1/invoices/${normalizedVertical}/${encodeURIComponent(cleanBookingId)}/download`;

    let response;
    try {
      response = await api.get(endpoint, config);
    } catch (primaryErr) {
      // If primary canonical invoice endpoint fails, try vertical convenience routes
      if (normalizedVertical === "package") {
        const fallbackEndpoint = `/api/v1/packages/bookings/${encodeURIComponent(cleanBookingId)}/invoice/download`;
        try {
          response = await api.get(fallbackEndpoint, config);
        } catch {
          throw primaryErr;
        }
      } else if (normalizedVertical === "flight") {
        const fallbackEndpoint = `/api/v1/flights/bookings/${encodeURIComponent(cleanBookingId)}/invoice/download`;
        try {
          response = await api.get(fallbackEndpoint, config);
        } catch {
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }

    // 3. Defensive Anti-Corruption Validation Gate (Section 4.2)
    // Check if response is actually a JSON error message disguised in blob form
    const contentType =
      response?.headers?.["content-type"] ||
      response?.data?.type ||
      "";

    if (contentType.includes("application/json")) {
      let errorMessage = "Unable to generate invoice. Please try again later.";
      try {
        const text = await response.data.text();
        const json = JSON.parse(text);
        if (json?.message) errorMessage = json.message;
      } catch {
        // Fallback to default message
      }
      throw new Error(errorMessage);
    }

    // 4. Dynamic Filename Resolution
    let resolvedFilename = null;
    const disposition =
      response?.headers?.["content-disposition"] ||
      response?.headers?.get?.("content-disposition");

    if (disposition && typeof disposition === "string") {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      if (match && match[1]) {
        resolvedFilename = match[1].replace(/['"]/g, "").trim();
      }
    }

    if (!resolvedFilename) {
      const now = new Date();
      const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const suffix = cleanBookingId.slice(-6).toUpperCase();
      resolvedFilename = `MT-INV-${normalizedVertical.toUpperCase()}-${yyyymm}-${suffix}.html`;
    }

    // 5. In-Memory Blob Creation
    const blob = new Blob([response.data], { type: "text/html;charset=utf-8" });
    const blobUrl = window.URL.createObjectURL(blob);
    const html = await blob.text();

    return {
      success: true,
      filename: resolvedFilename,
      blob,
      blobUrl,
      html,
      vertical: normalizedVertical,
      bookingId: cleanBookingId,
    };
  },

  /**
   * Downloads official tax invoice and passenger receipt as a self-contained HTML document.
   *
   * @param {Object} options
   * @param {'package'|'flight'|'hotel'|string} options.vertical - Booking vertical
   * @param {string} options.bookingId - Booking identifier
   * @param {string} [options.token] - Optional JWT token override
   * @returns {Promise<{ success: boolean, filename: string, blob: Blob, blobUrl: string }>}
   */
  async downloadInvoice(options) {
    const result = await this.fetchInvoice(options);

    // Virtual DOM Trigger & Memory Lifecycle Management
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = result.blobUrl;
    downloadAnchor.setAttribute("download", result.filename);
    downloadAnchor.style.display = "none";
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    // Revoke Object URL after short delay to prevent memory leaks
    setTimeout(() => {
      window.URL.revokeObjectURL(result.blobUrl);
    }, 3500);

    return result;
  },

  /**
   * Retrieves official invoice HTML text and blobUrl for embedded previewing (CRM / User Modal).
   *
   * @param {Object} options
   * @param {'package'|'flight'|'hotel'|string} options.vertical - Booking vertical
   * @param {string} options.bookingId - Booking identifier
   * @param {string} [options.token] - Optional JWT token override
   * @returns {Promise<{ success: boolean, filename: string, html: string, blobUrl: string }>}
   */
  async getInvoiceHtml(options) {
    return this.fetchInvoice(options);
  },

  /**
   * Directly opens the rendered HTML invoice in a new browser tab for immediate viewing or printing.
   *
   * @param {Object} options
   * @returns {Promise<Window>}
   */
  async openInvoiceInNewTab(options) {
    const result = await this.fetchInvoice(options);
    const newWindow = window.open(result.blobUrl, "_blank");
    return newWindow;
  },
};

export default invoiceService;
