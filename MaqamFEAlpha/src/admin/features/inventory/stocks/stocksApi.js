import { apiClient } from "../../../services/apiClient";

const ROOT = "/api/v1/crm/stocks";

const qs = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );

// ---------------------------------------------------------------------------
// Response parsing helpers.
// The backend wraps some routes in the standard envelope
// ({ success, message, data: {...} }) and returns others flat. Accept every
// observed shape so an envelope change can never blank the inventory UI:
//   { stocks, pagination }                       (flat)
//   { success, data: { stocks, pagination } }    (envelope)
//   { success, data: [...], meta: {...} }        (visa-style)
//   [ ... ]                                      (bare array)
// ---------------------------------------------------------------------------
const unwrapBody = (body) =>
  body && typeof body === "object" && !Array.isArray(body) && "data" in body
    ? body.data ?? body
    : body;

const parseList = (body, { page = 1, limit = 20 } = {}) => {
  const payload = unwrapBody(body);

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.stocks)
      ? payload.stocks
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  return {
    stocks: list,
    pagination:
      payload?.pagination ??
      payload?.meta ??
      body?.pagination ??
      body?.meta ?? {
        total: list.length,
        page,
        limit,
        totalPages: 1,
      },
  };
};

const parseOne = (body, key) => {
  const payload = unwrapBody(body);
  return payload?.[key] ?? (Array.isArray(payload) ? payload[0] : payload) ?? null;
};

// ---------------------------------------------------------------------------
// Row field aliases.
// The stock tables read camelCase fields (availableUnits, hotelName, ...).
// Different backend versions name some of these differently; fill any missing
// expected field from known alternates. This never overwrites a field the
// backend already provides with the expected name.
// ---------------------------------------------------------------------------
const FLIGHT_ROW_ALIASES = {
  airline: ["airLine", "airlineName"],
  flightNumber: ["flightNo", "flightCode"],
  origin: ["from", "originCode", "departureAirport"],
  destination: ["to", "destinationCode", "arrivalAirport"],
  cabinClass: ["cabin", "class", "cabinType"],
  departureDate: ["departure", "departureTime", "departureDateTime"],
  arrivalDate: ["arrival", "arrivalTime", "arrivalDateTime"],
  nameAdditionDeadline: ["nameDeadline", "nameAdditionCutOff", "cutoffDate"],
  availableUnits: ["availableSeats", "available", "availableCount"],
  totalUnits: ["totalSeats", "total", "capacity", "seatCount"],
  costPerUnit: ["costPerSeat", "unitCost", "cost"],
};

const HOTEL_ROW_ALIASES = {
  hotelName: ["name", "hotel"],
  destination: ["city", "location"],
  roomType: ["room", "roomCategory"],
  checkIn: ["checkInDate"],
  checkOut: ["checkOutDate"],
  totalNights: ["nights", "nightCount"],
  reservationRef: ["reservationReference", "bookingRef", "reference"],
  availableUnits: ["availableRooms", "available", "availableCount"],
  totalUnits: ["totalRooms", "total", "rooms", "roomCount"],
  pricePerNight: ["price", "sellPrice", "rate", "pricePerRoom"],
  costPerUnit: ["costPerRoom", "unitCost", "cost"],
  meals: ["mealPlan", "meal"],
};

const withRowAliases = (row, aliases) => {
  if (!row || typeof row !== "object") return row;
  const out = { ...row, id: row._id ?? row.id };
  for (const [target, sources] of Object.entries(aliases)) {
    if (out[target] !== undefined && out[target] !== null && out[target] !== "") continue;
    for (const source of sources) {
      const value = row[source];
      if (value === undefined || value === null || value === "") continue;
      if (target === "meals" && !Array.isArray(value)) continue;
      out[target] = value;
      break;
    }
  }
  return out;
};

const mapFlightRows = (stocks) => stocks.map((row) => withRowAliases(row, FLIGHT_ROW_ALIASES));
const mapHotelRows = (stocks) => stocks.map((row) => withRowAliases(row, HOTEL_ROW_ALIASES));

