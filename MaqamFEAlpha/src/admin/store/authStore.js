import { create } from 'zustand';
import axios from 'axios';
import { env } from '../config/env.js';
import { apiClient } from '../services/apiClient.js';
import { tokenService, AUTH_STATUS, decodeJwtPayload, getStoredAuthToken } from '../services/tokenService.js';
import { executeSilentRefresh, normalizeUrl } from '../services/axios.js';
import { applyTheme } from '../../utils/theme.js';

export function normaliseUser(raw, token) {
  const userData = raw?.user ?? raw?.data?.user ?? raw?.data ?? raw ?? {};
  const claims = decodeJwtPayload(token) || {};
  const prevUser = tokenService.getUserProfile() || {};
  const firstName = userData.firstName || claims.firstName || prevUser.firstName || '';
  const lastName = userData.lastName || claims.lastName || prevUser.lastName || '';

  return {
    ...claims,
    ...userData,
    id: userData.id ?? userData._id ?? claims.id ?? claims.sub ?? claims.userId ?? '',
    role: userData.role ?? claims.role ?? '',
    phone: userData.phone ?? claims.phone ?? '',
    email: userData.email ?? claims.email ?? '',
    firstName,
    lastName,
    fullName:
      userData.fullName ||
      `${firstName} ${lastName}`.trim() ||
      userData.name ||
      claims.name ||
      prevUser.fullName ||
      'Authorized User',
    avatar: userData.avatar ?? null,
    isActive: userData.isActive ?? true,
    isVerified: userData.isVerified ?? false,
    isPhoneVerified: userData.isPhoneVerified ?? userData.phoneVerified ?? userData.isVerified ?? false,
    hotelId: userData.hotelId ?? claims.hotelId ?? '',
    hotelName: userData.hotelName ?? claims.hotelName ?? '',
    lastLogin: userData.lastLogin ?? null,
    createdAt: userData.createdAt ?? '',
    theme: userData.theme ?? claims.theme ?? 'light',
  };
}

let initHandshakePromise = null;

