

require("dotenv").config();
console.log(process.env.SRDV_API_BASE_FLIGHT_URL);

const SRDV_API_KEY = process.env.SRDV_API_KEY;

const SRDV_END_USER_IP = process.env.SRDV_END_USER_IP;
const SRDV_CLIENT_ID = process.env.SRDV_CLIENT_ID;
const SRDV_USERNAME = process.env.SRDV_USERNAME;
const SRDV_PASSWORD = process.env.SRDV_PASSWORD;
const SRDV_API_BASE_FLIGHT_URL = process.env.SRDV_API_BASE_FLIGHT_URL;
console.log(JSON.stringify(process.env.SRDV_API_KEY));
console.log(process.env.SRDV_API_KEY.length);
console.log("EndUserIp:", process.env.SRDV_END_USER_IP);
// Pick a real near-future one-way route — adjust origin/destination/date to something SRDV actually flies
const payload = {
  EndUserIp: SRDV_END_USER_IP,
  ClientId: SRDV_CLIENT_ID,
  UserName: SRDV_USERNAME,
  Password: SRDV_PASSWORD,
  AdultCount: 1,
  ChildCount: 0,
  InfantCount: 0,
  JourneyType: 1, // 1 = OneWay — start here, test Return separately once this works
  DirectFlight: false,
  Segments: [
    {
      Origin: "BOM",
      Destination: "DEL",
      FlightCabinClass: 0, // confirmed: 0 = no preference, per docs
      PreferredDepartureTime: "2026-08-21T00:00:00",
      PreferredArrivalTime: "2026-08-21T00:00:00",
    },
  ],
};

async function run() {
  try {
    // Adjust the path below — /Search is the assumed endpoint name from the plan doc,
    // confirm the exact path against SRDV's own API docs/Postman collection if this 404s
    const res = await fetch(`${SRDV_API_BASE_FLIGHT_URL}/Search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": SRDV_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("STATUS:", res.status);
    // console.log(JSON.stringify(data));

    // ---- Quick sanity checks against things flagged as unverified in the docs ----
    const firstOption = data?.Results?.[0]?.[0];
    console.log(firstOption)
    if (firstOption) {
      console.log("\n--- WROKS ---------");
  
    } else {
      console.log(
        "\nNo results in Results[0][0] — check the response shape above manually.",
      );
    }
  } catch (err) {
    console.error("Request failed:", err.message);
  }
}

run();
