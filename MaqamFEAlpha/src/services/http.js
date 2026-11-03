// -----------------------------------------------------------------------------
// Tiny fetch wrapper for the admin panel.
//
// Backend flexibility:
//   - If VITE_API_URL is set (see .env.example), the admin pages talk to your
//     real backend using standard REST calls.
//   - If it is NOT set, the whole panel runs on local mock data instead, so the
//     app works out of the box with zero configuration.
//
// This is the ONLY place that reads the base URL, so switching backends is a
// one-line change in your .env file.
// -----------------------------------------------------------------------------

// Vite injects env vars on `import.meta.env`. Read it defensively so this
// module can also be imported in plain Node (tests/SSR) where it's undefined.
const ENV = import.meta.env ?? {};

// Trim trailing slashes and quotes so `${API_BASE}/bookings` never doubles up as `//`.
const RAW_BASE =
  ENV.VITE_API_BASE_URL ??
  ENV.VITE_API_URL ??
  ENV.VITE_API_URL_S ??
  "";
export const API_BASE = String(RAW_BASE)
  .trim()
  .replace(/^["']|["']$/g, "")
  .trim()
  .replace(/\/+$/, "");

// Optional bearer token (e.g. saved after admin login). Read lazily so a token
// set later in the session is picked up without a reload.
import { tokenService } from "../admin/services/tokenService";

/** True when a real backend URL is configured. Drives mock-vs-live everywhere. */
export function isApiEnabled() {
  return API_BASE.length > 0;
}

function authHeader() {
  const token = tokenService.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildUrl(path) {
  // Allow callers to pass a fully-qualified URL and bypass the base.
  if (/^https?:\/\//i.test(path)) return path;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}

/**
 * Core request. Returns parsed JSON (or raw text) and throws an Error with
 * `.status` / `.data` attached on non-2xx responses.
 */
async function request(path, { method = "GET", body, headers, signal } = {}) {
  const res = await fetch(buildUrl(path), {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(headers || {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (data.message || data.error)) ||
      // Validation envelope: { status: "fail", errors: [{ field, message }] }
      (data && typeof data === "object" && Array.isArray(data.errors) &&
        data.errors[0] && data.errors[0].message) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const apiGet = (path, opts) => request(path, { ...opts, method: "GET" });
export const apiPost = (path, body, opts) =>
  request(path, { ...opts, method: "POST", body });
export const apiPut = (path, body, opts) =>
  request(path, { ...opts, method: "PUT", body });
export const apiPatch = (path, body, opts) =>
  request(path, { ...opts, method: "PATCH", body });
export const apiDelete = (path, opts) =>
  request(path, { ...opts, method: "DELETE" });

// -----------------------------------------------------------------------------
// Response unwrapping — different backends wrap payloads differently. These
// helpers dig out the list / item so pages don't care about the envelope shape.
// Handles: bare array, { data }, { items }, { results }, { rows }, { <entity> }.
// -----------------------------------------------------------------------------
export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    // Check if payload.data is an object with nested array (e.g. { data: { packages: [...] } })
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      const nestedNamed = ["packages", "bookings", "items", "results", "rows", "records", "data"];
      for (const key of nestedNamed) {
        if (Array.isArray(payload.data[key])) return payload.data[key];
      }
      const nestedArray = Object.values(payload.data).find((v) => Array.isArray(v));
      if (nestedArray) return nestedArray;
    }
    const named = ["data", "items", "results", "rows", "records", "packages", "bookings"];
    for (const key of named) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    // Fall back to the first array-valued property (e.g. { bookings: [...] }).
    const firstArray = Object.values(payload).find((v) => Array.isArray(v));
    if (firstArray) return firstArray;
  }
  return [];
}

export function unwrapItem(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.data && typeof payload.data === "object") return payload.data;
  }
  return payload;
}
