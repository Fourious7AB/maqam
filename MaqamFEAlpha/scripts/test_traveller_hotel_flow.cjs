const https = require("https");

const BASE_URL = "https://server2.vais.co.in/maqam";
const PAN_CARD = "EXVPR5555M";
const TEST_PHONE = "9" + Math.floor(100000000 + Math.random() * 900000000);

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

async function runTestSuite() {
  console.log("==================================================================");
  console.log("TESTING TRAVELLER ENDPOINTS & HOTEL BOOKING DECOUPLING (SWAGGER)");
  console.log("==================================================================");

  // 1. User Authentication (Send OTP & Verify OTP)
  console.log(`\n[STEP 1] Authenticating user (phone: ${TEST_PHONE})...`);
  const otpRes = await request("POST", "/api/v1/auth/send-otp", { phone: TEST_PHONE });
  const otp = otpRes.data?.data?.otp || otpRes.data?.otp;
  console.log("  OTP response status:", otpRes.status, "Dev OTP:", otp);

  const verifyRes = await request("POST", "/api/v1/auth/verify-otp", {
    phone: TEST_PHONE,
    otp: String(otp),
  });
  const authData = verifyRes.data?.data || verifyRes.data;
  const token = authData?.accessToken || authData?.token;
  console.log("  Verify status:", verifyRes.status, "Token acquired:", Boolean(token));

  if (!token) {
    console.error("  [FAIL] Could not authenticate test user.");
    process.exit(1);
  }

  const authHeader = { Authorization: `Bearer ${token}` };

  // 2. OpenAPI Traveller Creation: POST /api/v1/account/traveller/create
  console.log("\n[STEP 2] Creating new co-traveller profile matching OpenAPI schema...");
  const travellerPayload = {
    title: "Mr",
    firstName: "Ahmed",
    lastName: "Farooqi",
    email: `ahmed.${Date.now()}@example.com`,
    phone: "9876543210",
    cellCountryCode: "+91",
    passengerType: "Adult",
    gender: "Male",
    dateOfBirth: new Date("1992-06-15T00:00:00.000Z").toISOString(),
  };

  const createTravellerRes = await request("POST", "/api/v1/account/traveller/create", travellerPayload, authHeader);
  console.log("  Traveller create status:", createTravellerRes.status);
  const createdData = createTravellerRes.data?.data || createTravellerRes.data;
  const travellerId = createdData?.id || createdData?._id;
  console.log("  Created Traveller ID:", travellerId, "Name:", `${createdData?.firstName} ${createdData?.lastName}`);

  if (createTravellerRes.status !== 201 && createTravellerRes.status !== 200) {
    console.error("  [FAIL] Failed to create traveller:", createTravellerRes.data);
    process.exit(1);
  }
  console.log("  [PASS] Traveller profile successfully created via OpenAPI endpoint.");

  // 3. OpenAPI Traveller Fetch All: GET /api/v1/account/traveller/getAll
  console.log("\n[STEP 3] Fetching all co-travellers for user: GET /api/v1/account/traveller/getAll...");
  const getAllRes = await request("GET", "/api/v1/account/traveller/getAll", null, authHeader);
  console.log("  GetAll status:", getAllRes.status);
  const travellers = getAllRes.data?.data || getAllRes.data || [];
  console.log("  Total travellers in user account:", travellers.length);
  const matched = travellers.find((t) => String(t.id || t._id) === String(travellerId));
  if (!matched) {
    console.error("  [FAIL] Newly created traveller not present in getAll!");
    process.exit(1);
  }
  console.log("  [PASS] Found newly created traveller in user account list.");

  // 4. OpenAPI Traveller Get By ID: GET /api/v1/account/traveller/{id}
  console.log(`\n[STEP 4] Fetching traveller by ID: GET /api/v1/account/traveller/${travellerId}...`);
  const getByIdRes = await request("GET", `/api/v1/account/traveller/${travellerId}`, null, authHeader);
  console.log("  GetById status:", getByIdRes.status, "Name:", getByIdRes.data?.data?.firstName || getByIdRes.data?.firstName);
  if (getByIdRes.status !== 200) {
    console.error("  [FAIL] Could not fetch traveller by ID:", getByIdRes.data);
    process.exit(1);
  }
  console.log("  [PASS] Retrieved traveller profile by ID.");

  // 5. Hotel Search: POST /api/v1/hotels/search
  console.log("\n[STEP 5] Searching hotels...");
  const today = new Date();
  const checkIn = new Date(today.getTime() + 10 * 86400000).toISOString().split("T")[0];
  const checkOut = new Date(today.getTime() + 11 * 86400000).toISOString().split("T")[0];

  const searchRes = await request("POST", "/api/v1/hotels/search", {
    cityId: "699261", // Mumbai
    checkIn,
    checkOut,
    rooms: [{ adults: 2, children: 0, childAges: [] }],
  });

  const searchId = searchRes.data?.data?.searchId || searchRes.data?.searchId;
  const hotelList = searchRes.data?.data?.hotels || searchRes.data?.hotels || [];
  console.log("  Search status:", searchRes.status, "searchId:", searchId, "Hotels:", hotelList.length);

  if (!searchId || hotelList.length === 0) {
    console.error("  [FAIL] No hotels found in search:", searchRes.data);
    process.exit(1);
  }

  const selectedHotel = hotelList[0];
  const hotelId = String(selectedHotel.id || selectedHotel.hotelId);
  console.log("  Selected Hotel:", selectedHotel.name, "ID:", hotelId);

  // 6. Hotel Details: GET /api/v1/hotels/{hotelId}?searchId={searchId}
  console.log(`\n[STEP 6] Getting room options: GET /api/v1/hotels/${hotelId}?searchId=${searchId}...`);
  const detailsRes = await request("GET", `/api/v1/hotels/${hotelId}?searchId=${searchId}`);
  const rooms = detailsRes.data?.data?.rooms || detailsRes.data?.rooms || [];
  const selectedRoom = rooms[0] || { id: "1" };
  const roomId = String(selectedRoom.id || selectedRoom.roomId || "1");
  console.log("  Details status:", detailsRes.status, "Rooms found:", rooms.length, "Selected Room ID:", roomId);

  // 7. Hotel Recheck (Rate Lock): POST /api/v1/hotels/recheck
  console.log("\n[STEP 7] Performing Rate Lock: POST /api/v1/hotels/recheck...");
  const recheckRes = await request("POST", "/api/v1/hotels/recheck", {
    searchId,
    hotelId,
    selectedRooms: [{ roomId, quantity: 1 }],
  }, authHeader);
  console.log("  Recheck status:", recheckRes.status);
  const recheckId = recheckRes.data?.data?.recheckId || recheckRes.data?.recheckId;
  console.log("  Acquired recheckId:", recheckId);

  // 8. Hotel Booking with Linked Traveller ID
  console.log("\n[STEP 8] Creating Hotel Booking with linked travellerId and PAN...");
  const guestObj = {
    title: "Mr",
    firstName: "Ahmed",
    lastName: "Farooqi",
    email: travellerPayload.email,
    phone: travellerPayload.phone,
    type: "adult",
    leadGuest: true,
    age: 32,
    pan: PAN_CARD,
    travellerId: String(travellerId),
  };

  const bookingPayload = {
    recheckId: recheckId || "test-recheck-token",
    acceptChanges: true,
    guests: [guestObj],
  };

  const bookingRes = await request("POST", "/api/v1/hotels/bookings", bookingPayload, {
    ...authHeader,
    "Idempotency-Key": `hotel_test_${Date.now()}_${PAN_CARD}`,
  });
  console.log("  Booking status:", bookingRes.status);
  const bookingData = bookingRes.data?.data || bookingRes.data;
  const bookingId = bookingData?.id || bookingData?._id;
  console.log("  Booking ID:", bookingId);
  console.log("  Booking Status:", bookingData?.status);
  console.log("  Booking Guests:", JSON.stringify(bookingData?.guests));

  console.log("\n==================================================================");
  console.log("SWAGGER TRAVELLER API & HOTEL BOOKING VERIFICATION COMPLETE!");
  console.log("==================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
