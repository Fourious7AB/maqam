// -----------------------------------------------------------------------------
// dataContext — the context object + useData() hook + pure helpers for the
// shared app store. Kept component-free (separate from DataProvider.jsx) so the
// Vite fast-refresh rule (react-refresh/only-export-components) stays happy.
// -----------------------------------------------------------------------------
import { createContext, useContext } from "react";
import { afterDiscount } from "../utils/format";

export const DataContext = createContext(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used inside <DataProvider>");
  }
  return ctx;
}

// The inventory collections the store manages, and their REST endpoints.
// Set to null for collections where the backend uses a different pattern
// (e.g. POST /search instead of GET /list) — DataProvider falls back to seed data.
export const COLLECTIONS = {
  hotels: null, // backend uses POST /api/v1/hotels/search — no GET list
  flights: null, // backend uses POST /api/v1/flights/search — no GET list
  cabs: null, // no dedicated cabs endpoint on this backend
  meals: null, // no dedicated meals endpoint on this backend
  visa: null, // visa uses /api/v1/visa/admin or /api/v1/visa/user sub-routes
  packages: "/api/v1/packages", // ✅ exists: GET /api/v1/packages
  accounts: null, // backend mounts at /api/v1/account (no 's') — use null for now
  bookings: null, // Protected endpoint: fetched per-user in Bookings.jsx only when authenticated
};

// Id prefixes used when generating new records locally.
export const ID_PREFIX = {
  hotels: "HT-",
  flights: "FL-",
  cabs: "CB-",
  meals: "ML-",
  visa: "VS-",
  packages: "PK-",
  bookings: "BK-",
  hotelier: "HO-",
  customer: "CU-",
  salesman: "SM-",
};

// Which price a given audience should see. This is the whole dual-price rule:
// the hotelier sees their basePrice; everyone else sees the admin's sellPrice.
export function priceForAudience(item, audience = "public") {
  if (!item) return 0;
  if (audience === "hotelier") {
    return Number(item.basePrice ?? item.sellPrice ?? 0);
  }
  return Number(item.sellPrice ?? item.basePrice ?? 0);
}

// ---- Package price composition -------------------------------------------
// These pure helpers are shared by the admin package builder, the public
// packages page — one definition of how a package price is built, so every
// surface shows the same number.

// Sum the audience price (after each item's own discount) of a set of item ids.
export function priceOfItems(ids = [], list = [], audience = "public") {
  const byId = new Map((list || []).map((x) => [x.id, x]));
  return (ids || []).reduce((sum, id) => {
    const item = byId.get(id);
    if (!item) return sum;
    return sum + afterDiscount(priceForAudience(item, audience), item.discount);
  }, 0);
}

// Total of every service selected inside one package variant.
export function variantServicesTotal(
  variant,
  collections,
  audience = "public",
) {
  if (!variant || !collections) return 0;
  return (
    priceOfItems(variant.hotelIds, collections.hotels, audience) +
    priceOfItems(variant.flightIds, collections.flights, audience) +
    priceOfItems(variant.cabIds, collections.cabs, audience) +
    priceOfItems(variant.mealIds, collections.meals, audience)
  );
}

// Final price of a package variant: services + admin extra, then the package
// discount. Multiply by traveler count at the booking layer, not here.
export function packageVariantPrice(
  pkg,
  variant,
  collections,
  audience = "public",
) {
  if (!pkg) return 0;
  const services = variantServicesTotal(variant, collections, audience);
  const withExtra = services + Number(pkg.extraPrice || 0);
  return afterDiscount(withExtra, pkg.discount);
}

// Cheapest variant price for a package (used for "from ₹…" on cards).
export function packageFromPrice(pkg, collections, audience = "public") {
  const variants = pkg?.variants || [];
  if (!variants.length)
    return afterDiscount(Number(pkg?.extraPrice || 0), pkg?.discount);
  return Math.min(
    ...variants.map((v) => packageVariantPrice(pkg, v, collections, audience)),
  );
}
