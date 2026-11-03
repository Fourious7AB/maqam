import axios from "axios";
import { tokenService, getStoredAuthToken, isTokenExpired } from "../../admin/services/tokenService.js";
import { executeSilentRefresh } from "../../admin/services/axios.js";
import { getApiBaseUrl } from "../../configs/api.js";

// Apply JSON content headers globally to Axios requests in the customer/shared API client.
axios.defaults.headers.common["Accept"] = "application/json";
axios.defaults.headers.common["Content-Type"] = "application/json";

const getBaseUrl = () => {
  const metaEnv = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
  const useProxy = String(metaEnv.VITE_USE_DEV_API_PROXY || "").toLowerCase() === "true";
  if (useProxy) return "";
  return getApiBaseUrl();
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  timeout: 25000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const isAuthEndpoint = (url = "") =>
  /\/auth\/(login|send-otp|verify-otp|refresh-token)(?:$|\/)|\/login\/(request-otp|verify-otp)(?:$|\/)|\/otp\/(send-otp|verify-otp)(?:$|\/)/.test(String(url));

// -----------------------------------------------------------------------------
// Outbound Request Interceptor (The Pre-Flight Pipeline - Section 4)
// -----------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers.Accept = config.headers.Accept || "application/json";
  config.withCredentials = true;

  // Normalization: In dev proxy mode, ensure any absolute API URL is stripped to a relative path
  // so requests route through the Vite proxy (http://localhost:5069/api/v1/...) same-origin.
  const metaEnv = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
  const useProxy = String(metaEnv.VITE_USE_DEV_API_PROXY || "").toLowerCase() === "true";
  if ((useProxy || !config.baseURL) && typeof config.url === "string") {
    config.url = config.url.replace(/^https?:\/\/[^/]+(?::\d+)?(?=\/api\/|\/webhook\/|\/health)/i, "");
  }

  // Idempotency safety: preserve idempotencyKey in the body payload
  const idempotencyHeader = config.headers["Idempotency-Key"] || config.headers["idempotency-key"];
  if (idempotencyHeader && config.data && typeof config.data === "object" && !(config.data instanceof FormData)) {
    if (!config.data.idempotencyKey) {
      config.data.idempotencyKey = idempotencyHeader;
    }
  }

  // Idempotency headers are whitelisted on backend CORS allowedHeaders

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else {
    config.headers["Content-Type"] = config.headers["Content-Type"] || "application/json";
  }

  if (!isAuthEndpoint(config.url)) {
    let token = getStoredAuthToken() || tokenService.getAccessToken() || tokenService.getRawStoredToken();
    if (token && typeof isTokenExpired === "function" && isTokenExpired(token)) {
      token = null;
    }

    const existingAuth =
      typeof config.headers.get === "function"
        ? config.headers.get("Authorization")
        : config.headers.Authorization || config.headers.authorization;

    if (existingAuth && typeof existingAuth === "string" && existingAuth.startsWith("Bearer ")) {
      const headerToken = existingAuth.slice(7).trim();
      if (headerToken && typeof isTokenExpired === "function" && isTokenExpired(headerToken)) {
        if (typeof config.headers.delete === "function") {
          config.headers.delete("Authorization");
          config.headers.delete("authorization");
        } else {
          delete config.headers.Authorization;
          delete config.headers.authorization;
        }
      }
    }

    if (token) {
      const currentAuth =
        typeof config.headers.get === "function"
          ? config.headers.get("Authorization")
          : config.headers.Authorization || config.headers.authorization;

      if (!currentAuth) {
        if (typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else if (config.headers.authorization && !config.headers.Authorization) {
        config.headers.Authorization = config.headers.authorization;
        delete config.headers.authorization;
      }
    }
  }

  return config;
});

// -----------------------------------------------------------------------------
// Inbound Response Interceptor (The Reactive Catch Pipeline - Section 5 & 6)
// -----------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;

    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    if (original._skipSessionClear || original._skipAuthRefresh) {
      return Promise.reject(error);
    }

    if (isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }

    // Do not attempt refresh if user has no stored session or refresh token
    if (!tokenService.getRefreshToken() && !tokenService.hasSession()) {
      return Promise.reject(error);
    }

    // Loop prevention: If already retried, trigger terminal logout
    if (original._retry) {
      if (!original._skipSessionClear) {
        tokenService.clearAll();
      }
      return Promise.reject(error);
    }

    original._retry = true;

    // Concurrency Manager: Mutex Lock + Subscriber Queue
    if (tokenService.isRefreshing()) {
      return new Promise((resolve, reject) => {
        tokenService.enqueueRequest(
          (newToken) => {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          },
          (rejectErr) => reject(rejectErr),
        );
      });
    }

    // ACQUIRE LOCK: isRefreshing = true
    tokenService.setIsRefreshing(true);

    let newToken;
    try {
      // Send SINGLE call to /api/v1/auth/refresh-token
      const refreshResult = await executeSilentRefresh();
      newToken = refreshResult.token;

      // FLUSH QUEUE: Resolve all paused requests with new token
      tokenService.drainQueueSuccess(newToken);
    } catch (refreshError) {
      // FLUSH QUEUE: Reject all paused requests
      tokenService.drainQueueFailure(refreshError);

      // Trigger Global Logout only on definitive auth rejection (400, 401, 403)
      const isAuthRejection = [400, 401, 403].includes(refreshError?.response?.status);
      if (isAuthRejection && !original._skipSessionClear) {
        tokenService.clearAll();
      }

      return Promise.reject(refreshError);
    } finally {
      // RELEASE LOCK: isRefreshing = false
      tokenService.setIsRefreshing(false);
    }

    // Retry initial request OUTSIDE the refresh try/catch block
    // Business errors (400, 404, 422, 500) will reject naturally without wiping session
    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  },
);

export default api;
