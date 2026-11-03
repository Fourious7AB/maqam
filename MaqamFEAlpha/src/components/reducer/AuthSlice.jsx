import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../stores/api";
import { authSession, normalizeUser } from "../../services/authSession";
import tokenService from "../../admin/services/tokenService";
import { executeSilentRefresh } from "../../admin/services/axios";
import { applyTheme } from "../../utils/theme";

const saveAuthResponse = (response) => {
  const data = response?.data?.data ?? response?.data ?? {};
  const token = data.accessToken || data.token;
  const refreshToken = data.refreshToken;
  if (token) authSession.setAccessToken(token);
  if (refreshToken) authSession.setRefreshToken(refreshToken);
  const normalized = data.user ? normalizeUser(data.user, token) : null;
  if (normalized) authSession.setStoredUser(normalized);
  const userTheme = normalized?.theme === "dark" ? "dark" : "light";
  applyTheme(userTheme, { animate: false });
  return { ...data, user: normalized || data.user };
};

export const registerUser = createAsyncThunk("auth/registerUser", async (userData, { rejectWithValue }) => {
  try { return saveAuthResponse(await api.post("/api/v1/auth/register", userData)); }
  catch (error) { return rejectWithValue(error.response?.data || error.message); }
});

export const loginUser = createAsyncThunk("auth/loginUser", async (userData, { rejectWithValue }) => {
  try { return saveAuthResponse(await api.post("/api/v1/auth/login", userData)); }
  catch (error) { return rejectWithValue(error.response?.data || error.message); }
});

const OTP_SEND_PATH =
  String(import.meta.env.VITE_OTP_SEND_ENDPOINT || "").trim() ||
  "/api/v1/auth/send-otp";
const OTP_SEND_ALIAS_PATH = "/api/v1/auth/login/request-otp";
const OTP_SEND_FALLBACK_PATH = "/api/v1/otp/send-otp";
const OTP_VERIFY_PATH =
  String(import.meta.env.VITE_OTP_VERIFY_ENDPOINT || "").trim() ||
  "/api/v1/auth/verify-otp";
const OTP_VERIFY_ALIAS_PATH = "/api/v1/auth/login/verify-otp";
const OTP_VERIFY_FALLBACK_PATH = "/api/v1/otp/verify-otp";

export const requestLoginOtp = createAsyncThunk("auth/requestLoginOtp", async (phone, { rejectWithValue }) => {
  try {
    try {
      const res = await api.post(OTP_SEND_PATH, { phone });
      return res?.data || res;
    }
    catch (error) {
      if (error?.response?.status === 404) {
        try {
          const aliasRes = await api.post(OTP_SEND_ALIAS_PATH, { phone });
          return aliasRes?.data || aliasRes;
        }
        catch (aliasErr) {
          if (aliasErr?.response?.status === 404) {
            const fallbackRes = await api.post(OTP_SEND_FALLBACK_PATH, { phone });
            return fallbackRes?.data || fallbackRes;
          }
          throw aliasErr;
        }
      }
      throw error;
    }
  }
  catch (error) { return rejectWithValue(error.response?.data || error.message); }
});

export const verifyLoginOtp = createAsyncThunk("auth/verifyLoginOtp", async ({ phone, otp }, { rejectWithValue }) => {
  try {
    try { return saveAuthResponse(await api.post(OTP_VERIFY_PATH, { phone, otp })); }
    catch (error) {
      if (error?.response?.status === 404) {
        try { return saveAuthResponse(await api.post(OTP_VERIFY_ALIAS_PATH, { phone, otp })); }
        catch (aliasErr) {
          if (aliasErr?.response?.status === 404) {
            return saveAuthResponse(await api.post(OTP_VERIFY_FALLBACK_PATH, { phone, otp }));
          }
          throw aliasErr;
        }
      }
      throw error;
    }
  }
  catch (error) { return rejectWithValue(error.response?.data || error.message); }
});

export const logoutUser = createAsyncThunk("auth/logoutUser", async (payload, { rejectWithValue }) => {
  try {
    const refreshToken = payload?.refreshToken || authSession.getRefreshToken() || tokenService.getRefreshToken();
    const response = await api.post("/api/v1/auth/logout", { refreshToken });
    authSession.clear();
    return response.data;
  } catch (error) {
    authSession.clear();
    return rejectWithValue(error.response?.data || error.message);
  }
});

export const forgotPassword = createAsyncThunk("auth/forgotPassword", async (phone, { rejectWithValue }) => {
  try { return await api.post("/api/v1/auth/forgot-password", { phone }); }
  catch (error) { return rejectWithValue(error.response?.data || error.message); }
});

export const verifyOtp = createAsyncThunk("auth/verifyOtp", async (resetToken, { rejectWithValue }) => {
  try { return await api.post("/api/v1/auth/verify-otp", { resetToken }); }
  catch (error) { return rejectWithValue(error.response?.data || error.message); }
});

export const resetPassword = createAsyncThunk("auth/resetPassword", async (passwordData, { rejectWithValue }) => {
  try { return await api.post("/api/v1/auth/reset-password", passwordData); }
  catch (error) { return rejectWithValue(error.response?.data || error.message); }
});

