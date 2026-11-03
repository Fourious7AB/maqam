// -----------------------------------------------------------------------------
// Hotelier partner portal stock endpoints.
//
//   GET    /api/v1/hotelier/stock                    list every batch of this hotel
//   POST   /api/v1/hotelier/stock                    submit a new room block (pending_review)
//   PATCH  /api/v1/hotelier/stock/:id                edit a batch (resets to pending_review)
//   POST   /api/v1/hotelier/stock/:id/units          add more rooms to a batch
//   PATCH  /api/v1/hotelier/stock/:id/units/:unitId  hold (blocked) / release (available) a unit
// -----------------------------------------------------------------------------
import { apiClient } from "../../admin/services/apiClient";

const ROOT = "/api/v1/hotelier/stock";

// -----------------------------------------------------------------------------
// Error normalisation (API doc, section 5):
//   400 validation  -> { status: "fail", errors: [{ field, message }] }
//   business rules  -> { success: false, message: "..." }
//   401/403/404/409 -> { success: false, message: "..." }
// Pages toast `err.message`, so every thrown error carries a readable message.
// -----------------------------------------------------------------------------
export function toFriendlyError(err) {
  const data = err?.response?.data;
  const message =
    (Array.isArray(data?.errors) && data.errors[0]?.message) ||
    data?.message ||
    err?.message;
  const error = new Error(message || "Request failed. Please try again.");
  error.status = err?.response?.status;
  error.data = data;
  return error;
}

/** Run an apiClient call and resolve with the API envelope (res.data). */
async function send(request) {
  try {
    const res = await request;
    return res?.data ?? res;
  } catch (err) {
    throw toFriendlyError(err);
  }
}

export function listStockBatches() {
  return send(apiClient.get(ROOT));
}

export function createStockBlock(payload) {
  return send(apiClient.post(ROOT, payload));
}

export function updateStockBatch(id, patch) {
  return send(apiClient.patch(`${ROOT}/${id}`, patch));
}

export function addStockUnits(id, count) {
  return send(apiClient.post(`${ROOT}/${id}/units`, { count: Number(count) }));
}

export function setStockUnitStatus(stockId, unitId, status) {
  return send(apiClient.patch(`${ROOT}/${stockId}/units/${unitId}`, { status }));
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** "2026-12-01" (or any parseable date) -> ISO string at UTC midnight. */
export function toIsoDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** ISO string -> "20 Nov 2026" for card subtitles. */
export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Guard 1: dates/room type are locked once any unit belongs to a customer. */
export function unitIsBooked(unit) {
  return ["unavailable", "used", "assigned"].includes(String(unit?.status));
}

export function hasBookedUnits(batch) {
  const units = Array.isArray(batch?.units) ? batch.units : [];
  return units.some(unitIsBooked);
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Map one backend stock batch onto the room-shaped object the hotelier UI
 * already renders. Unit statuses drive the availability stepper:
 *   available -> bookable now, blocked -> held by the hotel, unavailable -> sold.
 */
export function normalizeBatch(batch) {
  if (!batch || typeof batch !== "object") return batch;
  const units = Array.isArray(batch.units) ? batch.units : [];
  const available = units.filter((u) => u.status === "available").length;
  const blocked = units.filter((u) => u.status === "blocked").length;
  const meals = Array.isArray(batch.meals) ? batch.meals : [];

  return {
    id: batch._id ?? batch.id,
    type: batch.roomType ?? batch.type ?? "Room",
    price: batch.pricePerNight ?? batch.price ?? 0,
    currency: batch.currency || "SAR",
    total: units.length || Number(batch.totalUnits) || 0,
    available,
    blocked,
    reviewStatus: batch.reviewStatus ?? "approved",
    checkIn: batch.checkIn ?? "",
    checkOut: batch.checkOut ?? "",
    reservationRef: batch.reservationRef ?? "",
    nameAdditionDeadline: batch.nameAdditionDeadline ?? "",
    meals,
    units,
    images: Array.isArray(batch.images) ? batch.images : [],
    amenities: Array.isArray(batch.amenities) ? batch.amenities : [],
    capacity: batch.capacity,
    rating: batch.rating,
    meal: {
      provided: meals.length > 0,
      plan: meals.map(capitalize).join(" + "),
      price: 0,
    },
    hasBookings: hasBookedUnits(batch),
  };
}

/** Badge label/colors for the batch review state. */
export function reviewBadge(reviewStatus) {
  switch (String(reviewStatus)) {
    case "approved":
      return { label: "Approved", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
    case "rejected":
      return { label: "Rejected", className: "bg-red-50 text-red-600 ring-red-200" };
    default:
      return { label: "Pending review", className: "bg-amber-50 text-amber-700 ring-amber-200" };
  }
}
