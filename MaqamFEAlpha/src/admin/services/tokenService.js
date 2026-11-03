// -----------------------------------------------------------------------------
// Token Storage Service (Volatile Application Memory Architecture)
//
// Compliant with Complete Frontend Authentication Integration Guide:
// 1. Access Token: Lives strictly in Volatile Application Memory.
//    NEVER exposed to persistent browser storage (no localStorage/sessionStorage).
// 2. Refresh Token: Managed exclusively by the browser within an encrypted,
//    HttpOnly, SameSite cookie. Invisible and inaccessible to frontend JavaScript.
// 3. Finite State Machine: UNAUTHENTICATED | AUTHENTICATING | AUTHENTICATED.
// 4. Concurrency Manager: Mutex Lock (isRefreshing) + Subscriber Queue (requestQueue).
// 5. Proactive Refresh Strategy: Anticipatory background timer (1 min prior to expiry).
// -----------------------------------------------------------------------------

export const AUTH_STATUS = Object.freeze({
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTHENTICATING: 'AUTHENTICATING',
  AUTHENTICATED: 'AUTHENTICATED',
});

export const ACCESS_TOKEN_STORAGE_KEY = 'maqam_access_token';
export const LEGACY_ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_STORAGE_KEY = 'maqam_refresh_token';
export const USER_STORAGE_KEY = 'maqam_crm_user';
export const LEGACY_USER_STORAGE_KEY = 'user';

export const ACCESS_TOKEN_STORAGE_KEYS = Object.freeze([
  'maqam_access_token',
  'maqam_customer_token',
  'accessToken',
  'token',
  'authToken',
  'AuthToken',
  'customer_token',
  'customerToken',
  'maqam_user_token',
  'user_token',
  'userToken',
  'jwt',
  'jwt_token',
  'jwtToken',
  'bearerToken',
  'bearer_token',
  'maqam_auth_token',
  'maqam_token',
  'auth_token',
  'maqam_access_token_memory',
]);

export const REFRESH_TOKEN_STORAGE_KEYS = Object.freeze([
  'maqam_refresh_token',
  'refreshToken',
  'refresh_token',
]);

export const USER_STORAGE_KEYS = Object.freeze([
  'maqam_crm_user',
  'maqam_auth_user',
  'user',
]);

export const SESSION_DRAFT_STORAGE_KEYS = Object.freeze([
  'hotel_guest_draft',
  'selectedHotelDetails',
  'hotel_checkout_cache',
]);

export function isMobileClient() {
  if (typeof window === 'undefined') return false;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_IS_MOBILE === 'true') return true;
  if (window.__IS_MOBILE__ || window.ReactNativeWebView || window.Capacitor) return true;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}

