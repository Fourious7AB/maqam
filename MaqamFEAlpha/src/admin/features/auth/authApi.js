import { apiClient, unwrapResponse } from '../../services/apiClient';
import { env } from '../../config/env';

export const authApi = {
  async sendOtp(phone) {
    let response;
    try {
      // Primary contract: POST /api/v1/otp/send-otp
      response = await apiClient.post(env.otpSendPath, { phone });
    } catch (error) {
      // The project previously documented /api/v1/auth/send-otp. If an older
      // backend is still deployed, retry that route only after a 404.
      if (
        error?.response?.status === 404 &&
        env.otpSendFallbackPath &&
        env.otpSendFallbackPath !== env.otpSendPath
      ) {
        response = await apiClient.post(env.otpSendFallbackPath, { phone });
      } else {
        throw error;
      }
    }

    const data = unwrapResponse(response) || {};
    return {
      data,
      message: response?.data?.message,
      otp: data?.otp,
      phone: data?.phone || phone,
      isNewUser: data?.isNewUser,
      userExists: data?.userExists,
      expiresInSeconds: data?.expiresInSeconds ?? 300,
    };
  },

  async verifyOtp(payload) {
    try {
      const response = await apiClient.post(env.otpVerifyPath, payload);
      return { data: unwrapResponse(response), message: response?.data?.message };
    } catch (error) {
      // Keep compatibility with the older admin endpoint if the backend
      // still exposes /auth/verify-otp while the new OTP send route is /otp/*.
      if (error?.response?.status === 404 && env.otpVerifyFallbackPath) {
        const response = await apiClient.post(env.otpVerifyFallbackPath, payload);
        return { data: unwrapResponse(response), message: response?.data?.message };
      }
      throw error;
    }
  },

  async me() {
    const response = await apiClient.get(env.authMePath);
    return unwrapResponse(response);
  },

  async logout() {
    try {
      await apiClient.post(env.authLogoutPath, {});
    } catch {
      // Client-side access token is cleared by the auth store regardless.
    }
  },
};
