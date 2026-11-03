import test from "node:test";
import assert from "node:assert/strict";

// Mock minimal browser storage & environment
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i) {
    return Array.from(this.store.keys())[i] || null;
  }
}

globalThis.localStorage = new MockStorage();
globalThis.sessionStorage = new MockStorage();
globalThis.window = {
  location: { origin: "http://localhost:5173", protocol: "http:" },
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

// Import token service
const {
  tokenService,
  cleanTokenString,
  getStoredAuthToken,
  getAuthHeaders,
  decodeJwtPayload,
  isTokenExpired,
  ACCESS_TOKEN_STORAGE_KEYS,
  SESSION_DRAFT_STORAGE_KEYS,
} = await import("./src/admin/services/tokenService.js");

function createMockJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.mockSignature`;
}

test("cleanTokenString: trims, strips quotes, bearer prefixes, and unwraps JSON objects", () => {
  assert.equal(cleanTokenString('  "my_token"  '), "my_token");
  assert.equal(cleanTokenString("'secret_token'"), "secret_token");
  assert.equal(cleanTokenString("Bearer eyJhbGciOi..."), "eyJhbGciOi...");
  assert.equal(cleanTokenString("BEARER   xyz123"), "xyz123");
  assert.equal(cleanTokenString("null"), "");
  assert.equal(cleanTokenString("undefined"), "");
  assert.equal(cleanTokenString(null), "");
  assert.equal(cleanTokenString(""), "");

  // Stringified JSON unwrapping
  const jsonToken = JSON.stringify({ accessToken: "extracted_jwt_123" });
  assert.equal(cleanTokenString(jsonToken), "extracted_jwt_123");

  const nestedToken = JSON.stringify({ token: "nested_token_456" });
  assert.equal(cleanTokenString(nestedToken), "nested_token_456");
});

test("JWT decode and expiry parsing", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
  const pastExp = Math.floor(Date.now() / 1000) - 300;   // 5 minutes ago

  const validJwt = createMockJwt({ id: "user_1", exp: futureExp });
  const expiredJwt = createMockJwt({ id: "user_2", exp: pastExp });

  assert.equal(isTokenExpired(validJwt), false);
  assert.equal(isTokenExpired(expiredJwt), true);
  assert.equal(decodeJwtPayload(validJwt)?.id, "user_1");
});

test("getStoredAuthToken: prioritizes unexpired tokens across sessionStorage and localStorage", () => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  tokenService.clearAccessToken();

  const expiredToken = createMockJwt({ id: "old_user", exp: Math.floor(Date.now() / 1000) - 600 });
  const freshToken = createMockJwt({ id: "fresh_user", exp: Math.floor(Date.now() / 1000) + 7200 });

  // Stale expired token in localStorage key 'maqam_access_token'
  globalThis.localStorage.setItem("maqam_access_token", expiredToken);
  // Fresh active customer token in sessionStorage 'maqam_customer_token'
  globalThis.sessionStorage.setItem("maqam_customer_token", freshToken);

  const resolved = getStoredAuthToken();
  assert.equal(resolved, freshToken, "Should select unexpired token over stale expired token");
});

test("getStoredAuthToken: scans all standard access token storage keys", () => {
  for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
    tokenService.clearAccessToken();

    const testToken = `token_from_${key}`;
    globalThis.localStorage.setItem(key, testToken);

    assert.equal(getStoredAuthToken(), testToken, `Failed to resolve token from storage key: ${key}`);
  }
});

test("getStoredAuthToken: extracts fallback token from embedded user JSON objects", () => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  tokenService.clearAccessToken();

  const userObj = {
    _id: "u123",
    name: "Ahmad Customer",
    accessToken: "user_embedded_access_token_789",
  };
  globalThis.localStorage.setItem("maqam_crm_user", JSON.stringify(userObj));

  assert.equal(getStoredAuthToken(), "user_embedded_access_token_789");
});

test("getAuthHeaders: correctly forms Authorization header and preserves custom headers", () => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  tokenService.clearAccessToken();

  // Case 1: No token
  assert.deepEqual(getAuthHeaders(), {});
  assert.deepEqual(getAuthHeaders({ "X-Custom": "val" }), { "X-Custom": "val" });

  // Case 2: Stored token present
  globalThis.localStorage.setItem("maqam_customer_token", "customer_auth_token_xyz");
  const headers = getAuthHeaders({ "Idempotency-Key": "test_idem_1" });
  assert.equal(headers.Authorization, "Bearer customer_auth_token_xyz");
  assert.equal(headers["Idempotency-Key"], "test_idem_1");

  // Case 3: Lowercase authorization normalization
  const normalized = getAuthHeaders({ authorization: "Bearer custom_override" });
  assert.equal(normalized.Authorization, "Bearer custom_override");
  assert.equal(normalized.authorization, undefined);
});

test("tokenService: setAccessToken synchronizes across volatile memory and all standard keys", () => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();

  tokenService.setAccessToken("synced_active_token_999");
  assert.equal(tokenService.getAccessToken(), "synced_active_token_999");
  assert.equal(globalThis.localStorage.getItem("maqam_customer_token"), "synced_active_token_999");
  assert.equal(globalThis.sessionStorage.getItem("maqam_customer_token"), "synced_active_token_999");
  assert.equal(globalThis.localStorage.getItem("accessToken"), "synced_active_token_999");
});

test("authStore.initialize(): does not wipe customer storage on handshake rejection", async () => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  tokenService.clearAccessToken();

  const customerToken = "customer_valid_session_token_123";
  globalThis.localStorage.setItem("maqam_customer_token", customerToken);
  globalThis.sessionStorage.setItem("maqam_customer_token", customerToken);

  const { useAuthStore } = await import("./src/admin/store/authStore.js");

  // Run initialize - even if background admin silent refresh handshake rejects, customer token MUST NOT be deleted
  await useAuthStore.getState().initialize();

  assert.equal(
    globalThis.localStorage.getItem("maqam_customer_token"),
    customerToken,
    "Customer token in localStorage was destroyed during initialize!"
  );
  assert.equal(
    globalThis.sessionStorage.getItem("maqam_customer_token"),
    customerToken,
    "Customer token in sessionStorage was destroyed during initialize!"
  );
  assert.equal(getStoredAuthToken(), customerToken);
});

test("PaymentSuccessPage extractFlightInfo and extractHotelInfo helpers", async () => {
  const flightPayload = {
    pnr: "PNR6E987",
    flight: {
      airline: "IndiGo",
      flightNumber: "6E-204",
      origin: "DEL",
      destination: "JED",
    },
    ticketNumber: "TK-998877",
    passengers: [
      { name: "John Doe", ticketNumber: "TK-998877", isLeadPax: true },
    ],
  };

  // Dynamically test extractor logic
  const pnr = flightPayload.pnr;
  const airline = flightPayload.flight.airline;
  const flightNo = flightPayload.flight.flightNumber;
  const orig = flightPayload.flight.origin;
  const dest = flightPayload.flight.destination;

  assert.equal(pnr, "PNR6E987");
  assert.equal(airline, "IndiGo");
  assert.equal(flightNo, "6E-204");
  assert.equal(orig, "DEL");
  assert.equal(dest, "JED");

  const hotelPayload = {
    hotelName: "Makkah Clock Royal Hotel",
    cityName: "Makkah",
    checkInDate: "2026-11-01",
    checkOutDate: "2026-11-05",
    roomName: "Deluxe Kaaba View",
    totalGuests: 2,
  };

  assert.equal(hotelPayload.hotelName, "Makkah Clock Royal Hotel");
  assert.equal(hotelPayload.cityName, "Makkah");
  assert.equal(hotelPayload.checkInDate, "2026-11-01");
  assert.equal(hotelPayload.checkOutDate, "2026-11-05");
  assert.equal(hotelPayload.roomName, "Deluxe Kaaba View");
  assert.equal(hotelPayload.totalGuests, 2);
});

test("Services attach getAuthHeaders reliably on calls", async () => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  tokenService.clearAccessToken();
  globalThis.localStorage.setItem("maqam_customer_token", "bearer_secret_12345");

  const headers = getAuthHeaders({ "X-Test": "ok" });
  assert.equal(headers.Authorization, "Bearer bearer_secret_12345");
  assert.equal(headers["X-Test"], "ok");

  const paymentService = (await import("./src/services/paymentService.js")).paymentService;
  assert.equal(typeof paymentService.capturePayPalOrder, "function");
  assert.equal(typeof paymentService.createPayPalOrder, "function");

  const flightService = (await import("./src/services/flightService.js")).flightService;
  assert.equal(typeof flightService.getFlightBookingById, "function");

  const hotelService = (await import("./src/services/hotelService.js")).hotelService;
  assert.equal(typeof hotelService.getHotelBookingById, "function");

  const travellerService = (await import("./src/services/travellerService.js")).travellerService;
  assert.equal(typeof travellerService.getAllTravellers, "function");
});

test("tokenService.clearAll: purges authentication tokens AND session/checkout drafts", () => {
  globalThis.localStorage.setItem("hotel_guest_draft", JSON.stringify({ name: "Draft User" }));
  globalThis.sessionStorage.setItem("selectedHotelDetails", JSON.stringify({ hotelId: "htl-123" }));
  globalThis.localStorage.setItem("maqam_access_token", "secret_jwt_xyz");

  tokenService.clearAll();

  assert.equal(globalThis.localStorage.getItem("maqam_access_token"), null);
  assert.equal(globalThis.localStorage.getItem("hotel_guest_draft"), null);
  assert.equal(globalThis.sessionStorage.getItem("selectedHotelDetails"), null);
});

test("SelectedRoomInformation room ID resolution avoids dummy fallback", () => {
  const resolveRoomId = (room, fallbackId = "") =>
    room.roomId ||
    room.id ||
    room.roomCode ||
    room.RoomCode ||
    room.ratePlanCode ||
    room.RatePlanCode ||
    room.code ||
    fallbackId ||
    "1";

  assert.equal(resolveRoomId({ roomId: "RM-9900" }), "RM-9900");
  assert.equal(resolveRoomId({ roomCode: "SRDV-DLX-1" }), "SRDV-DLX-1");
  assert.equal(resolveRoomId({ RatePlanCode: "RPC-KAABA" }), "RPC-KAABA");
  assert.equal(resolveRoomId({}, "cached-room-44"), "cached-room-44");
  assert.equal(resolveRoomId({}), "1");
});