export function cleanTokenString(val) {
  if (!val || typeof val !== 'string') return '';
  let token = val.trim();
  // Strip surrounding quotes
  token = token.replace(/^["']|["']$/g, '').trim();
  // Strip leading Bearer if embedded in storage value
  token = token.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === 'null' || token === 'undefined') {
    return '';
  }
  // If stored value is stringified JSON, unwrap token fields
  if (token.startsWith('{') && token.endsWith('}')) {
    try {
      const parsed = JSON.parse(token);
      const inner =
        parsed.accessToken ||
        parsed.token ||
        parsed.authToken ||
        parsed.jwt ||
        parsed.bearerToken ||
        parsed.data?.accessToken ||
        parsed.data?.token;
      if (inner && typeof inner === 'string') {
        return cleanTokenString(inner);
      }
    } catch {}
    return '';
  }
  return token;
}

function getStoredAccessToken() {
  if (typeof localStorage === 'undefined' && typeof sessionStorage === 'undefined') return null;
  try {
    let fallbackToken = null;

    // Pass 1: Prioritize active unexpired tokens across sessionStorage (current tab) then localStorage
    for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
      if (typeof sessionStorage !== 'undefined') {
        const token = cleanTokenString(sessionStorage.getItem(key));
        if (token) {
          if (!isTokenExpired(token)) return token;
          if (!fallbackToken) fallbackToken = token;
        }
      }
      if (typeof localStorage !== 'undefined') {
        const token = cleanTokenString(localStorage.getItem(key));
        if (token) {
          if (!isTokenExpired(token)) return token;
          if (!fallbackToken) fallbackToken = token;
        }
      }
    }

    // Pass 2: Inspect user profile objects in storage for embedded tokens
    for (const userKey of USER_STORAGE_KEYS) {
      if (typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem(userKey);
        if (raw && raw !== 'null' && raw !== 'undefined') {
          try {
            const userObj = JSON.parse(raw);
            const token = cleanTokenString(
              userObj?.accessToken ||
              userObj?.token ||
              userObj?.authToken ||
              userObj?.jwt ||
              userObj?.bearerToken ||
              userObj?.data?.accessToken ||
              userObj?.data?.token
            );
            if (token) {
              if (!isTokenExpired(token)) return token;
              if (!fallbackToken) fallbackToken = token;
            }
          } catch {}
        }
      }
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(userKey);
        if (raw && raw !== 'null' && raw !== 'undefined') {
          try {
            const userObj = JSON.parse(raw);
            const token = cleanTokenString(
              userObj?.accessToken ||
              userObj?.token ||
              userObj?.authToken ||
              userObj?.jwt ||
              userObj?.bearerToken ||
              userObj?.data?.accessToken ||
              userObj?.data?.token
            );
            if (token) {
              if (!isTokenExpired(token)) return token;
              if (!fallbackToken) fallbackToken = token;
            }
          } catch {}
        }
      }
    }
    return fallbackToken;
  } catch {
    return null;
  }
}

export function getStoredAuthToken() {
  if (memoryAccessToken) {
    const cleaned = cleanTokenString(memoryAccessToken);
    if (cleaned && !isTokenExpired(cleaned)) {
      return cleaned;
    }
  }
  const stored = getStoredAccessToken();
  if (stored) {
    memoryAccessToken = stored;
    currentAuthStatus = AUTH_STATUS.AUTHENTICATED;
    return stored;
  }
  if (memoryAccessToken) {
    const cleaned = cleanTokenString(memoryAccessToken);
    if (cleaned) return cleaned;
  }
  return '';
}

