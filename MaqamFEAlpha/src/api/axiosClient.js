import axios from 'axios';
import { tokenService, getStoredAuthToken } from '../admin/services/tokenService';
import { executeSilentRefresh, isAuthPath } from '../admin/services/axios';
import { getApiBaseUrl } from '../configs/api';

const resolveBaseUrl = () => {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const useDevProxy = String(metaEnv.VITE_USE_DEV_API_PROXY || '').toLowerCase() === 'true';
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (useDevProxy && !isHttpsOrigin) {
    return '/api/v1';
  }

  const custom = metaEnv.VITE_API_BASE_URL;
  if (custom && typeof custom === 'string' && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  const root = getApiBaseUrl();
  return root ? `${root.replace(/\/+$/, '')}/api/v1` : 'http://localhost:5000/api/v1';
};

export const API_BASE_URL = resolveBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  timeout: 25000,
});

// Request interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    config.headers.Accept = config.headers.Accept || 'application/json';
    config.withCredentials = true;

    // Normalization: In dev proxy mode, strip any absolute API URL to a relative path
    const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    const useDevProxy = String(metaEnv.VITE_USE_DEV_API_PROXY || '').toLowerCase() === 'true';
    if (useDevProxy && config.url && typeof config.url === 'string') {
      config.url = config.url.replace(/^https?:\/\/[^/]+(?::\d+)?(?=\/api\/|\/webhook\/|\/health)/i, '');
    }

    // Normalization: If baseURL already ends with /api/v1 and config.url starts with /api/v1/, avoid duplication
    if (config.url && typeof config.url === 'string') {
      if (config.baseURL?.endsWith('/api/v1') && config.url.startsWith('/api/v1/')) {
        config.url = config.url.replace(/^\/api\/v1/, '');
      }
    }

    // Cross-origin preflight protection:
    // If request is cross-origin, strip unwhitelisted custom headers from request headers
    // and preserve in request body to avoid CORS preflight rejection.
    const idKey = config.headers['Idempotency-Key'] || config.headers['idempotency-key'];
    if (idKey && config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      if (!config.data.idempotencyKey) {
        config.data.idempotencyKey = idKey;
      }
    }
    if (typeof window !== 'undefined' && config.url && /^https?:\/\//i.test(config.url)) {
      try {
        const targetOrigin = new URL(config.url).origin;
        if (targetOrigin !== window.location.origin) {
          delete config.headers['Idempotency-Key'];
          delete config.headers['idempotency-key'];
        }
      } catch {}
    }

    const token = getStoredAuthToken() || tokenService.getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 token expiry with Concurrency Mutex Lock
apiClient.interceptors.response.use(
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

    // Never retry auth routes (/login, /refresh-token, /logout) on 401
    if (isAuthPath(original.url)) {
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
            resolve(apiClient(original));
          },
          (rejectErr) => reject(rejectErr)
        );
      });
    }

    // ACQUIRE LOCK: isRefreshing = true
    tokenService.setIsRefreshing(true);

    let newToken;
    try {
      const refreshResult = await executeSilentRefresh();
      newToken = refreshResult.token;
      tokenService.drainQueueSuccess(newToken);
    } catch (refreshError) {
      tokenService.drainQueueFailure(refreshError);
      if (!original._skipSessionClear) {
        tokenService.clearAll();
      }
      return Promise.reject(refreshError);
    } finally {
      tokenService.setIsRefreshing(false);
    }

    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${newToken}`;
    return apiClient(original);
  }
);

export default apiClient;
