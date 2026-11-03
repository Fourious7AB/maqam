import axios from "axios";
import { AIApi } from "../configs/api";

/**
 * Service for communicating with the AI Package Search & Trip Planner endpoint.
 */
export const aiService = {
  /**
   * Send a user prompt to the AI Planner chat API.
   * @param {string} userMessage - Natural language travel prompt
   * @returns {Promise<{
   *   reply: string,
   *   filtersApplied: { destination?: string, maxPrice?: number, maxDays?: number },
   *   isRelativeMatch: boolean,
   *   packages: Array<any>
   * }>}
   */
  async sendChatMessage(userMessage) {
    if (!userMessage || !userMessage.trim()) {
      throw new Error("Please enter a travel message or question.");
    }

    const response = await axios.post(
      AIApi.ChatApi,
      { userMessage: userMessage.trim() },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const payload = response.data?.data || response.data || {};

    return {
      reply:
        payload.reply ||
        response.data?.message ||
        "Here are the options matching your request:",
      filtersApplied: payload.filtersApplied || {},
      isRelativeMatch: Boolean(payload.isRelativeMatch),
      packages: Array.isArray(payload.packages) ? payload.packages : [],
      hotels: Array.isArray(payload.hotels) ? payload.hotels : [],
      flights: Array.isArray(payload.flights) ? payload.flights : [],
      needsMoreInfo: Boolean(payload.needsMoreInfo),
      missingFields: Array.isArray(payload.missingFields) ? payload.missingFields : [],
    };
  },
};

export default aiService;