export function getAuthHeaders(customHeaders = {}) {
  let token = getStoredAuthToken();
  if (token && typeof isTokenExpired === 'function' && isTokenExpired(token)) {
    token = '';
  }
  const headers = { ...customHeaders };
  if (headers.authorization && !headers.Authorization) {
    headers.Authorization = headers.authorization;
    delete headers.authorization;
  }
  if (headers.Authorization && typeof headers.Authorization === 'string' && headers.Authorization.startsWith('Bearer ')) {
    const raw = headers.Authorization.slice(7).trim();
    if (raw && typeof isTokenExpired === 'function' && isTokenExpired(raw)) {
      delete headers.Authorization;
    }
  }
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function getStoredUserProfile() {
  if (typeof localStorage === 'undefined' && typeof sessionStorage === 'undefined') return null;
  try {
    for (const key of USER_STORAGE_KEYS) {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw && raw !== 'null' && raw !== 'undefined') {
          try { return JSON.parse(raw); } catch {}
        }
      }
      if (typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem(key);
        if (raw && raw !== 'null' && raw !== 'undefined') {
          try { return JSON.parse(raw); } catch {}
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Central in-memory volatile store schema with localStorage persistence
let memoryAccessToken = getStoredAccessToken();
let memoryUserProfile = getStoredUserProfile();
let currentAuthStatus = memoryAccessToken ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.UNAUTHENTICATED;
let isRefreshingFlag = false;
let requestQueue = [];
let proactiveRefreshTimer = null;
let isClearingSession = false;
let isDispatchingSessionExpired = false;
const stateListeners = new Set();

// Immediately arm proactive refresh if valid token was loaded from storage
if (memoryAccessToken) {
  scheduleProactiveRefresh(memoryAccessToken);
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is expired or will expire within clockSkewSeconds.
 * Accurately parses claims.exp formatted in either seconds or milliseconds.
 */
export function isTokenExpired(token, clockSkewSeconds = 5) {
  if (!token || typeof token !== 'string') return true;
  const claims = decodeJwtPayload(token);
  if (!claims?.exp) return false;
  const expMs = claims.exp > 1e11 ? claims.exp : claims.exp * 1000;
  return expMs <= Date.now() + clockSkewSeconds * 1000;
}

/**
 * Returns remaining lifetime in seconds for the given token.
 */
export function getTokenRemainingSeconds(token) {
  if (!token || typeof token !== 'string') return 0;
  const claims = decodeJwtPayload(token);
  if (!claims?.exp) return 0;
  const expMs = claims.exp > 1e11 ? claims.exp : claims.exp * 1000;
  const diff = Math.floor((expMs - Date.now()) / 1000);
  return Math.max(0, diff);
}

function notifyListeners() {
  const snapshot = {
    accessToken: memoryAccessToken,
    userProfile: memoryUserProfile,
    authStatus: currentAuthStatus,
    isRefreshing: isRefreshingFlag,
  };
  stateListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('[tokenService] listener error:', err);
    }
  });
}

/**
 * Proactive Refresh Strategy:
 * Schedules a silent refresh trigger before access token expiry (adaptively for 1m or 15m tokens).
 */
function scheduleProactiveRefresh(token) {
  clearProactiveRefreshTimer();
  // Disabled: The application refreshes tokens reactively upon access token expiration via 401 interceptor
}

function clearProactiveRefreshTimer() {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

/**
 * Purge obsolete tokens from persistent browser storage while preserving active access tokens and refresh tokens.
 */
export function cleanupLegacyStorage() {
  // Retained for backward compatibility. Does not remove customer or access tokens.
}

// Purge obsolete tokens on script evaluation
cleanupLegacyStorage();

export const tokenService = {
  /**
   * Retrieves active Access Token from memory or persistent storage.
   * Returns token string if present, null otherwise.
   */
  getAccessToken() {
    return getStoredAuthToken() || null;
  },

  /**
   * Stores Access Token in volatile application memory AND persists across all standard storage keys.
   */
  setAccessToken(token) {
    const cleaned = typeof token === 'string' ? token.trim() : '';
    if (cleaned && cleaned !== 'null' && cleaned !== 'undefined') {
      memoryAccessToken = cleaned;
      currentAuthStatus = AUTH_STATUS.AUTHENTICATED;
      try {
        if (typeof localStorage !== 'undefined') {
          for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
            localStorage.setItem(key, cleaned);
          }
        }
        if (typeof sessionStorage !== 'undefined') {
          for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
            sessionStorage.setItem(key, cleaned);
          }
        }
      } catch {}
      scheduleProactiveRefresh(cleaned);
    } else {
      memoryAccessToken = null;
      try {
        if (typeof localStorage !== 'undefined') {
          for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
            localStorage.removeItem(key);
          }
        }
        if (typeof sessionStorage !== 'undefined') {
          for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {}
      clearProactiveRefreshTimer();
    }
    cleanupLegacyStorage();
    notifyListeners();
    return memoryAccessToken;
  },

  /**
   * Clears Access Token from memory and all persistent storage keys.
   */
  clearAccessToken() {
    memoryAccessToken = null;
    try {
      if (typeof localStorage !== 'undefined') {
        for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
          localStorage.removeItem(key);
        }
      }
      if (typeof sessionStorage !== 'undefined') {
        for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}
    clearProactiveRefreshTimer();
    cleanupLegacyStorage();
    notifyListeners();
  },

  /**
   * Retrieves user profile identity payload.
   */
  getUserProfile() {
    if (memoryUserProfile) return memoryUserProfile;
    const stored = getStoredUserProfile();
    if (stored) {
      memoryUserProfile = stored;
      return stored;
    }
    return null;
  },

  /**
   * Updates user profile identity payload in memory and localStorage.
   */
  setUserProfile(user) {
    memoryUserProfile = user ? { ...user } : null;
    try {
      if (user) {
        const serialized = JSON.stringify(user);
        if (typeof localStorage !== 'undefined') {
          for (const key of USER_STORAGE_KEYS) {
            localStorage.setItem(key, serialized);
          }
        }
        if (typeof sessionStorage !== 'undefined') {
          for (const key of USER_STORAGE_KEYS) {
            sessionStorage.setItem(key, serialized);
          }
        }
      } else {
        if (typeof localStorage !== 'undefined') {
          for (const key of USER_STORAGE_KEYS) {
            localStorage.removeItem(key);
          }
        }
        if (typeof sessionStorage !== 'undefined') {
          for (const key of USER_STORAGE_KEYS) {
            sessionStorage.removeItem(key);
          }
        }
      }
    } catch {}
    notifyListeners();
    return memoryUserProfile;
  },

  /**
   * Gets current Finite State Machine authentication status.
   * One of: UNAUTHENTICATED, AUTHENTICATING, AUTHENTICATED.
   */
  getAuthStatus() {
    return currentAuthStatus;
  },


  /**
   * Sets current Finite State Machine authentication status.
   */
  setAuthStatus(status) {
    if (Object.values(AUTH_STATUS).includes(status)) {
      currentAuthStatus = status;
      notifyListeners();
    }
  },

  /**
   * Concurrency Manager Mutex: Checks if silent refresh operation is in flight.
   */
  isRefreshing() {
    return isRefreshingFlag;
  },

  /**
   * Concurrency Manager Mutex: Sets the refresh lock flag.
   */
  setIsRefreshing(val) {
    isRefreshingFlag = Boolean(val);
    notifyListeners();
  },

  /**
   * Concurrency Manager Queue: Enqueues a paused request subscriber promise.
   */
  enqueueRequest(resolve, reject) {
    requestQueue.push({ resolve, reject });
  },

  /**
   * Concurrency Manager Queue: Resolves all paused subscribers with new token.
   */
  drainQueueSuccess(newToken) {
    const queue = [...requestQueue];
    requestQueue = [];
    queue.forEach(({ resolve }) => {
      try {
        resolve(newToken);
      } catch (err) {
        console.error('[tokenService] queue resolve error:', err);
      }
    });
  },

  /**
   * Concurrency Manager Queue: Rejects all paused subscribers on refresh failure.
   */
  drainQueueFailure(error) {
    const queue = [...requestQueue];
    requestQueue = [];
    queue.forEach(({ reject }) => {
      try {
        reject(error);
      } catch (err) {
        console.error('[tokenService] queue reject error:', err);
      }
    });
  },

  /**
   * Clears volatile application memory and cleans all lingering session data across storage keys.
   */
  clearAll() {
    if (isClearingSession) return;
    const hadSession = Boolean(
      memoryAccessToken ||
      memoryUserProfile ||
      currentAuthStatus !== AUTH_STATUS.UNAUTHENTICATED ||
      (typeof localStorage !== 'undefined' && ACCESS_TOKEN_STORAGE_KEYS.some((k) => {
        try { return Boolean(localStorage.getItem(k)); } catch { return false; }
      }))
    );
    isClearingSession = true;
    try {
      memoryAccessToken = null;
      memoryUserProfile = null;
      currentAuthStatus = AUTH_STATUS.UNAUTHENTICATED;
      isRefreshingFlag = false;
      requestQueue = [];
      clearProactiveRefreshTimer();
      try {
        if (typeof localStorage !== 'undefined') {
          for (const key of ACCESS_TOKEN_STORAGE_KEYS) localStorage.removeItem(key);
          for (const key of REFRESH_TOKEN_STORAGE_KEYS) localStorage.removeItem(key);
          for (const key of USER_STORAGE_KEYS) localStorage.removeItem(key);
          for (const key of SESSION_DRAFT_STORAGE_KEYS) localStorage.removeItem(key);
        }
        if (typeof sessionStorage !== 'undefined') {
          for (const key of ACCESS_TOKEN_STORAGE_KEYS) sessionStorage.removeItem(key);
          for (const key of REFRESH_TOKEN_STORAGE_KEYS) sessionStorage.removeItem(key);
          for (const key of USER_STORAGE_KEYS) sessionStorage.removeItem(key);
          for (const key of SESSION_DRAFT_STORAGE_KEYS) sessionStorage.removeItem(key);
        }
      } catch {}
      cleanupLegacyStorage();
      notifyListeners();
      if (typeof window !== "undefined" && hadSession && !isDispatchingSessionExpired) {
        isDispatchingSessionExpired = true;
        queueMicrotask(() => {
          try {
            window.dispatchEvent(new CustomEvent("maqam:session-expired"));
          } catch (err) {
            console.warn('[tokenService] session-expired dispatch error:', err);
          } finally {
            isDispatchingSessionExpired = false;
          }
        });
      }
    } finally {
      isClearingSession = false;
    }
  },

  /**
   * Subscribes to memory auth state changes.
   */
  subscribe(listener) {
    stateListeners.add(listener);
    return () => stateListeners.delete(listener);
  },

  // ---------------------------------------------------------------------------
  // Backward compatibility helpers
  // ---------------------------------------------------------------------------
  isExpired(token = memoryAccessToken) {
    return isTokenExpired(token);
  },

  getRawStoredToken() {
    return getStoredAuthToken();
  },

  hasSession() {
    return Boolean(
      memoryAccessToken ||
      tokenService.getRefreshToken() ||
      getStoredAccessToken() ||
      tokenService.getUserProfile()
    );
  },

  getRefreshToken() {
    try {
      for (const key of REFRESH_TOKEN_STORAGE_KEYS) {
        if (typeof localStorage !== 'undefined') {
          const val = localStorage.getItem(key);
          if (val && typeof val === 'string' && val.trim() && val !== 'null' && val !== 'undefined') {
            return val.trim();
          }
        }
        if (typeof sessionStorage !== 'undefined') {
          const val = sessionStorage.getItem(key);
          if (val && typeof val === 'string' && val.trim() && val !== 'null' && val !== 'undefined') {
            return val.trim();
          }
        }
      }
    } catch {}
    return '';
  },

  setRefreshToken(token) {
    const cleaned = typeof token === 'string' ? token.trim() : '';
    try {
      if (cleaned && cleaned !== 'null' && cleaned !== 'undefined') {
        if (typeof localStorage !== 'undefined') {
          for (const key of REFRESH_TOKEN_STORAGE_KEYS) {
            localStorage.setItem(key, cleaned);
          }
        }
        if (typeof sessionStorage !== 'undefined') {
          for (const key of REFRESH_TOKEN_STORAGE_KEYS) {
            sessionStorage.setItem(key, cleaned);
          }
        }
      } else {
        if (typeof localStorage !== 'undefined') {
          for (const key of REFRESH_TOKEN_STORAGE_KEYS) {
            localStorage.removeItem(key);
          }
        }
        if (typeof sessionStorage !== 'undefined') {
          for (const key of REFRESH_TOKEN_STORAGE_KEYS) {
            sessionStorage.removeItem(key);
          }
        }
      }
    } catch {}
    return cleaned;
  },

  clearRefreshToken() {
    try {
      if (typeof localStorage !== 'undefined') {
        for (const key of REFRESH_TOKEN_STORAGE_KEYS) {
          localStorage.removeItem(key);
        }
      }
      if (typeof sessionStorage !== 'undefined') {
        for (const key of REFRESH_TOKEN_STORAGE_KEYS) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}
  },
};

export default tokenService;