export const refreshToken = createAsyncThunk("auth/refreshToken", async (_, { rejectWithValue }) => {
  try {
    const { token, user } = await executeSilentRefresh();
    return { accessToken: token, user };
  } catch (error) {
    authSession.clear();
    return rejectWithValue(error.response?.data || error.message);
  }
});

const initialUser = authSession.getStoredUser();
const initialToken = authSession.getAccessToken();

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/v1/auth/me");
      const user =
        response.data?.data?.user ||
        response.data?.data ||
        response.data?.user ||
        response.data;
      if (user && typeof user === "object") {
        const normalized = normalizeUser(user, authSession.getAccessToken());
        authSession.setStoredUser(normalized);
        return normalized;
      }
      return user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch user profile",
      );
    }
  },
);

export const updateCurrentUserProfile = createAsyncThunk(
  "auth/updateCurrentUserProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const payload = {};
      const first = (profileData.firstName && typeof profileData.firstName === "string") ? profileData.firstName.trim() : "";
      const last = (profileData.lastName && typeof profileData.lastName === "string") ? profileData.lastName.trim() : "";
      if (first) payload.firstName = first;
      if (last) payload.lastName = last;

      const fullName = (profileData.name && typeof profileData.name === "string")
        ? profileData.name.trim()
        : `${first} ${last}`.trim();
      if (fullName) payload.name = fullName;

      if (profileData.email && typeof profileData.email === "string" && profileData.email.trim()) {
        payload.email = profileData.email.trim().toLowerCase();
      }
      if (profileData.phone) {
        const cleanPhone = String(profileData.phone).replace(/\D/g, "").slice(-10);
        if (cleanPhone) payload.phone = cleanPhone;
      }
      if (
        typeof profileData.avatar === "string" &&
        /^https?:\/\//i.test(profileData.avatar.trim())
      ) {
        payload.avatar = profileData.avatar.trim();
      }

      let response;
      try {
        response = await api.patch("/api/v1/auth/me", payload);
      } catch (patchErr) {
        if (patchErr?.response?.status === 405 || patchErr?.response?.status === 404 || patchErr?.response?.status === 400) {
          response = await api.put("/api/v1/auth/me", payload);
        } else {
          throw patchErr;
        }
      }
      const user =
        response.data?.data?.user ||
        response.data?.data ||
        response.data?.user ||
        response.data;
      if (user && typeof user === "object") {
        const normalized = normalizeUser(user, authSession.getAccessToken());
        authSession.setStoredUser(normalized);
        return normalized;
      }
      return user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to update profile",
      );
    }
  },
);

export const deleteCurrentUserAccount = createAsyncThunk(
  "auth/deleteCurrentUserAccount",
  async ({ permanent = false } = {}, { rejectWithValue }) => {
    try {
      const url = `/api/v1/auth/me${permanent ? "?permanent=true" : ""}`;
      const response = await api.delete(url);
      authSession.clear();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("maqam:session-expired"));
      }
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete account",
      );
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: initialUser,
    token: initialToken || null,
    accessToken: initialToken || null,
    refreshToken: authSession.getRefreshToken() || null,
    isAuthenticated: Boolean(initialUser || initialToken),
  },
  reducers: {
    setAuthSession: (state, action) => {
      const user = action.payload?.user || null;
      const token = action.payload?.accessToken || action.payload?.token || null;
      const refreshToken = action.payload?.refreshToken || null;
      state.user = user;
      state.token = token || state.token;
      state.accessToken = token || state.accessToken;
      state.refreshToken = refreshToken || state.refreshToken;
      state.isAuthenticated = Boolean(user || token || state.token);
      if (token) authSession.setAccessToken(token);
      if (refreshToken) authSession.setRefreshToken(refreshToken);
      if (user) authSession.setStoredUser(user);
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
    updateUserProfile: (state, action) => {
      const updated = { ...(state.user || {}), ...(action.payload || {}) };
      state.user = updated;
      authSession.setStoredUser(updated);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload?.user || null;
        state.token = action.payload?.accessToken || action.payload?.token || null;
        state.accessToken = state.token;
        state.refreshToken = action.payload?.refreshToken || null;
        state.isAuthenticated = Boolean(state.user || state.token);
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload?.user || null;
        state.token = action.payload?.accessToken || action.payload?.token || null;
        state.accessToken = state.token;
        state.refreshToken = action.payload?.refreshToken || null;
        state.isAuthenticated = Boolean(state.user || state.token);
      })
      .addCase(verifyLoginOtp.fulfilled, (state, action) => {
        state.user = action.payload?.user || null;
        state.token = action.payload?.accessToken || action.payload?.token || null;
        state.accessToken = state.token;
        state.refreshToken = action.payload?.refreshToken || null;
        state.isAuthenticated = Boolean(state.user || state.token);
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.user = action.payload?.user || authSession.getStoredUser();
        state.token = action.payload?.accessToken || null;
        state.accessToken = action.payload?.accessToken || null;
        state.isAuthenticated = Boolean(state.user || state.token);
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        }
      })
      .addCase(updateCurrentUserProfile.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        }
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setAuthSession, clearAuth, logout, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
