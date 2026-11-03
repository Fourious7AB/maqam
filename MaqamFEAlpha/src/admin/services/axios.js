import axios from 'axios';
import { env } from '../config/env.js';
import { tokenService, AUTH_STATUS, isMobileClient, getStoredAuthToken } from './tokenService.js';

axios.defaults.headers.common.Accept = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

export const axiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 25000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// For production backend without proxy
if (!env.useDevProxy && env.directApiBaseUrl) {
  axiosInstance.defaults.baseURL = env.directApiBaseUrl;
}

// Endpoint paths are written as full paths ("/api/v1/...") for the direct
// backend (host-only baseURL). In dev-proxy mode baseURL already ends with
// "/api/v1", so strip the duplicate prefix before the request is built.
export const normalizeUrl = (baseURL = '', url = '') => {
  if (/\/api\/v1\/?$/.test(String(baseURL)) && String(url).startsWith('/api/v1/')) {
    return String(url).replace(/^\/api\/v1/, '');
  }
  return url;
};

export const isAuthPath = (url = '') => {
  const value = String(url);
  return /\/auth\/(login|send-otp|verify-otp|refresh-token|logout)(?:$|\/)|\/login\/(request-otp|verify-otp)(?:$|\/)|\/otp\/(send-otp|verify-otp)(?:$|\/)/.test(
    value,
  );
};

export const parseRefreshResponse = (response) => {
  const body = response?.data ?? {};
  const data = body?.data ?? body;
  const token = data?.accessToken ?? data?.token ?? body?.accessToken ?? body?.token;
  const refreshToken = data?.refreshToken ?? body?.refreshToken ?? null;
  if (!token || typeof token !== 'string') {
    throw new Error('Refresh endpoint did not return an access token.');
  }
  return { token, refreshToken, user: data?.user ?? body?.user ?? null };
};

let activeSilentRefreshPromise = null;

/**
 * Executes Silent Refresh Handshake (Dual-Platform Support):
 * Sends POST /api/v1/auth/refresh-token with withCredentials: true.
 * Web: Transmits HttpOnly cookie automatically.
 * Mobile: Attaches x-refresh-token header and { refreshToken } payload if available.
 * 
 * Deduplicated with activeSilentRefreshPromise to ensure only one in-flight request.
 */
export async function executeSilentRefresh() {
  const storedRefreshToken = tokenService.getRefreshToken();
  if (!storedRefreshToken && !tokenService.hasSession()) {
    throw new Error('No active session or refresh token available.');
  }

  if (activeSilentRefreshPromise) {
    return activeSilentRefreshPromise;
  }

  tokenService.setIsRefreshing(true);

  activeSilentRefreshPromise = (async () => {
    try {
      const baseURL = env.useDevProxy ? env.apiBaseUrl : env.directApiBaseUrl;
      const fullURL = `${baseURL}${normalizeUrl(baseURL, env.authRefreshPath)}`;

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      // x-refresh-token is not in the server's Access-Control-Allow-Headers,
      // so browsers block the request. Body payload below is the default.
      if (env.sendRefreshHeader && storedRefreshToken) {
        headers['x-refresh-token'] = storedRefreshToken;
      }

      // Send { refreshToken } payload and x-refresh-token header if stored; withCredentials ensures HttpOnly cookie is attached
      const payload = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};

      const response = await axios.post(
        fullURL,
        payload,
        {
          withCredentials: true,
          headers,
          timeout: 15000,
        },
      );

      const { token, refreshToken: newRt, user } = parseRefreshResponse(response);
      tokenService.setAccessToken(token);
      if (newRt) {
        tokenService.setRefreshToken(newRt);
      }
      if (user) {
        tokenService.setUserProfile(user);
      }
      return { token, refreshToken: newRt, user };
    } finally {
      tokenService.setIsRefreshing(false);
      activeSilentRefreshPromise = null;
    }
  })();

  return activeSilentRefreshPromise;
}

/**
 * Global helper for force refresh calls.
 * Used during bootup and proactive background refresh.
 */
const isAuthRejection = (error) => [400, 401, 403].includes(error?.response?.status);

export async function forceRefreshAccessToken() {
  try {
    const result = await executeSilentRefresh();
    tokenService.drainQueueSuccess(result.token);
    return result.token;
  } catch (error) {
    tokenService.drainQueueFailure(error);
    // Network/CORS failures cannot prove the session is invalid; only clear
    // on a definitive server rejection.
    if (isAuthRejection(error)) {
      tokenService.clearAll();
    }
    throw error;
  }
}

export async function ensureAccessToken() {
  const currentToken = tokenService.getAccessToken();
  if (currentToken) return currentToken;
  return forceRefreshAccessToken();
}

// -----------------------------------------------------------------------------
// Outbound Request Interceptor (The Pre-Flight Pipeline - Section 4)
// -----------------------------------------------------------------------------
axiosInstance.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers.Accept ??= 'application/json';
  config.withCredentials = true; // Always enable cross-site credential passing

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else {
    config.headers['Content-Type'] ??= 'application/json';
  }

  config.url = normalizeUrl(config.baseURL, config.url);

  // If this is an auth endpoint, bypass Authorization header
  if (!isAuthPath(config.url)) {
    const token = getStoredAuthToken() || tokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// -----------------------------------------------------------------------------
// Inbound Response Interceptor (The Reactive Catch Pipeline - Section 5 & 6)
// -----------------------------------------------------------------------------
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;

    // Pass non-401 errors through to caller
    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    if (original._skipSessionClear || original._skipAuthRefresh) {
      return Promise.reject(error);
    }

    // Never retry auth routes (/login, /refresh-token, /logout) on 401
    if (isAuthPath(original.url)) {
      return Promise.reject(error);
    }

    // Do not attempt refresh if user has no stored session or refresh token
    if (!tokenService.getRefreshToken() && !tokenService.hasSession()) {
      return Promise.reject(error);
    }

    // Loop prevention: If request was already retried, trigger terminal logout
    if (original._retry) {
      if (!original._skipSessionClear) {
        tokenService.clearAll();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('maqam:session-expired'));
        }
      }
      return Promise.reject(error);
    }

    original._retry = true;

    // Concurrency Manager: Mutex Lock + Subscriber Queue
    if (tokenService.isRefreshing()) {
      // PAUSE this request and enqueue in waiting list
      return new Promise((resolve, reject) => {
        tokenService.enqueueRequest(
          (newToken) => {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(axiosInstance(original));
          },
          (rejectErr) => reject(rejectErr),
        );
      });
    }

    // ACQUIRE LOCK: isRefreshing = true
    tokenService.setIsRefreshing(true);

    let newToken;
    try {
      // Send SINGLE call to refresh endpoint
      const refreshResult = await executeSilentRefresh();
      newToken = refreshResult.token;

      // FLUSH QUEUE: Resolve all paused requests with new token
      tokenService.drainQueueSuccess(newToken);
    } catch (refreshError) {
      // FLUSH QUEUE: Reject all paused requests
      tokenService.drainQueueFailure(refreshError);

      if (!original._skipSessionClear) {
        // Trigger Global Logout Routine
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
    return axiosInstance(original);
  },
);

// Proactive refresh listener
if (typeof window !== 'undefined') {
  window.addEventListener('maqam:proactive-refresh', () => {
    // Only proactively refresh if currently authenticated
    if (tokenService.getAuthStatus() === AUTH_STATUS.AUTHENTICATED && !tokenService.isRefreshing()) {
      forceRefreshAccessToken().catch(() => {});
    }
  });
}
