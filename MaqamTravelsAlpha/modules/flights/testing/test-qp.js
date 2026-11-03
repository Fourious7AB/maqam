require("dotenv").config();
const mongoose = require("mongoose");
const { setTimeout: sleep } = require("timers/promises");
const {
  searchFlightsService,
  getCachedSearchEntryService,
  getFareQuoteService
} = require("../flight.service");
const srdvAdapter = require("../../../providers/srdv/srdv.adapter");

const TEST_TRAVELLER_DETAILS = {
  title: "Mr",
  firstName: "Test",
  lastName: "Sharma",
  passengerType: "Adult",
  gender: "Male",
  dateOfBirth: "1992-08-15",
  email: "rahul.sharma@example.com",
  phone: "9876543210",
  cellCountryCode: "+91",
  addressLine1: "Flat 402 Sunshine Apartments",
  city: "Mumbai",
  countryCode: "IN",
  countryName: "INDIA"
};

const paxTypeMap = { Adult: 1, Child: 2, Infant: 3 };
const genderMap = { Male: "1", Female: "2" };
const formatDate = (date) =>
  date ? new Date(date).toISOString().replace(/\.\d{3}Z$/, "") : "";

const buildPassengerQP = (traveller, fare, passportNo = "J1234567") => {
  return {
    Title: traveller.title,
    FirstName: traveller.firstName,
    LastName: traveller.lastName,
    PaxType: paxTypeMap[traveller.passengerType],
    DateOfBirth: formatDate(traveller.dateOfBirth),
    Gender: genderMap[traveller.gender],
    PassportNo: passportNo,
    PassportExpiry: "2032-12-31T00:00:00",
    AddressLine1: (traveller.addressLine1 || "").slice(0, 32),
    City: traveller.city,
    CountryCode: traveller.countryCode,
    CountryName: traveller.countryName,
    ContactNo: traveller.phone,
    Email: traveller.email,
    IsLeadPax: 1,
    GSTCompanyAddress: "",
    GSTCompanyContactNumber: "",
    GSTCompanyName: "",
    GSTNumber: "",
    GSTCompanyEmail: "",
    CellCountryCode: traveller.cellCountryCode,
    PassportIssueDate: "2022-01-15T00:00:00",
    Baggage: [],
    MealDynamic: [],
    Seat: []
  };
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  console.log("Searching flights...");
  const search = await searchFlightsService({
    origin: "DEL",
    destination: "BOM",
    departDate: "2026-08-15",
    passengers: 1,
    journeyType: "oneway",
  });

  await sleep(3000);

  // Find AI and IX flights
  let entryAI = null;
  let entryIX = null;
  for (const o of search.outbound) {
    const cached = await getCachedSearchEntryService(search.traceId, o.resultIndex);
    const airlineCode = o.segments?.[0]?.airlineCode || "";
    if (airlineCode === "AI" && !entryAI) {
      entryAI = { ...o, ...cached };
    }
    if (airlineCode === "IX" && !entryIX) {
      entryIX = { ...o, ...cached };
    }
  }

  if (!entryAI && !entryIX) {
    console.error("No AI or IX flight found!");
    process.exit(1);
  }

  if (entryAI) {
    console.log(`\nFound AI flight: ${entryAI.resultIndex}`);
    console.log("Calling FareQuote...");
    const fqAI = await getFareQuoteService(search.traceId, entryAI.resultIndex);
    console.log("FareQuote complete. Calling holdGDSAdapter...");
    try {
      const holdAI = await srdvAdapter.holdGDSAdapter({
        srdvType: entryAI.srdvType,
        traceId: search.traceId,
        srdvIndex: entryAI.srdvIndex,
        resultIndex: entryAI.resultIndex,
        travellers: [{ traveller: TEST_TRAVELLER_DETAILS, isLeadPax: true }],
        fareData: entryAI.fare,
        gstData: null,
      });
      console.log("AI GDS HOLD SUCCESS:", JSON.stringify(holdAI, null, 2));
    } catch (err) {
      console.log("AI GDS HOLD FAILED:", err.message);
    }
  }

  if (entryIX) {
    console.log(`\nFound IX flight: ${entryIX.resultIndex}`);
    console.log("Calling FareQuote...");
    const fqIX = await getFareQuoteService(search.traceId, entryIX.resultIndex);
    console.log("FareQuote complete. Calling holdGDSAdapter...");
    try {
      const holdIX = await srdvAdapter.holdGDSAdapter({
        srdvType: entryIX.srdvType,
        traceId: search.traceId,
        srdvIndex: entryIX.srdvIndex,
        resultIndex: entryIX.resultIndex,
        travellers: [{ traveller: TEST_TRAVELLER_DETAILS, isLeadPax: true }],
        fareData: entryIX.fare,
        gstData: null,
      });
      console.log("IX GDS HOLD SUCCESS:", JSON.stringify(holdIX, null, 2));
    } catch (err) {
      console.log("IX GDS HOLD FAILED:", err.message);
    }
  }

  await mongoose.connection.close();
}

main().catch(err => {
  console.error("Crash:", err);
  mongoose.connection.close();
});
