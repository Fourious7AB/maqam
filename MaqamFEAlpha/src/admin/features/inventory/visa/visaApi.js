import { apiClient, unwrapResponse } from '../../../services/apiClient';

const ROOT = '/api/v1/visa/admin';
const qs = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null));

const parseJson = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  return JSON.parse(value);
};

export const visaApi = {
  getDashboard: async () => unwrapResponse(await apiClient.get(`${ROOT}/dashboard`)),

  listApplications: async ({ status = '', assignedAgentId = '', search = '', page = 1, limit = 10 } = {}) => {
    const response = await apiClient.get(`${ROOT}/applications`, { params: qs({ status, assignedAgentId, search, page, limit }) });
    return { data: unwrapResponse(response) || [], meta: response?.data?.meta || {} };
  },

  getApplication: async (id) => unwrapResponse(await apiClient.get(`${ROOT}/applications/${id}`)),

  assignApplication: async (id, payload) => unwrapResponse(await apiClient.post(`${ROOT}/applications/${id}/assign`, payload)),

  updateApplicationStatus: async (id, payload) => unwrapResponse(await apiClient.patch(`${ROOT}/applications/${id}/status`, payload)),

  listGroups: async ({ groupStatus = '', paymentStatus = '', page = 1, limit = 10 } = {}) => {
    const response = await apiClient.get(`${ROOT}/groups`, { params: qs({ groupStatus, paymentStatus, page, limit }) });
    return { data: unwrapResponse(response) || [], meta: response?.data?.meta || {} };
  },

  getGroup: async (id) => unwrapResponse(await apiClient.get(`${ROOT}/groups/${id}`)),

  listCaseOfficers: async () => unwrapResponse(await apiClient.get(`${ROOT}/case-officers`)) || [],

  createCaseOfficer: async (payload) => unwrapResponse(await apiClient.post(`${ROOT}/case-officers`, payload)),

  listInventory: async ({ page = 1, limit = 10, country = '', visaType = '', status = '', search = '', includeDeleted = false } = {}) => {
    const response = await apiClient.get(`${ROOT}/inventory`, {
      params: qs({ page, limit, country, visaType, status, search, includeDeleted }),
    });
    return { data: unwrapResponse(response) || [], meta: response?.data?.meta || {} };
  },

  getInventory: async (id) => unwrapResponse(await apiClient.get(`${ROOT}/inventory/${id}`)),

  createInventory: async ({ fields, countryImage, countryPicture, countryFlag }) => {
    const body = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') body.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
    if (countryImage) body.append('countryImage', countryImage);
    if (countryPicture) body.append('countryPicture', countryPicture);
    if (countryFlag) body.append('countryFlag', countryFlag);
    return unwrapResponse(await apiClient.post(`${ROOT}/inventory`, body, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },

  updateInventory: async (id, { fields, countryImage, countryPicture, countryFlag }) => {
    const body = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) body.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
    if (countryImage) body.append('countryImage', countryImage);
    if (countryPicture) body.append('countryPicture', countryPicture);
    if (countryFlag) body.append('countryFlag', countryFlag);
    return unwrapResponse(await apiClient.put(`${ROOT}/inventory/${id}`, body, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },

  deleteInventory: async (id, permanent = false) => unwrapResponse(await apiClient.delete(`${ROOT}/inventory/${id}`, { params: { permanent } })),

  adjustStock: async (id, payload) => unwrapResponse(await apiClient.patch(`${ROOT}/inventory/${id}/stock`, payload, { headers: { 'Content-Type': 'application/json' } })),

  // Exported for forms: keeps JSON-string fields exactly aligned with the backend.
  parseJson,
};