export const useAuthStore = create((set, get) => ({
  // Memory Store Schema (Section 2)
  accessToken: tokenService.getAccessToken(),
  user: tokenService.getUserProfile(),
  authStatus: tokenService.getAuthStatus(),
  loading: false,
  initialized: false,
  error: '',

  /**
   * Resets local in-memory authentication state (terminal teardown / failure).
   */
  clearLocalSession: () => {
    if (get().authStatus === AUTH_STATUS.UNAUTHENTICATED && !get().accessToken && !get().user) {
      return;
    }
    tokenService.clearAll();
    applyTheme('light', { animate: false });
    set({
      accessToken: null,
      user: null,
      authStatus: AUTH_STATUS.UNAUTHENTICATED,
      loading: false,
      initialized: true,
      error: '',
    });
  },

  setSession: (token, rawUser = null, refreshToken = null) => {
    const user = normaliseUser(rawUser, token);
    const rt = refreshToken || rawUser?.refreshToken || rawUser?.refresh_token;
    tokenService.setAccessToken(token);
    if (rt) {
      tokenService.setRefreshToken(rt);
    }
    tokenService.setUserProfile(user);
    tokenService.setAuthStatus(AUTH_STATUS.AUTHENTICATED);
    if (user?.theme === 'dark') {
      applyTheme('dark', { animate: false });
    } else {
      applyTheme('light', { animate: false });
    }
    set({
      accessToken: token,
      user,
      authStatus: AUTH_STATUS.AUTHENTICATED,
      error: '',
      initialized: true,
      loading: false,
    });
    return user;
  },

  updateUser: (patch) => {
    const current = get().user || {};
    const updated = { ...current, ...patch };
    tokenService.setUserProfile(updated);
    set({ user: updated });
    return updated;
  },

  /**
   * Initial Boot & Page Refresh Flow (The Silent Handshake - Section 3):
   * 1. Render App in Loading/Bootstrap Mode (status: AUTHENTICATING).
   * 2. Attempt Silent Handshake: POST /api/v1/auth/refresh-token with credentials.
   * 3. Evaluate Handshake Outcome:
   *    - Scenario A (Success - 200 OK): Store new accessToken, set AUTHENTICATED,
   *      fetch user's latest profile data (/api/v1/auth/me), render screen.
   *    - Scenario B (Failure - 401 / Network Error): set UNAUTHENTICATED,
   *      clear memory, protected routes redirect to Login.
   */
  initialize: async () => {
    // If already initialized and currently authenticated with active token, no need to re-handshake
    if (get().initialized && get().authStatus === AUTH_STATUS.AUTHENTICATED && tokenService.getAccessToken()) {
      return;
    }

    // Hydrate immediately from stored localStorage token if valid & unexpired
    const storedToken = getStoredAuthToken() || tokenService.getAccessToken();
    const storedUser = tokenService.getUserProfile();
    if (storedToken && !tokenService.isExpired(storedToken)) {
      set({
        accessToken: storedToken,
        user: storedUser,
        authStatus: AUTH_STATUS.AUTHENTICATED,
        initialized: true,
        loading: false,
        error: '',
      });

      // Best-effort profile refresh in background without clearing session on network blip
      try {
        const meResponse = await apiClient.get(env.authMePath, { _skipSessionClear: true, _skipAuthRefresh: true });
        const meData = meResponse?.data?.data ?? meResponse?.data ?? {};
        const resolvedUser = normaliseUser(meData, storedToken);
        tokenService.setUserProfile(resolvedUser);
        set({ user: resolvedUser });
      } catch (err) {
        // Log profile refresh notice without terminating session to avoid interrupting in-flight payment captures
        console.warn('[authStore] Profile sync notice on boot:', err?.message || err);
      }
      return;
    }

    if (initHandshakePromise) return initHandshakePromise;

    // If there is no stored refresh token and no active session, the user is unauthenticated.
    // Avoid firing an unnecessary POST /api/v1/auth/refresh-token.
    const storedRefreshToken = tokenService.getRefreshToken();
    if (!storedRefreshToken && !tokenService.hasSession()) {
      set({
        accessToken: null,
        user: null,
        authStatus: AUTH_STATUS.UNAUTHENTICATED,
        initialized: true,
        loading: false,
        error: '',
      });
      return;
    }

    tokenService.setAuthStatus(AUTH_STATUS.AUTHENTICATING);
    set({
      loading: true,
      authStatus: AUTH_STATUS.AUTHENTICATING,
      error: '',
    });

    initHandshakePromise = (async () => {
      try {
        // Step 2: Dispatch silent refresh handshake (HttpOnly cookie sent automatically)
        const { token: newToken, user: rawUser } = await executeSilentRefresh();

        if (!newToken) {
          throw new Error('No access token returned from silent handshake');
        }

        tokenService.setAccessToken(newToken);
        tokenService.setAuthStatus(AUTH_STATUS.AUTHENTICATED);

        // Fetch fresh profile from /api/v1/auth/me
        let resolvedUser = rawUser;
        try {
          const meResponse = await apiClient.get(env.authMePath, { _skipSessionClear: true, _skipAuthRefresh: true });
          const meData = meResponse?.data?.data ?? meResponse?.data ?? {};
          resolvedUser = normaliseUser(meData, newToken);
        } catch {
          resolvedUser = normaliseUser(rawUser || {}, newToken);
        }

        tokenService.setUserProfile(resolvedUser);

        set({
          accessToken: newToken,
          user: resolvedUser,
          authStatus: AUTH_STATUS.AUTHENTICATED,
          loading: false,
          initialized: true,
          error: '',
        });
      } catch {
        // Step 3 (Scenario B): Refresh failed or no active session cookie.
        // Do NOT destroy stored customer tokens or storage during background handshake failure!
        const existingToken = getStoredAuthToken() || tokenService.getAccessToken();
        const existingUser = tokenService.getUserProfile();
        set({
          accessToken: existingToken || null,
          user: existingUser || null,
          authStatus: existingToken ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.UNAUTHENTICATED,
          loading: false,
          initialized: true,
          error: '',
        });
      } finally {
        initHandshakePromise = null;
      }
    })();

    return initHandshakePromise;
  },

  sendOtp: async (phone) => {
    set({ loading: true, error: '' });
    try {
      const response = await apiClient.post(env.otpSendPath, { phone });
      const data = response?.data?.data ?? response?.data ?? {};
      set({ loading: false, error: '' });
      return {
        success: true,
        phone: data.phone || phone,
        expiresInSeconds: data.expiresInSeconds || 300,
        isNewUser: data.isNewUser,
        otp: data.otp,
      };
    } catch (error) {
      set({
        loading: false,
        error: error?.response?.data?.message || error.message || 'Failed to send OTP',
      });
      throw error;
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ loading: true, error: '' });
    try {
      const response = await apiClient.post(env.otpVerifyPath, { phone, otp });
      const data = response?.data?.data ?? response?.data ?? {};
      const token = data.accessToken ?? data.token;
      const refreshToken = data.refreshToken ?? data.refresh_token;

      if (!token) {
        throw new Error('OTP verification did not return an access token');
      }

      const user = { ...normaliseUser(data.user, token), isPhoneVerified: true };
      tokenService.setAccessToken(token);
      if (refreshToken) {
        tokenService.setRefreshToken(refreshToken);
      }
      tokenService.setUserProfile(user);
      tokenService.setAuthStatus(AUTH_STATUS.AUTHENTICATED);

      set({
        accessToken: token,
        user,
        authStatus: AUTH_STATUS.AUTHENTICATED,
        initialized: true,
        loading: false,
        error: '',
      });

      return user;
    } catch (error) {
      get().clearLocalSession();
      const errorMsg = error?.response?.data?.message || error.message || 'Invalid OTP';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  login: async (credentials) => {
    set({ loading: true, error: '' });
    try {
      const response = await apiClient.post(env.loginPath, credentials);
      const data = response?.data?.data ?? response?.data ?? {};
      const token = data.accessToken ?? data.token;
      const refreshToken = data.refreshToken ?? data.refresh_token;

      if (!token) {
        throw new Error('Login response did not contain an access token');
      }

      const user = normaliseUser(data.user, token);
      tokenService.setAccessToken(token);
      if (refreshToken) {
        tokenService.setRefreshToken(refreshToken);
      }
      tokenService.setUserProfile(user);
      tokenService.setAuthStatus(AUTH_STATUS.AUTHENTICATED);

      set({
        accessToken: token,
        user,
        authStatus: AUTH_STATUS.AUTHENTICATED,
        initialized: true,
        loading: false,
        error: '',
      });

      return user;
    } catch (error) {
      get().clearLocalSession();
      const errorMsg = error?.response?.data?.message || error.message || 'Unable to sign in.';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  validateUser: async () => {
    try {
      const token = tokenService.getAccessToken();
      if (!token) return false;

      const meResponse = await apiClient.get(env.authMePath);
      const meData = meResponse?.data?.data ?? meResponse?.data ?? {};
      const user = normaliseUser(meData, token);

      tokenService.setUserProfile(user);
      set({ user, authStatus: AUTH_STATUS.AUTHENTICATED, error: '' });
      return true;
    } catch (error) {
      if (error?.response?.status === 401) {
        get().clearLocalSession();
      }
      return false;
    }
  },

  /**
   * Global Logout & Terminal Session Teardown (Section 7):
   * 1. Network Notification (Best Effort): POST /api/v1/auth/logout with Bearer token & withCredentials: true.
   * 2. Memory Scrubbing: accessToken = null, userProfile = null, authStatus = UNAUTHENTICATED.
   * 3. Cache Purge: client-side session eviction.
   * 4. Navigation Routing: handled by caller/router to login page.
   */
  logout: async () => {
    const token = tokenService.getAccessToken();

    try {
      const baseURL = env.useDevProxy ? env.apiBaseUrl : env.directApiBaseUrl;
      const fullURL = `${baseURL}${normalizeUrl(baseURL, env.authLogoutPath)}`;
      const refreshToken = tokenService.getRefreshToken();
      await axios.post(
        fullURL,
        { refreshToken },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          withCredentials: true,
          timeout: 8000,
        },
      );
    } catch {
      // Best-effort notification; proceed with local teardown
    } finally {
      tokenService.clearAll();
      applyTheme('light', { animate: false });
      set({
        accessToken: null,
        user: null,
        authStatus: AUTH_STATUS.UNAUTHENTICATED,
        initialized: true,
        loading: false,
        error: '',
      });
    }
  },
}));

// Synchronize Zustand store whenever tokenService updates
tokenService.subscribe((snapshot) => {
  useAuthStore.setState({
    accessToken: snapshot.accessToken,
    user: snapshot.userProfile,
    authStatus: snapshot.authStatus,
  });
});
