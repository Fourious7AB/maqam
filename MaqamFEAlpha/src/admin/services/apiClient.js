import { axiosInstance } from './axios.js';
import { env } from '../config/env.js';

const jsonConfig = (config = {}) => {
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(config.headers || {}),
  };
  if (!isFormData && !headers['Content-Type'] && headers['Content-Type'] !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  return {
    ...config,
    headers,
  };
};

// Live-first execution: try the real backend (MongoDB) and only fall back to
// the local mock slice when the live call fails (network error, 4xx/5xx, or
// a missing endpoint). An empty-but-valid live response is returned as-is —
// a real empty list is a live state, not a failure. Mock mode
// (VITE_USE_MOCK_API=true) skips the live call entirely.
export const liveFirst = async (liveFn, mockFn) => {
  if (env.useMockApi) return mockFn(null);
  try {
    return await liveFn();
  } catch (error) {
    return mockFn(error);
  }
};

export const apiClient = {
  get: (url, config) => axiosInstance.get(url, jsonConfig(config)),
  post: (url, data, config) => axiosInstance.post(url, data, jsonConfig(config)),
  put: (url, data, config) => axiosInstance.put(url, data, jsonConfig(config)),
  patch: (url, data, config) => axiosInstance.patch(url, data, jsonConfig(config)),
  delete: (url, config) => axiosInstance.delete(url, jsonConfig(config)),
};

export const unwrapResponse = (response) => response?.data?.data ?? response?.data ?? null;
export const responseMessage = (response) => response?.data?.message || 'Request completed successfully';
