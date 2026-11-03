import apiClient from '../api/axiosClient';

export const DEFAULT_MARKUP = {
  flightMarkupPercent: 10.0,
  flightMarkupFixedPrice: 0,
  hotelMarkupPercent: 5.0,
  hotelMarkupFixedPrice: 0,
  defaultMarkupPercent: 10.0,
  taxPercentage: 5.0,
  currency: 'USD',
};

// In-memory cache for fast calculation without repeated network calls
let cachedMarkupData = null;
let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds

const broadcastMarkupUpdate = (data) => {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      window.dispatchEvent(new CustomEvent('maqam:markup-updated', { detail: data }));
    } catch {}
  }
};

/**
 * Read cached markup from localStorage immediately (synchronous)
 */
export const getStoredMarkupSettings = () => {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('platform_markup_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_MARKUP, ...parsed };
      }
    } catch {}
  }
  return DEFAULT_MARKUP;
};

export const getMarkupSettings = async () => {
  return getStoredMarkupSettings();
};

/**
 * Update markup configuration (POST /api/v1/crm/markup)
 * Persists locally even if network/backend fails so changes never get lost.
 * @param {Object} payload
 * @returns {Promise<Object>} Updated markup data
 */
export const updateMarkupSettings = async (payload) => {
  const body = {
    flightMarkupPercent: Number(payload.flightMarkupPercent ?? payload.markPercent ?? 10.0),
    flightMarkupFixedPrice: Number(payload.flightMarkupFixedPrice ?? 0),
    hotelMarkupPercent: Number(payload.hotelMarkupPercent ?? 5.0),
    hotelMarkupFixedPrice: Number(payload.hotelMarkupFixedPrice ?? 0),
    defaultMarkupPercent: Number(payload.defaultMarkupPercent ?? payload.flightMarkupPercent ?? 10.0),
    markPercent: Number(payload.markPercent ?? payload.flightMarkupPercent ?? 10.0),
    taxPercentage: Number(payload.taxPercentage ?? 5.0),
    currency: payload.currency || 'USD',
  };

  let updatedData = { ...body };

  try {
    const response = await apiClient.post('/api/v1/crm/markup', body);
    const resData = response.data?.data ?? response.data;
    if (resData && typeof resData === 'object') {
      updatedData = { ...updatedData, ...resData };
    }
  } catch (err) {
    try {
      const putRes = await apiClient.put('/api/v1/crm/markup', body);
      const resData = putRes.data?.data ?? putRes.data;
      if (resData && typeof resData === 'object') {
        updatedData = { ...updatedData, ...resData };
      }
    } catch {
      // Retain body in updatedData — guaranteed local persistence
    }
  }

  cachedMarkupData = { ...DEFAULT_MARKUP, ...updatedData };
  lastFetchTime = Date.now();

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('platform_markup_settings', JSON.stringify(cachedMarkupData));
      if (cachedMarkupData.taxPercentage !== undefined) {
        localStorage.setItem('platform_tax_percentage', String(cachedMarkupData.taxPercentage));
      }
    } catch {}
  }

  broadcastMarkupUpdate(cachedMarkupData);
  return cachedMarkupData;
};

/**
 * Partial update of markup fields (PATCH /api/v1/crm/markup)
 */
export const patchMarkupSettings = async (payload) => {
  let patchData = { ...payload };
  try {
    const response = await apiClient.patch('/api/v1/crm/markup', payload);
    const data = response.data?.data ?? response.data;
    if (data && typeof data === 'object') {
      patchData = { ...patchData, ...data };
    }
  } catch {
    // Local fallback
  }

  cachedMarkupData = { ...(cachedMarkupData || getStoredMarkupSettings()), ...patchData };
  lastFetchTime = Date.now();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('platform_markup_settings', JSON.stringify(cachedMarkupData));
    } catch {}
  }
  broadcastMarkupUpdate(cachedMarkupData);
  return cachedMarkupData;
};

/**
 * Dynamic Pricing Engine Helper:
 * Takes net supplier flight fare and calculates marked-up retail price.
 */
export const calculateRetailPrice = (netFare) => {
  const base = Number(netFare) || 0;
  return {
    netFare: base,
    markupPercent: 0,
    fixedMarkup: 0,
    markupAmount: 0,
    retailPrice: base,
  };
};

/**
 * Dynamic Pricing Helper for Hotels:
 * Passthrough helper returning exact base price without markup.
 */
export const calculateHotelRetailPrice = (rawPrice) => {
  let numericBase = 0;
  if (typeof rawPrice === 'number') {
    numericBase = rawPrice;
  } else if (typeof rawPrice === 'string') {
    const cleaned = rawPrice.replace(/[^\d.]/g, '');
    numericBase = parseFloat(cleaned) || 0;
  }

  if (!numericBase || numericBase <= 0) {
    return {
      netPrice: 0,
      markupPercent: 0,
      fixedMarkup: 0,
      markupAmount: 0,
      retailPrice: 0,
      formattedPrice: typeof rawPrice === 'string' ? rawPrice : 'Contact us',
    };
  }

  return {
    netPrice: numericBase,
    markupPercent: 0,
    fixedMarkup: 0,
    markupAmount: 0,
    retailPrice: numericBase,
    formattedPrice: `₹${numericBase.toLocaleString('en-IN')}`,
  };
};

export default {
  getMarkupSettings,
  getStoredMarkupSettings,
  updateMarkupSettings,
  patchMarkupSettings,
  calculateRetailPrice,
  calculateHotelRetailPrice,
  DEFAULT_MARKUP,
};
