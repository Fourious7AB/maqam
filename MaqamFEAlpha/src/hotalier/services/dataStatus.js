// -----------------------------------------------------------------------------
// Hotelier portal data-status registry.
// Only active live backend endpoints are registered here.
// -----------------------------------------------------------------------------
export const dataStatusMeta = {
  updatedAt: "2026-10-01",
  guide: "Production Live APIs",
};

export const dataStatusRegistry = [
  {
    key: "hotelier-stock",
    group: "Manage",
    feature: "Room stock and availability",
    data: "Room blocks of this hotel: room type, dates, rate, meals, units and per-unit status",
    file: "src/hotalier/services/stockApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/hotelier/stock", note: "List every batch of this hotel" },
      { method: "POST", path: "/api/v1/hotelier/stock", note: "Submit new room block (pending review)" },
      { method: "PATCH", path: "/api/v1/hotelier/stock/:id", note: "Edit batch, resets review" },
      { method: "POST", path: "/api/v1/hotelier/stock/:id/units", note: "Add extra room units" },
      { method: "PATCH", path: "/api/v1/hotelier/stock/:id/units/:unitId", note: "Hold or release a unit" },
    ],
  },
  {
    key: "hotelier-profile",
    group: "Manage",
    feature: "Hotelier profile & hotel property",
    data: "Authenticated user session, verification status, and linked hotel property dossier",
    file: "src/admin/store/authStore.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/auth/me", note: "Live user profile & hotel resolution" },
    ],
  },
];

export function getDataStatusTotals() {
  const slices = dataStatusRegistry.length;
  const live = dataStatusRegistry.filter((s) => s.status === "live").length;
  const mock = dataStatusRegistry.filter((s) => s.status === "mock").length;
  const planned = dataStatusRegistry.filter((s) => s.status === "planned").length;
  const endpoints = dataStatusRegistry.reduce((sum, s) => sum + (s.endpoints?.length || 0), 0);
  return { slices, live, mock, planned, endpoints };
}
