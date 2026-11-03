const clean = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .split(/[\s|#-]/)[0] // remove trailing comments or markers like -----|
    .replace(/\/+$/, '');

// A host without a protocol ("192.168.1.102:5000") would be treated by axios
// as a RELATIVE url and resolved against the current page route, producing
// requests like "/admin/192.168.1.102:5000/...". Ensure a protocol is present.
const withProtocol = (value) => {
  if (!value || value.startsWith('/') || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return value;
  }
  return `http://${value}`;
};

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

const resolveApiRoot = () => {
  const configured = clean(
    metaEnv.VITE_API_BASE_URL ||
    metaEnv.VITE_API_URL_S ||
    metaEnv.VITE_API_URL ||
    ''
  );

  // In browser on HTTPS (e.g. Vercel deployment https://...):
  // Plain http:// or private LAN IP (192.168.x.x, localhost) will be blocked
  // by browsers as Mixed Content. Fallback to production HTTPS API.
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (isHttpsOrigin) {
    const isPrivateOrInsecure =
      !configured ||
      configured.startsWith('http://') ||
      /^(http:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|localhost|127\.0\.0\.1)/i.test(configured);

    if (isPrivateOrInsecure) {
      return 'https://server2.vais.co.in/maqam';
    }
  }

  return withProtocol(configured || 'https://server2.vais.co.in/maqam');
};

const isDev = metaEnv.MODE !== 'production';
const useDevProxy = isDev && String(metaEnv.VITE_USE_DEV_API_PROXY ?? 'false').toLowerCase() === 'true';
const directApiRoot = resolveApiRoot();

export const env = {
  // Direct API calls to production backend
  apiBaseUrl: useDevProxy ? '/api/v1' : directApiRoot,
  directApiBaseUrl: directApiRoot,
  useDevProxy,
  // POST with credentials; refresh token is an HttpOnly cookie. Frontend JS never reads it.
  authRefreshPath: metaEnv.VITE_AUTH_REFRESH_ENDPOINT || '/api/v1/auth/refresh-token',
  authMePath: metaEnv.VITE_AUTH_ME_ENDPOINT || '/api/v1/auth/me',
  loginPath: metaEnv.VITE_AUTH_LOGIN_ENDPOINT || '/api/v1/auth/login',
  otpSendPath: metaEnv.VITE_OTP_SEND_ENDPOINT || '/api/v1/auth/send-otp',
  otpVerifyPath: metaEnv.VITE_OTP_VERIFY_ENDPOINT || '/api/v1/auth/verify-otp',
  authLogoutPath: metaEnv.VITE_AUTH_LOGOUT_ENDPOINT || '/api/v1/auth/logout',
  otpSendFallbackPath: metaEnv.VITE_OTP_SEND_FALLBACK_ENDPOINT || '/api/v1/otp/send-otp',
  otpVerifyFallbackPath: metaEnv.VITE_OTP_VERIFY_FALLBACK_ENDPOINT || '/api/v1/otp/verify-otp',
  // The backend CORS allow-list does not include X-Refresh-Token, so the
  // refresh token is sent in the JSON body. Enable only once CORS allows it.
  sendRefreshHeader: String(metaEnv.VITE_SEND_REFRESH_HEADER ?? 'false').toLowerCase() === 'true',
  appEnv: metaEnv.MODE || 'development',
  // Live-first data mode: sections read the real backend API (MongoDB) by
  // default. Each mock-branch API calls the live endpoint first and only
  // falls back to local mock data when the backend fails (or the endpoint
  // does not exist yet). Set VITE_USE_MOCK_API=true to force mock mode.
  useMockApi: String(metaEnv.VITE_USE_MOCK_API ?? 'false').toLowerCase() === 'true',
  useMockAuth: false,
};
