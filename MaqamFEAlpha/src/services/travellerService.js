import api from "../components/stores/api.js";
import { TravellerAPI } from "../configs/api.js";
import { getAuthHeaders } from "../admin/services/tokenService.js";

/**
 * Service for interacting with User Traveller Profile API endpoints.
 * All requests authenticate via Bearer token in the Axios interceptor.
 */
export const travellerService = {
  /**
   * Get all travellers for the authenticated user.
   * Note: The backend returns 404 ("No travellers found for this user") when the list is empty.
   * We intercept this and return an empty array [] so the UI doesn't crash with 404.
   * @returns {Promise<Array>} Array of traveller objects
   */
  async getAllTravellers() {
    try {
      const response = await api.get(TravellerAPI.GetAll, {
        headers: getAuthHeaders(),
      });
      const data = response?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.data?.data)) return data.data.data;
      return [];
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 401) {
        return [];
      }
      return [];
    }
  },

  /**
   * Get a single traveller by ID.
   * @param {string} travellerId
   * @returns {Promise<Object>} Traveller profile object
   */
  async getTravellerById(travellerId) {
    try {
      const response = await api.get(TravellerAPI.GetById(travellerId), {
        headers: getAuthHeaders(),
      });
      return response?.data?.data || response?.data || null;
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  /**
   * Create a new traveller profile.
   * POST /api/v1/account/traveller/create
   * @param {Object} travellerData
   * @returns {Promise<Object>} Created traveller profile
   */
  async createTraveller(travellerData) {
    try {
      const response = await api.post(TravellerAPI.Create, travellerData, {
        headers: getAuthHeaders(),
      });
      return response?.data?.data || response?.data;
    } catch (err) {
      if (err?.response?.status === 404 && TravellerAPI.CreateAlt) {
        const fallback = await api.post(TravellerAPI.CreateAlt, travellerData, {
          headers: getAuthHeaders(),
        });
        return fallback?.data?.data || fallback?.data;
      }
      throw err;
    }
  },

  /**
   * Update an existing traveller profile.
   * PUT /api/v1/account/traveller/{travellerId}
   * @param {string} travellerId - MongoDB ID of traveller
   * @param {Object} travellerData - Fields to update
   * @returns {Promise<Object>} Updated traveller profile
   */
  async updateTraveller(travellerId, travellerData) {
    const cleanId = String(travellerId).trim();
    const response = await api.put(
      TravellerAPI.Update(cleanId),
      travellerData,
      {
        headers: getAuthHeaders(),
      }
    );
    return response?.data?.data || response?.data;
  },

  /**
   * Delete a traveller profile.
   * DELETE /api/v1/account/traveller/{travellerId}
   * @param {string} travellerId - MongoDB ID of traveller
   * @returns {Promise<Object>}
   */
  async deleteTraveller(travellerId) {
    const cleanId = String(travellerId).trim();
    const response = await api.delete(TravellerAPI.Delete(cleanId), {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Set traveller as default / primary traveller.
   * PATCH or PUT /api/v1/account/traveller/{travellerId}/default
   * @param {string} travellerId
   * @returns {Promise<Object>}
   */
  async setDefaultTraveller(travellerId) {
    const cleanId = String(travellerId).trim();
    try {
      const response = await api.patch(
        `/api/v1/account/traveller/${cleanId}/default`,
        {},
        { headers: getAuthHeaders() }
      );
      return response?.data?.data || response?.data;
    } catch {
      const fallback = await api.put(
        `/api/v1/account/traveller/${cleanId}/default`,
        {},
        { headers: getAuthHeaders() }
      );
      return fallback?.data?.data || fallback?.data;
    }
  },
};

export default travellerService;

