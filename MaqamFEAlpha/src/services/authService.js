import api from "../components/stores/api";
import { AuthAPI } from "../configs/api";
import { authSession, normalizeUser } from "./authSession";
import { executeSilentRefresh } from "../admin/services/axios";

const buildProfilePayload = (profileData = {}) => {
  const payload = {};
  const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : "");
  if (text(profileData.firstName)) payload.firstName = text(profileData.firstName);
  if (text(profileData.lastName)) payload.lastName = text(profileData.lastName);
  if (text(profileData.email)) payload.email = text(profileData.email);
  if (profileData.phone) {
    const cleanPhone = String(profileData.phone).replace(/\D/g, "").slice(-10);
    if (cleanPhone) payload.phone = cleanPhone;
  }
  if (typeof profileData.avatar === "string" && /^https?:\/\//i.test(profileData.avatar.trim())) {
    payload.avatar = profileData.avatar.trim();
  }
  if (profileData.theme === "light" || profileData.theme === "dark") {
    payload.theme = profileData.theme;
  }
  return payload;
};

// Persist the server's version of the user into the single session store
// (tokenService) so Redux, context and the Profile page all read fresh data.
const persistProfile = (response) => {
  const data = response?.data;
  const updatedUser = data?.data?.user || data?.data || data?.user || data;
  if (updatedUser && typeof updatedUser === "object") {
    authSession.setStoredUser(normalizeUser(updatedUser, authSession.getAccessToken()));
  }
  return updatedUser;
};

/**
 * Service for interacting with Authentication and User Profile API endpoints.
 * All authenticated requests use Bearer tokens injected automatically by the Axios interceptor.
 */
export const authService = {
  /**
   * Get currently authenticated user profile
   * GET /api/v1/auth/me
   * @returns {Promise<Object>} User profile object
   */
  async getMe() {
    const response = await api.get(AuthAPI.MeApi);
    const data = response?.data;
    return data?.data?.user || data?.data || data?.user || data;
  },

  /**
   * Update own user profile
   * PUT /api/v1/auth/me
   * @param {Object} profileData - { firstName, lastName, email, phone, avatar }
   * @returns {Promise<Object>} Updated user profile
   */
  async updateProfile(profileData) {
    return persistProfile(await api.put("/api/v1/auth/me", buildProfilePayload(profileData)));
  },

  /**
   * Patch own user profile (PATCH alias)
   * PATCH /api/v1/auth/me
   * @param {Object} profileData
   * @returns {Promise<Object>} Updated user profile
   */
  async patchProfile(profileData) {
    return persistProfile(await api.patch("/api/v1/auth/me", buildProfilePayload(profileData)));
  },

  /**
   * Delete / deactivate own user profile
   * DELETE /api/v1/auth/me?permanent=false
   * @param {boolean} [permanent=false] - true for physical database deletion, false for deactivation
   * @returns {Promise<Object>} API response envelope
   */
  async deleteAccount(permanent = false) {
    const url = `/api/v1/auth/me${permanent ? "?permanent=true" : ""}`;
    const response = await api.delete(url);
    authSession.clear();
    try {
      localStorage.removeItem("AuthToken");
      localStorage.removeItem("user");
    } catch {
      /* ignore */
    }
    return response?.data;
  },

  /**
   * Invalidate user session
   * POST /api/v1/auth/logout
   * @returns {Promise<Object>}
   */
  async logout() {
    try {
      const response = await api.post(AuthAPI.LogoutApi, {});
      return response?.data;
    } finally {
      authSession.clear();
    }
  },

  /**
   * Refresh access token via silent handshake
   * POST /api/v1/auth/refresh-token
   * @returns {Promise<Object>}
   */
  async refreshToken() {
    const { token, user } = await executeSilentRefresh();
    return { accessToken: token, user };
  },

  /**
   * Request password reset link / OTP
   * POST /api/v1/auth/forgot-password
   * @param {string} phone
   * @returns {Promise<Object>}
   */
  async forgotPassword(phone) {
    const response = await api.post(AuthAPI.ForgotPasswordApi, { phone });
    return response?.data;
  },

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password/{token}
   * @param {string} token
   * @param {Object} passwordData - { password, confirmPassword }
   * @returns {Promise<Object>}
   */
  async resetPassword(token, passwordData) {
    const response = await api.post(AuthAPI.ResetPasswordApi(token), passwordData);
    return response?.data;
  },
};

export default authService;
