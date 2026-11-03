/**
 * Resolves the API Base URL from environment variables.
 * Priority:
 *   1. VITE_API_BASE_URL (standard)
 *   2. VITE_API_URL (alias)
 *   3. VITE_API_URL_S (legacy alias)
 *
 * Trailing slashes and surrounding quotes are sanitized.
 * If unset or empty, returns empty string ("") to allow relative routing via Vite proxy.
 */
export const getApiBaseUrl = () => {
  const env = import.meta.env || {};
  const isHttpsOrigin = typeof window !== "undefined" && window.location.protocol === "https:";
  const useDevProxy = String(env.VITE_USE_DEV_API_PROXY ?? "").toLowerCase() === "true";

  // In local development with proxy mode enabled, return empty string so all
  // endpoints construct relative paths (e.g. /api/v1/flights/book).
  // These requests are routed through the Vite dev server proxy (same-origin),
  // which completely eliminates CORS preflight and Referrer Policy header blocks.
  if (useDevProxy && !isHttpsOrigin) {
    return "";
  }

  const rawUrl =
    env.VITE_API_BASE_URL ??
    env.VITE_API_URL ??
    env.VITE_API_URL_S ??
    "https://server2.vais.co.in/maqam";

  const sanitized = String(rawUrl)
    .trim()
    .replace(/^["']|["']$/g, "")
    .split(/[\s|#-]/)[0]
    .trim()
    .replace(/\/+$/, "");

  // On HTTPS origin (e.g. Vercel deployment https://...):
  // Prevent browser Mixed Content blocking by upgrading or falling back
  // to production HTTPS API if the configured URL is insecure or LAN-only.
  if (isHttpsOrigin) {
    const isPrivateOrInsecure =
      !sanitized ||
      sanitized.startsWith("http://") ||
      /^(http:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|localhost|127\.0\.0\.1)/i.test(sanitized);

    if (isPrivateOrInsecure) {
      return "https://server2.vais.co.in/maqam";
    }
  }

  return sanitized || "https://server2.vais.co.in/maqam";
};

export const BASE_URL = getApiBaseUrl();
export const API_BASE_URL = BASE_URL;

export const SearchAPI = {
  SearchApi: `${BASE_URL}/api/v1/hotels`,
  SearchAllDataApi: `${BASE_URL}/api/v1/hotels/search`,
};

export const HotelDetailsAPI = {
  HotelDetailsApi: `${BASE_URL}/api/v1/hotels`,
  HotelSearchApi: `${BASE_URL}/api/v1/hotels/search`,
  HotelRoomAvailabilityApi: `${BASE_URL}/api/v1/hotels/recheck`,
  HotelRoomPreorderApi: `${BASE_URL}/api/v1/hotels/bookings`,
  HotelBookApi: `${BASE_URL}/api/v1/hotels/book`,
  HotelBookingsApi: `${BASE_URL}/api/v1/hotels/bookings`,
  HotelRoomAllDataApi: `${BASE_URL}/api/v1/hotels`,
  CitiesApi: `${BASE_URL}/api/v1/hotels/cities`,
  HotelBookingsMeApi: `${BASE_URL}/api/v1/hotels/bookings/me`,
  HotelBookingDetailApi: (id) => `${BASE_URL}/api/v1/hotels/bookings/${id}`,
  HotelCancelApi: (id) => `${BASE_URL}/api/v1/hotels/bookings/${id}/cancel`,
};

export const UserAPI = {
  UserRegisterApi: `${BASE_URL}/api/v1/auth/register`,
  UserLoginApi: `${BASE_URL}/api/v1/auth/login`,
  UserProfileApi: `${BASE_URL}/api/v1/auth/me`,
  UserForgetPasswordApi: `${BASE_URL}/api/v1/auth/forgot-password`,
  UserResetPasswordApi: `${BASE_URL}/api/v1/auth/reset-password`,
  userUpdateProfileApi: `${BASE_URL}/api/v1/auth/me`,
  userDeleteAccountApi: (permanent = false) =>
    `${BASE_URL}/api/v1/auth/me${permanent ? "?permanent=true" : ""}`,
  userEnquiryApi: `${BASE_URL}/api/v1/account/traveller`,
};

export const TravellerAPI = {
  GetAll: `${BASE_URL}/api/v1/account/traveller/getAll`,
  GetById: (id) => `${BASE_URL}/api/v1/account/traveller/${id}`,
  Create: `${BASE_URL}/api/v1/account/traveller/create`,
  CreateAlt: `${BASE_URL}/api/v1/account/traveller/create`,
  Update: (id) => `${BASE_URL}/api/v1/account/traveller/${id}`,
  Delete: (id) => `${BASE_URL}/api/v1/account/traveller/${id}`,
};

export const FlightAPI = {
  FlightAirportsApi: `${BASE_URL}/api/v1/flights/airports`,
  FlightAirlineApi: `${BASE_URL}/api/v1/flights/airline`,
  FlightSearchApi: `${BASE_URL}/api/v1/flights/search`,
  FlightCalendarFareApi: `${BASE_URL}/api/v1/flights/calendar-fare`,
  FlightFareQuoteApi: `${BASE_URL}/api/v1/flights/farequote`,
  FlightSeatMapApi: `${BASE_URL}/api/v1/flights/seatmap`,
  FlightSsrApi: `${BASE_URL}/api/v1/flights/ssr`,
  FlightBookApi: `${BASE_URL}/api/v1/flights/book`,
  FlightCallbackApi: `${BASE_URL}/api/v1/flights/callback`,
  FlightBookingsApi: `${BASE_URL}/api/v1/flights/bookings`,
  FlightBookingDetailApi: (id) => `${BASE_URL}/api/v1/flights/bookings/${id}`,
  FlightCancellationChargesApi: (id) => `${BASE_URL}/api/v1/flights/bookings/${id}/cancellation-charges`,
  FlightChangeRequestApi: (id) => `${BASE_URL}/api/v1/flights/bookings/${id}/change-request`,
  FlightCancelStatusApi: (id) => `${BASE_URL}/api/v1/flights/bookings/${id}/cancel-status`,
  FlightCancelApi: (id) => `${BASE_URL}/api/v1/flights/bookings/${id}/cancel`,
};

export const VisaAPI = {
  UserVisasCatalogApi: `${BASE_URL}/api/v1/visa/user/visas`,
  UserApplicationsApi: `${BASE_URL}/api/v1/visa/user/applications`,
  UserGroupsApi: `${BASE_URL}/api/v1/visa/user/groups`,
  UserSingleGroupApi: (id) => `${BASE_URL}/api/v1/visa/user/groups/${id}`,
  UserAddApplicantApi: (id) =>
    `${BASE_URL}/api/v1/visa/user/groups/${id}/applicants`,
  UserSingleApplicationApi: (id) =>
    `${BASE_URL}/api/v1/visa/user/applications/${id}`,
  UserUploadDocumentApi: (id, docType) =>
    `${BASE_URL}/api/v1/visa/user/applications/${id}/documents/${docType}`,
};

export const LeadAPI = {
  CreateLeadApi: `${BASE_URL}/api/v1/ops-crm/leads`,
};

export const BookingAPI = {
  BookingsApi: `${BASE_URL}/api/v1/crm/bookings`,
  CustomerBookingsApi: `${BASE_URL}/api/v1/bookings`,
  CustomerBookingDetailApi: (id) => `${BASE_URL}/api/v1/bookings/${id}`,
  CustomerBookingCancelApi: (id) => `${BASE_URL}/api/v1/bookings/${id}/cancel`,
};

export const AuthAPI = {
  RegisterApi: `${BASE_URL}/api/v1/auth/register`,
  LoginApi: `${BASE_URL}/api/v1/auth/login`,
  SendOtpApi: `${BASE_URL}/api/v1/auth/send-otp`,
  VerifyOtpApi: `${BASE_URL}/api/v1/auth/verify-otp`,
  RefreshTokenApi: `${BASE_URL}/api/v1/auth/refresh-token`,
  LogoutApi: `${BASE_URL}/api/v1/auth/logout`,
  MeApi: `${BASE_URL}/api/v1/auth/me`,
  UpdateProfileApi: `${BASE_URL}/api/v1/auth/me`,
  DeleteAccountApi: (permanent = false) =>
    `${BASE_URL}/api/v1/auth/me${permanent ? "?permanent=true" : ""}`,
  ForgotPasswordApi: `${BASE_URL}/api/v1/auth/forgot-password`,
  ResetPasswordApi: (token) => `${BASE_URL}/api/v1/auth/reset-password/${token}`,
};

export const getInstructorBaseUrl = () => {
  const env = import.meta.env || {};
  const instructorUrl =
    env.VITE_INSTRUCTOR_API_URL ?? env.VITE_INSTRUCTOR_URL ?? "";
  if (instructorUrl) {
    return String(instructorUrl)
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim()
      .replace(/\/+$/, "");
  }
  return getApiBaseUrl();
};

export const INSTRUCTOR_BASE_URL = getInstructorBaseUrl();

export const GuideAPI = {
  CategoriesApi: `${INSTRUCTOR_BASE_URL}/api/v1/instructor/categories`,
  GuidesApi: `${INSTRUCTOR_BASE_URL}/api/v1/instructor`,
  GuideProfileApi: (id) => `${INSTRUCTOR_BASE_URL}/api/v1/instructor/${id}`,
  GuideSlotsApi: (id) => `${INSTRUCTOR_BASE_URL}/api/v1/instructor/${id}/slots`,
  GuideReviewsApi: (id) =>
    `${INSTRUCTOR_BASE_URL}/api/v1/instructor/${id}/reviews`,
};

export const PackageAPI = {
  PackagesApi: `${BASE_URL}/api/v1/packages`,
  PackageDetailApi: (id) => `${BASE_URL}/api/v1/packages/${id}`,
  PackageQuoteApi: (id) => `${BASE_URL}/api/v1/packages/${id}/quote`,
  PackageBookApi: `${BASE_URL}/api/v1/packages/book`,
  PackageBookingsApi: `${BASE_URL}/api/v1/packages/bookings`,
  PackageBookByIdApi: (id) => `${BASE_URL}/api/v1/packages/${id}/book`,
  PackageCancelApi: (id) => `${BASE_URL}/api/v1/packages/bookings/${id}/cancel`,
  PackageBookingApi: (id) => `${BASE_URL}/api/v1/packages/bookings/${id}`,
  PackageUserBookingsApi: `${BASE_URL}/api/v1/packages/getAllBookingPackage`,
  OffersApi: `${BASE_URL}/api/v1/offers`,
  OfferDetailApi: (id) => `${BASE_URL}/api/v1/offers/${id}`,
};

export const OfferAPI = {
  OffersApi: `${BASE_URL}/api/v1/offers`,
  OfferDetailApi: (id) => `${BASE_URL}/api/v1/offers/${id}`,
  OfferBookApi: (id) => `${BASE_URL}/api/v1/offers/${id}/book`,
  OfferBookDirectApi: `${BASE_URL}/api/v1/offers/book`,
  OfferBookingsApi: `${BASE_URL}/api/v1/offers/bookings`,
  OfferBookingApi: (id) => `${BASE_URL}/api/v1/offers/bookings/${id}`,
  OfferCancelApi: (id) => `${BASE_URL}/api/v1/offers/bookings/${id}/cancel`,
};

export const PaymentAPI = {
  PayPalCreateOrderApi: `${BASE_URL}/api/v1/payments/paypal/create-order`,
  PayPalCaptureApi: `${BASE_URL}/api/v1/payments/paypal/capture`,
  PayPalOrderApi: (orderId) => `${BASE_URL}/api/v1/payments/paypal/order/${orderId}`,
  PayPalPaymentApi: (paymentId) => `${BASE_URL}/api/v1/payments/paypal/${paymentId}`,
  PayPalRefundApi: (paymentId) => `${BASE_URL}/api/v1/payments/paypal/${paymentId}/refund`,
  PayPalWebhookApi: `${BASE_URL}/webhook/paypal`,
  FlightCallbackApi: `${BASE_URL}/api/v1/flights/callback`,
};

export const ETicketAPI = {
  LiveFlightETicketApi: (bookingId) => `${BASE_URL}/api/v1/flights/bookings/${bookingId}/eticket`,
  LiveFlightETicketDownloadApi: (bookingId) => `${BASE_URL}/api/v1/flights/bookings/${bookingId}/eticket/download`,
  OfferFlightETicketApi: (id) => `${BASE_URL}/api/v1/offers/bookings/${id}/eticket`,
  OfferFlightETicketDownloadApi: (id) => `${BASE_URL}/api/v1/offers/bookings/${id}/eticket/download`,
  PackageFlightETicketApi: (id) => `${BASE_URL}/api/v1/packages/bookings/${id}/eticket`,
  PackageFlightETicketDownloadApi: (id) => `${BASE_URL}/api/v1/packages/bookings/${id}/eticket/download`,
  CentralizedLiveETicketApi: (bookingId) => `${BASE_URL}/api/v1/eticket/live/${bookingId}`,
  CentralizedOfferETicketApi: (id) => `${BASE_URL}/api/v1/eticket/inhouse/offer/${id}`,
  CentralizedPackageETicketApi: (id) => `${BASE_URL}/api/v1/eticket/inhouse/package/${id}`,
  VerifyETicketApi: (pnr, lastName) =>
    `${BASE_URL}/api/v1/eticket/verify?pnr=${encodeURIComponent(pnr)}&lastName=${encodeURIComponent(lastName)}`,
};

export const getAiBaseUrl = () => {
  const env = import.meta.env || {};
  const isHttpsOrigin = typeof window !== "undefined" && window.location.protocol === "https:";
  const useDevProxy = String(env.VITE_USE_DEV_API_PROXY ?? "").toLowerCase() === "true";
  if (useDevProxy && !isHttpsOrigin) {
    return "";
  }
  const aiUrl = env.VITE_AI_API_URL ?? "https://server2.vais.co.in/maqam";
  if (aiUrl) {
    return String(aiUrl)
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim()
      .replace(/\/+$/, "");
  }
  return "";
};

export const AI_BASE_URL = getAiBaseUrl();

export const AIApi = {
  ChatApi: `${AI_BASE_URL}/api/v1/ai/chat`,
};

export const QuoteAPI = {
  RequestQuoteApi: `${BASE_URL}/api/v1/quotes/request`,
  TrackQuoteApi: `${BASE_URL}/api/v1/quotes/track`,
  MyQuotesApi: `${BASE_URL}/api/v1/quotes/my`,
  MyQuoteDetailApi: (id) => `${BASE_URL}/api/v1/quotes/my/${id}`,
  MyQuoteRespondApi: (id) => `${BASE_URL}/api/v1/quotes/my/${id}/respond`,
  CrmQuotesApi: `${BASE_URL}/api/v1/crm/quotes`,
  CrmQuoteDetailApi: (id) => `${BASE_URL}/api/v1/crm/quotes/${id}`,
  CrmQuoteAssignApi: (id) => `${BASE_URL}/api/v1/crm/quotes/${id}/assign`,
  CrmQuoteSendApi: (id) => `${BASE_URL}/api/v1/crm/quotes/${id}/send`,
};