export const stocksApi = {
  // GET /api/v1/crm/stocks/overview
  // Consolidated metrics for all flight seats and hotel rooms.
  async getOverview() {
    const { data } = await apiClient.get(`${ROOT}/overview`);
    const payload = unwrapBody(data);
    return payload?.overview ?? payload ?? null;
  },

  // GET /api/v1/crm/stocks/flights
  // Paginated search of block ticket batches.
  async listFlights({ page = 1, limit = 20, airline = "", origin = "", destination = "", pnr = "", availableOnly = "" } = {}) {
    const { data } = await apiClient.get(`${ROOT}/flights`, {
      params: qs({ page, limit, airline, origin, destination, pnr, availableOnly }),
    });
    const result = parseList(data, { page, limit });
    return { ...result, stocks: mapFlightRows(result.stocks) };
  },

  // POST /api/v1/crm/stocks/flights
  // Adds bulk PNR block seats; backend auto-generates individual units.
  async createFlight(payload) {
    const { data } = await apiClient.post(`${ROOT}/flights`, payload);
    return parseOne(data, "stock");
  },

  // GET /api/v1/crm/stocks/hotels
  // Paginated list of contracted hotel room blocks.
  async listHotels({ page = 1, limit = 20, destination = "", availableOnly = "" } = {}) {
    const { data } = await apiClient.get(`${ROOT}/hotels`, {
      params: qs({ page, limit, destination, availableOnly }),
    });
    const result = parseList(data, { page, limit });
    return { ...result, stocks: mapHotelRows(result.stocks) };
  },

  // POST /api/v1/crm/stocks/hotels
  // Adds contracted hotel room nights; backend auto-generates room units.
  async createHotel(payload) {
    const { data } = await apiClient.post(`${ROOT}/hotels`, payload);
    return parseOne(data, "stock");
  },

  // GET /api/v1/crm/stocks/flights/:id or /api/v1/stock/flight/:id
  // Full batch details: seat allocations, held bookings, name-addition deadline.
  async getFlightDetails(id) {
    if (!id) return null;
    const candidates = [
      `${ROOT}/flights/${id}`,
      `/api/v1/stock/flight/${id}`,
      `/api/v1/stocks/flights/${id}`,
      `/api/v1/crm/stock/flight/${id}`,
    ];
    let lastError = null;
    for (const url of candidates) {
      try {
        const { data } = await apiClient.get(url);
        const parsed = parseOne(data, "stock");
        if (parsed) return withRowAliases(parsed, FLIGHT_ROW_ALIASES);
      } catch (err) {
        lastError = err;
        if (err?.response?.status !== 404 && err?.response?.status !== 405) {
          // continue fallback
        }
      }
    }
    if (lastError && lastError?.response?.status !== 404) throw lastError;
    return null;
  },

  // GET /api/v1/crm/stocks/hotels/:id or /api/v1/stock/hotel/:id
  // Room allotment breakdown, claimed nights and room unit states.
  async getHotelDetails(id) {
    if (!id) return null;
    const candidates = [
      `${ROOT}/hotels/${id}`,
      `/api/v1/stock/hotel/${id}`,
      `/api/v1/stocks/hotels/${id}`,
      `/api/v1/crm/stock/hotel/${id}`,
    ];
    let lastError = null;
    for (const url of candidates) {
      try {
        const { data } = await apiClient.get(url);
        const parsed = parseOne(data, "stock");
        if (parsed) return withRowAliases(parsed, HOTEL_ROW_ALIASES);
      } catch (err) {
        lastError = err;
        if (err?.response?.status !== 404 && err?.response?.status !== 405) {
          // continue fallback
        }
      }
    }
    if (lastError && lastError?.response?.status !== 404) throw lastError;
    return null;
  },
};

// ---------------------------------------------------------------------------
// Hotelier stock review queue (CRM approvals).
// Hoteliers submit allotments from their portal; CRM reviews them into
// usable inventory.
// ---------------------------------------------------------------------------
const HOTEL_STOCK_ROOT = "/api/v1/crm/hotel-stock";

export const hotelStockReviewApi = {
  // GET /api/v1/crm/hotel-stock/pending
  async listPending({ page = 1, limit = 20 } = {}) {
    const { data } = await apiClient.get(`${HOTEL_STOCK_ROOT}/pending`, {
      params: qs({ page, limit }),
    });
    const result = parseList(data, { page, limit });
    return { ...result, stocks: mapHotelRows(result.stocks) };
  },

  // GET /api/v1/crm/hotel-stock/approved
  async listApproved({ page = 1, limit = 20 } = {}) {
    const { data } = await apiClient.get(`${HOTEL_STOCK_ROOT}/approved`, {
      params: qs({ page, limit }),
    });
    const result = parseList(data, { page, limit });
    return { ...result, stocks: mapHotelRows(result.stocks) };
  },

  // PATCH /api/v1/crm/hotel-stock/:id/review
  // decision: "approved" | "rejected" (verified guide). `status` kept for
  // older backend variants that expect it instead.
  async review(id, { decision, status, reviewNotes = "" } = {}) {
    const decisionValue = decision ?? status;
    const { data } = await apiClient.patch(`${HOTEL_STOCK_ROOT}/${id}/review`, {
      decision: decisionValue,
      status: decisionValue,
      reviewNotes,
    });
    return data;
  },
};

// ---------------------------------------------------------------------------
// Contracted hotel property entities (physical hotel listings & contracts).
// ---------------------------------------------------------------------------
const HOTELS_ROOT = "/api/v1/crm/hotels";

export const hotelPropertiesApi = {
  // GET /api/v1/crm/hotels
  async list({ page = 1, limit = 50 } = {}) {
    const { data } = await apiClient.get(HOTELS_ROOT, {
      params: qs({ page, limit }),
    });
    const payload = unwrapBody(data);
    const hotels = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.hotels)
        ? payload.hotels
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
    return {
      hotels,
      pagination:
        payload?.pagination ??
        payload?.meta ??
        data?.pagination ??
        { total: hotels.length, page, limit, totalPages: 1 },
    };
  },

  // GET /api/v1/crm/hotels/:id
  async get(id) {
    const { data } = await apiClient.get(`${HOTELS_ROOT}/${id}`);
    return parseOne(data, "hotel");
  },

  // POST /api/v1/crm/hotels — onboard a new hotel property
  async create(payload) {
    const { data } = await apiClient.post(HOTELS_ROOT, payload);
    return parseOne(data, "hotel");
  },

  // PATCH /api/v1/crm/hotels/:id
  async update(id, payload) {
    const { data } = await apiClient.patch(`${HOTELS_ROOT}/${id}`, payload);
    return parseOne(data, "hotel");
  },
};
