// -----------------------------------------------------------------------------
// Customer / Public Auth Session Service
//
// Delegates directly to central volatile application memory (tokenService).
// Strictly adheres to:
// - Access Token: Memory only (never in localStorage/sessionStorage).
// - Refresh Token: HttpOnly cookie managed exclusively by the browser.
// -----------------------------------------------------------------------------

import {
  tokenService,
  decodeJwtPayload,
  isTokenExpired,
  cleanupLegacyStorage,
  getStoredAuthToken,
  getAuthHeaders,
} from "../admin/services/tokenService.js";
import { applyTheme } from "../utils/theme.js";

export { getStoredAuthToken, getAuthHeaders };
export const decodeJwt = decodeJwtPayload;

export const normalizeUser = (raw, token = "") => {
  const user = raw || {};
  const claims = decodeJwt(token) || {};
  const prevUser = tokenService.getUserProfile() || {};
  const firstName = user.firstName || claims.firstName || prevUser.firstName || "";
  const lastName = user.lastName || claims.lastName || prevUser.lastName || "";
  return {
    ...claims,
    ...user,
    id: user.id || user._id || claims.id || claims.sub || claims.userId || "",
    firstName,
    lastName,
    name:
      user.name ||
      claims.name ||
      [firstName, lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      prevUser.name ||
      user.phone ||
      claims.phone ||
      "Maqam User",
    role: user.role || claims.role || "customer",
    phone: user.phone || claims.phone || "",
    email: user.email || claims.email || null,
    avatar: user.avatar || claims.avatar || null,
    theme: user.theme || claims.theme || "light",
  };
};

let isClearingAuthSession = false;

export const authSession = {
  getAccessToken: () => getStoredAuthToken() || tokenService.getAccessToken() || "",

  setAccessToken: (token) => tokenService.setAccessToken(token) || "",

  clearAccessToken: () => {
    tokenService.clearAccessToken();
  },

  getRefreshToken: () => tokenService.getRefreshToken() || "",

  setRefreshToken: (token) => tokenService.setRefreshToken(token) || "",

  clearRefreshToken: () => {
    tokenService.clearRefreshToken();
  },

  getStoredUser: () => tokenService.getUserProfile(),

  setStoredUser: (user) => {
    tokenService.setUserProfile(user);
  },

  clear: () => {
    if (isClearingAuthSession) return;
    isClearingAuthSession = true;
    try {
      tokenService.clearAll();
      cleanupLegacyStorage();
      applyTheme("light", { animate: false });
    } finally {
      isClearingAuthSession = false;
    }
  },

  isExpired: (token) => isTokenExpired(token),
};

export default authSession;
