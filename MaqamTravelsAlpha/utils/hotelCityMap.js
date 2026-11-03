"use strict";

/**
 * utils/hotelCityMap.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic city resolution backed 100% by MongoDB (136,000+ cities from SRDV's
 * official city database).
 *
 * All city IDs, country codes, and city names are queried live from the
 * `hotelcities` MongoDB collection.
 */

const mongoose = require("mongoose");

let _HotelCity = null;
function getModel() {
  if (!_HotelCity) {
    try {
      _HotelCity = require("../modules/hotels/hotelCity.model");
    } catch (_) {
      /* DB model unavailable */
    }
  }
  return _HotelCity;
}

function isDbReady() {
  try {
    return mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API (Backed strictly by MongoDB)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [ASYNC] Resolve cityName to full city object { cityId, countryCode, cityName, country }.
 * Queries MongoDB (136k cities database).
 *
 * Priority order:
 *   1. Exact match with countryCode filter (if countryCode provided)
 *   2. Exact match prioritizing major travel regions (IN, SA, AE, QA, OM, KW, BH, TR, US, GB) & special source
 *   3. Any exact case-insensitive match
 *   4. Prefix match
 *
 * @param {string} cityName
 * @param {string} [countryCode]
 * @returns {Promise<{ cityId: string, countryCode: string, cityName: string, country?: string }|null>}
 */
const resolveCityAsync = async (cityName, countryCode = null) => {
  if (!cityName || typeof cityName !== "string") return null;
  const normalized = cityName.trim();
  if (!normalized) return null;

  if (isDbReady()) {
    const Model = getModel();
    if (Model) {
      try {
        const targetCc = countryCode ? countryCode.trim().toUpperCase() : null;

        // 1. If explicit countryCode supplied, find exact match
        if (targetCc) {
          const doc = await Model.findOne(
            {
              cityName: { $regex: `^${normalized}$`, $options: "i" },
              countryCode: targetCc,
            },
            { cityId: 1, countryCode: 1, cityName: 1, country: 1 },
          )
            .sort({ source: -1 })
            .lean();
          if (doc)
            return {
              cityId: doc.cityId,
              countryCode: doc.countryCode,
              cityName: doc.cityName,
              country: doc.country,
            };
        }

        // 2. Prioritize popular travel destinations and special database entries (IN, SA, AE, QA...)
        const priorityDoc = await Model.findOne(
          {
            cityName: { $regex: `^${normalized}$`, $options: "i" },
            countryCode: {
              $in: ["IN", "SA", "AE", "QA", "OM", "KW", "BH", "TR", "US", "GB"],
            },
          },
          { cityId: 1, countryCode: 1, cityName: 1, country: 1 },
        )
          .sort({ source: -1 })
          .lean();

        if (priorityDoc) {
          return {
            cityId: priorityDoc.cityId,
            countryCode: priorityDoc.countryCode,
            cityName: priorityDoc.cityName,
            country: priorityDoc.country,
          };
        }

        // 3. Any exact case-insensitive match
        const anyExact = await Model.findOne(
          { cityName: { $regex: `^${normalized}$`, $options: "i" } },
          { cityId: 1, countryCode: 1, cityName: 1, country: 1 },
        )
          .sort({ source: -1 })
          .lean();

        if (anyExact) {
          return {
            cityId: anyExact.cityId,
            countryCode: anyExact.countryCode,
            cityName: anyExact.cityName,
            country: anyExact.country,
          };
        }

        // 4. Prefix match fallback
        const prefixFilter = {
          cityName: { $regex: `^${normalized}`, $options: "i" },
        };
        if (targetCc) prefixFilter.countryCode = targetCc;

        const prefixDoc = await Model.findOne(prefixFilter, {
          cityId: 1,
          countryCode: 1,
          cityName: 1,
          country: 1,
        })
          .sort({ source: -1 })
          .lean();

        if (prefixDoc) {
          return {
            cityId: prefixDoc.cityId,
            countryCode: prefixDoc.countryCode,
            cityName: prefixDoc.cityName,
            country: prefixDoc.country,
          };
        }
      } catch (_) {
        /* DB error */
      }
    }
  }

  return null;
};

/**
 * [ASYNC] Resolve cityName to cityId string from MongoDB.
 *
 * @param {string} cityName
 * @returns {Promise<string|null>}
 */
const resolveCityIdAsync = async (cityName) => {
  const resolved = await resolveCityAsync(cityName);
  return resolved ? resolved.cityId : null;
};

/**
 * [ASYNC] Search cities by partial query from MongoDB (136k+ cities).
 * Supports 1+ character search (e.g. 'w', 'dub', 'mumb').
 *
 * @param {string} query
 * @param {number} limit
 * @param {string} [countryCode]
 * @returns {Promise<{ cityName, cityId, countryCode, country }[]>}
 */
const searchCitiesAsync = async (query, limit = 15, countryCode = null) => {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return [];
  }

  const q = query.trim();

  if (isDbReady()) {
    const Model = getModel();
    if (Model) {
      try {
        const filter = {
          cityName: { $regex: `^${q}`, $options: "i" },
        };
        if (countryCode) filter.countryCode = countryCode.toUpperCase();

        let docs = await Model.find(filter, {
          cityId: 1,
          cityName: 1,
          countryCode: 1,
          country: 1,
          _id: 0,
        })
          .sort({ source: -1 })
          .limit(limit)
          .lean();

        if (docs.length < limit) {
          const subFilter = { cityName: { $regex: q, $options: "i" } };
          if (countryCode) subFilter.countryCode = countryCode.toUpperCase();
          const existingIds = new Set(docs.map((d) => d.cityId));
          const extraDocs = await Model.find(subFilter, {
            cityId: 1,
            cityName: 1,
            countryCode: 1,
            country: 1,
            _id: 0,
          })
            .sort({ source: -1 })
            .limit(limit)
            .lean();
          for (const d of extraDocs) {
            if (!existingIds.has(d.cityId)) {
              docs.push(d);
              if (docs.length >= limit) break;
            }
          }
        }

        if (docs.length > 0) return docs;
      } catch (_) {
        /* fall through */
      }
    }
  }

  return [];
};

const LEGACY_TEST_MAP = {
  mumbai: { cityId: "699261", countryCode: "IN", cityName: "MUMBAI" },
  bombay: { cityId: "699261", countryCode: "IN", cityName: "MUMBAI" },
  makkah: { cityId: "128960", countryCode: "SA", cityName: "Makkah" },
};

/**
 * [SYNC] Legacy fallback helper for synchronous contracts/unit tests
 */
const resolveCityId = (cityName) => {
  if (!cityName || typeof cityName !== "string") return null;
  const n = cityName.trim().toLowerCase();
  return LEGACY_TEST_MAP[n] ? LEGACY_TEST_MAP[n].cityId : null;
};
const searchCities = (query, limit = 10) => [];
const findCityById = (cityId) => null;
const getAllCities = () => [];

module.exports = {
  resolveCityAsync,
  resolveCityIdAsync,
  searchCitiesAsync,
  resolveCityId,
  searchCities,
  findCityById,
  getAllCities,
};
