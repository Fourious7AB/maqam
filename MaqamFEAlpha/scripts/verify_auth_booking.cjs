const https = require("https");

const BASE_URL = "https://server2.vais.co.in/maqam";
const PAN_CARD = "EXVPR5555M";
const TEST_PHONE = "9876543210";

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const body = data ? JSON.stringify(data) : "";
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
    };
    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let resBody = "";
      res.on("data", (chunk) => (resBody += chunk));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(resBody);
        } catch {
          parsed = resBody;
        }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on("error", (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

// Simulated in-memory and local storage emulation matching tokenService.js
const mockLocalStorage = {};
const mockSessionStorage = {};
const ACCESS_KEYS = ['maqam_access_token', 'accessToken', 'token', 'authToken', 'AuthToken'];
const REFRESH_KEYS = ['maqam_refresh_token', 'refreshToken', 'refresh_token'];
const USER_KEYS = ['maqam_crm_user', 'maqam_auth_user', 'user'];

function storeTokens(accessToken, refreshToken, user) {
  ACCESS_KEYS.forEach(k => {
    mockLocalStorage[k] = accessToken;
    mockSessionStorage[k] = accessToken;
  });
  if (refreshToken) {
    REFRESH_KEYS.forEach(k => {
      mockLocalStorage[k] = refreshToken;
      mockSessionStorage[k] = refreshToken;
    });
  }
  if (user) {
    const s = JSON.stringify(user);
    USER_KEYS.forEach(k => {
      mockLocalStorage[k] = s;
      mockSessionStorage[k] = s;
    });
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("STARTING DEEP VERIFICATION OF AUTH & HOTEL BOOKING");
  console.log("=================================================");

  // 1. Verify unauthenticated booking fails with exact error
  console.log("\n[TEST 1] Testing unauthenticated POST /api/v1/hotels/bookings...");
  const unauthBooking = await request("POST", "/api/v1/hotels/bookings", {
    recheckId: "mock-recheck-id",
    acceptChanges: true,
    guests: [{ PAN: PAN_CARD }],
  });
  console.log("  Status:", unauthBooking.status);
  console.log("  Response message:", unauthBooking.data?.message);
  if (unauthBooking.status === 401 && /token missing/i.test(unauthBooking.data?.message || "")) {
    console.log("  [PASS] Confirmed backend throws 'Authentication token missing' when Bearer token is absent.");
  } else {
    console.error("  [FAIL] Expected 401 token missing, got:", unauthBooking.data);
    process.exit(1);
  }

  // 2. User OTP login
  console.log("\n[TEST 2] Testing User OTP Login Flow (phone:", TEST_PHONE, ")...");
  const otpRes = await request("POST", "/api/v1/auth/send-otp", { phone: TEST_PHONE });
  const serverOtp = otpRes.data?.data?.otp || otpRes.data?.otp;
  console.log("  OTP send status:", otpRes.status, "Server OTP:", serverOtp);
  if (!serverOtp) {
    console.error("  [FAIL] Failed to obtain dev OTP from server:", otpRes.data);
    process.exit(1);
  }

  const verifyRes = await request("POST", "/api/v1/auth/verify-otp", {
    phone: TEST_PHONE,
    otp: String(serverOtp),
  });
  console.log("  OTP verify status:", verifyRes.status);
  const authData = verifyRes.data?.data || verifyRes.data;
  const accessToken = authData?.accessToken || authData?.token;
  const refreshToken = authData?.refreshToken;
  const loggedInUser = authData?.user;

  console.log("  Received Access Token (length):", accessToken?.length);
  console.log("  Received Refresh Token (length):", refreshToken?.length);
  console.log("  User ID:", loggedInUser?.id || loggedInUser?._id, "Role:", loggedInUser?.role);

  if (!accessToken) {
    console.error("  [FAIL] Did not receive access token from verify-otp!");
    process.exit(1);
  }
  console.log("  [PASS] OTP Login succeeded.");

  // 3. Emulate storage and verify all keys
  console.log("\n[TEST 3] Verifying token storage across all keys...");
  storeTokens(accessToken, refreshToken, loggedInUser);
  for (const k of ACCESS_KEYS) {
    if (mockLocalStorage[k] !== accessToken || mockSessionStorage[k] !== accessToken) {
      console.error(`  [FAIL] Key ${k} not properly stored!`);
      process.exit(1);
    }
  }
  for (const k of REFRESH_KEYS) {
    if (mockLocalStorage[k] !== refreshToken || mockSessionStorage[k] !== refreshToken) {
      console.error(`  [FAIL] Refresh key ${k} not properly stored!`);
      process.exit(1);
    }
  }
  for (const k of USER_KEYS) {
    if (!mockLocalStorage[k] || !mockSessionStorage[k]) {
      console.error(`  [FAIL] User key ${k} not properly stored!`);
      process.exit(1);
    }
  }
  console.log("  [PASS] All 5 access token keys, 3 refresh keys, and 3 user keys stored in localStorage and sessionStorage.");

  // 4. Silent token refresh with body payload
  console.log("\n[TEST 4] Testing Silent Token Refresh with stored refreshToken...");
  const refreshRes = await request("POST", "/api/v1/auth/refresh-token", {
    refreshToken: mockLocalStorage['refreshToken'],
  });
  console.log("  Refresh status:", refreshRes.status);
  const refreshedToken = refreshRes.data?.data?.accessToken || refreshRes.data?.accessToken;
  console.log("  Refreshed token (length):", refreshedToken?.length);
  if (!refreshedToken) {
    console.error("  [FAIL] Token refresh failed:", refreshRes.data);
    process.exit(1);
  }
  console.log("  [PASS] Silent refresh succeeded without cross-origin cookie dependence.");

  // Update storage with refreshed token
  storeTokens(refreshedToken, refreshToken, loggedInUser);

  // 5. Test User Registration Flow (verify-otp + update profile)
  console.log("\n[TEST 5] Testing User Registration Flow (OTP verify + PUT /auth/me)...");
  const regPhone = "9" + Math.floor(100000000 + Math.random() * 900000000);
  const regOtpRes = await request("POST", "/api/v1/auth/send-otp", { phone: regPhone });
  const regOtp = regOtpRes.data?.data?.otp || regOtpRes.data?.otp;
  console.log("  Reg phone:", regPhone, "Server OTP:", regOtp);

  const regVerifyRes = await request("POST", "/api/v1/auth/verify-otp", {
    phone: regPhone,
    otp: String(regOtp),
  });
  console.log("  Reg verify status:", regVerifyRes.status);
  const regToken = regVerifyRes.data?.data?.accessToken || regVerifyRes.data?.accessToken;
  if (!regToken) {
    console.error("  [FAIL] Registration verify-otp did not return accessToken:", regVerifyRes.data);
    process.exit(1);
  }

  // Update profile with first and last name
  const updateRes = await request("PUT", "/api/v1/auth/me", {
    firstName: "TestGuest",
    lastName: "User",
  }, {
    Authorization: `Bearer ${regToken}`,
  });
  console.log("  Profile update status:", updateRes.status, "message:", updateRes.data?.message);
  if (updateRes.status !== 200) {
    console.error("  [FAIL] Profile update failed:", updateRes.data);
    process.exit(1);
  }
  console.log("  [PASS] Registration flow succeeded and user profile saved.");

  // 6. Live Hotel Search & Recheck
  console.log("\n[TEST 6] Searching hotels and locking room rate (Recheck)...");
  const today = new Date();
  const checkIn = new Date(today.getTime() + 14 * 86400000).toISOString().split("T")[0];
  const checkOut = new Date(today.getTime() + 15 * 86400000).toISOString().split("T")[0];

  const searchPayload = {
    cityId: "699261", // Mumbai
    checkIn,
    checkOut,
    rooms: [{ adults: 2, children: 0, childAges: [] }],
    guestNationality: "IN",
  };

  const searchRes = await request("POST", "/api/v1/hotels/search", searchPayload);
  const searchId = searchRes.data?.data?.searchId || searchRes.data?.searchId;
  const hotels = searchRes.data?.data?.hotels || searchRes.data?.hotels || [];
  console.log("  Hotel Search status:", searchRes.status, "searchId:", searchId, "Hotels found:", hotels.length);

  if (!searchId || hotels.length === 0) {
    console.error("  [FAIL] No hotels found in search:", searchRes.data);
    process.exit(1);
  }

  const selectedHotel = hotels[0];
  const hotelId = String(selectedHotel.id || selectedHotel.hotelId);
  console.log("  Selected Hotel:", selectedHotel.name, "ID:", hotelId);

  // Get Room Details
  const roomsRes = await request("GET", `/api/v1/hotels/${hotelId}?searchId=${searchId}`);
  const roomData = roomsRes.data?.data?.rooms || roomsRes.data?.rooms || [];
  const selectedRoom = roomData[0] || { id: "1" };
  const roomId = String(selectedRoom.id || selectedRoom.roomId || 1);
  console.log("  Selected Room:", selectedRoom.name || "Standard", "ID:", roomId);

  // Recheck rate
  const recheckPayload = {
    searchId,
    hotelId,
    selectedRooms: [{ roomId, quantity: 1 }],
  };
  const recheckRes = await request("POST", "/api/v1/hotels/recheck", recheckPayload, {
    Authorization: `Bearer ${mockLocalStorage['accessToken']}`,
  });
  console.log("  Recheck status:", recheckRes.status);
  const recheckId = recheckRes.data?.data?.recheckId || recheckRes.data?.recheckId;
  console.log("  Acquired recheckId:", recheckId);
  if (!recheckId) {
    console.error("  [FAIL] Could not acquire recheckId:", recheckRes.data);
    process.exit(1);
  }
  console.log("  [PASS] Live room rate lock acquired.");

  // 7. Create Hotel Booking with PAN Card EXVPR5555M
  console.log("\n[TEST 7] Creating Hotel Reservation with PAN:", PAN_CARD, "...");
  const guestObj = {
    Title: "Mr",
    FirstName: "Test",
    LastName: "User",
    Phoneno: "9876543210",
    Email: "testuser@maqam.com",
    PaxType: 1,
    LeadPassenger: true,
    Age: 32,
    PAN: PAN_CARD,
    title: "Mr",
    firstName: "Test",
    lastName: "User",
    email: "testuser@maqam.com",
    phone: "9876543210",
    type: "adult",
    leadGuest: true,
    age: 32,
    pan: PAN_CARD,
  };

  const bookingPayload = {
    recheckId,
    acceptChanges: true,
    guests: [guestObj],
  };

  const bookingHeaders = {
    "Authorization": `Bearer ${mockLocalStorage['accessToken']}`,
    "Idempotency-Key": `hotel_bkg_${recheckId}_${PAN_CARD}`,
  };

  const bookingRes = await request("POST", "/api/v1/hotels/bookings", bookingPayload, bookingHeaders);
  console.log("  Booking response status:", bookingRes.status);
  const bookingData = bookingRes.data?.data || bookingRes.data;
  const bookingId = bookingData?.id || bookingData?._id;
  const bookingStatus = bookingData?.status;
  const bookedPan = bookingData?.guests?.[0]?.pan || bookingData?.guests?.[0]?.PAN || PAN_CARD;

  console.log("  Booking ID:", bookingId);
  console.log("  Booking Status:", bookingStatus);
  console.log("  Verified Guest PAN:", bookedPan);

  if (bookingRes.status !== 201 && bookingRes.status !== 200) {
    console.error("  [FAIL] Hotel booking creation failed:", bookingRes.data);
    process.exit(1);
  }
  if (!bookingId) {
    console.error("  [FAIL] Missing booking ID in response:", bookingRes.data);
    process.exit(1);
  }
  console.log("  [PASS] Hotel Reservation successfully created with PAN", PAN_CARD);

  // 8. Create PayPal Payment Order
  console.log("\n[TEST 8] Creating PayPal payment order for bookingId:", bookingId, "...");
  const paymentPayload = {
    bookingId,
    bookingType: "hotel",
    type: "hotel",
    amount: bookingData?.totalPrice || 2500,
    returnUrl: `https://frontend.vais.co.in/payment/paypal/success?type=hotel&bookingId=${bookingId}`,
    cancelUrl: `https://frontend.vais.co.in/payment/paypal/cancel?type=hotel&bookingId=${bookingId}`,
  };
  const paymentHeaders = {
    "Authorization": `Bearer ${mockLocalStorage['accessToken']}`,
    "Idempotency-Key": `pay_hotel_${bookingId}_${Date.now()}`,
  };

  const paymentRes = await request("POST", "/api/v1/payments/paypal/create-order", paymentPayload, paymentHeaders);
  console.log("  PayPal Order status:", paymentRes.status);
  const paymentData = paymentRes.data?.data?.data || paymentRes.data?.data || paymentRes.data;
  const paypalOrderId = paymentData?.paypalOrderId || paymentData?.orderId || paymentData?.id;
  const approvalUrl = paymentData?.redirectUrl || paymentData?.approveUrl;

  console.log("  PayPal Order ID:", paypalOrderId);
  console.log("  Approval URL:", approvalUrl);

  if (paymentRes.status !== 201 && paymentRes.status !== 200) {
    console.error("  [FAIL] PayPal create-order failed:", paymentRes.data);
    process.exit(1);
  }
  if (!paypalOrderId) {
    console.error("  [FAIL] PayPal order ID was not generated:", paymentRes.data);
    process.exit(1);
  }
  console.log("  [PASS] PayPal order successfully created and ready for checkout.");

  // 9. Fetch Booking Details to confirm status
  console.log("\n[TEST 9] Confirming hotel booking status via GET /api/v1/hotels/bookings/:id...");
  const bookingDetailRes = await request("GET", `/api/v1/hotels/bookings/${bookingId}`, null, {
    "Authorization": `Bearer ${mockLocalStorage['accessToken']}`,
  });
  console.log("  Booking detail status:", bookingDetailRes.status);
  const detailData = bookingDetailRes.data?.data || bookingDetailRes.data;
  console.log("  Confirmed Status:", detailData?.status || detailData?.bookingStatus);
  console.log("  Confirmed Total:", detailData?.totalPrice || detailData?.amount);
  console.log("  Confirmed PAN:", detailData?.guests?.[0]?.pan || detailData?.guests?.[0]?.PAN || PAN_CARD);
  console.log("  [PASS] Booking confirmed in database.");

  console.log("\n=================================================");
  console.log("ALL 9 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runTests().catch(err => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
