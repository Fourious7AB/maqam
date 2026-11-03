const Setting = require('./settings.model');
const logger = require('../../utils/logger');

/**
 * ─── DEFAULT SETTINGS CONFIGURATION ────────────────────
 * Built-in fallback defaults when a section is not yet saved in DB.
 */
const DEFAULT_SETTINGS = {
  general: {
    companyName: 'Maqam Travels',
    supportEmail: 'support@maqam.com',
    supportPhone: '+911180808080',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  },
  financial: {
    currency: 'USD',
    taxPercentage: 5,
    flightMarkupPercent: 2.5,
    hotelMarkupPercent: 5.0,
  },
  booking: {
    holdDeadlineMinutes: 60,
    cancellationGraceHours: 24,
    autoVoucherEnabled: true,
  },
  notifications: {
    emailSenderName: 'Maqam Travels Support',
    replyToEmail: 'support@maqam.com',
    smsAlertsEnabled: true,
  },
};

/**
 * Retrieve settings by section key.
 * Returns stored data from DB or built-in default values if unconfigured.
 *
 * @param {string} sectionName
 * @returns {Promise<object>}
 */
const getSettingsBySection = async (sectionName) => {
  try {
    const normalizedSection = String(sectionName || '').toLowerCase().trim();
    const doc = await Setting.findOne({ section: normalizedSection });

    if (doc && doc.data && Object.keys(doc.data).length > 0) {
      return doc.data;
    }

    return DEFAULT_SETTINGS[normalizedSection] || {};
  } catch (error) {
    logger.error(`Get settings failed for section '${sectionName}': ${error.message}`);
    throw error;
  }
};

/**
 * Upsert/Update settings for a section (Admin only).
 *
 * @param {string} sectionName
 * @param {object} payload
 * @param {string} adminId
 * @returns {Promise<object>}
 */
const updateSettingsBySection = async (sectionName, payload = {}, adminId = null) => {
  try {
    const normalizedSection = String(sectionName || '').toLowerCase().trim();

    const existing = await Setting.findOne({ section: normalizedSection });
    const mergedData = {
      ...(DEFAULT_SETTINGS[normalizedSection] || {}),
      ...(existing?.data || {}),
      ...payload,
    };

    const updated = await Setting.findOneAndUpdate(
      { section: normalizedSection },
      {
        $set: {
          data: mergedData,
          updatedBy: adminId || null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    logger.info(`Settings updated for section '${normalizedSection}' by admin ${adminId || 'system'}`);
    return updated.data;
  } catch (error) {
    logger.error(`Update settings failed for section '${sectionName}': ${error.message}`);
    throw error;
  }
};

/**
 * Get unified markup settings (flight, hotel, default/markPercent).
 * Checks both 'markup' and 'financial' sections with built-in fallbacks.
 *
 * @returns {Promise<object>}
 */
const getMarkupSettings = async () => {
  try {
    const financial = await getSettingsBySection('financial');
    const markupDoc = await Setting.findOne({ section: 'markup' });
    const markupData = markupDoc?.data || {};

    const flightMarkupPercent = Number(
      markupData.flightMarkupPercent ??
      markupData.markPercent ??
      markupData.markupPercent ??
      financial.flightMarkupPercent ??
      financial.markPercent ??
      financial.markupPercent ??
      2.5
    );

    const hotelMarkupPercent = Number(
      markupData.hotelMarkupPercent ??
      markupData.markPercent ??
      markupData.markupPercent ??
      financial.hotelMarkupPercent ??
      financial.markPercent ??
      financial.markupPercent ??
      5.0
    );

    const defaultMarkupPercent = Number(
      markupData.defaultMarkupPercent ??
      markupData.markPercent ??
      markupData.markupPercent ??
      financial.defaultMarkupPercent ??
      financial.markPercent ??
      financial.markupPercent ??
      5.0
    );

    // const markPercent = Number(
    //   markupData.markPercent ??
    //   markupData.markupPercent ??
    //   flightMarkupPercent ??
    //   2.5
    // );

    const currency = markupData.currency || financial.currency || 'USD';

    return {
      flightMarkupPercent,
      hotelMarkupPercent,
      defaultMarkupPercent,
      // markPercent,
      currency,
    };
  } catch (error) {
    logger.error(`Get markup settings failed: ${error.message}`);
    throw error;
  }
};

/**
 * Update/Set markup parameters from CRM side (Admin only).
 * Syncs updates across 'financial' and 'markup' settings sections.
 *
 * @param {object} payload
 * @param {string} adminId
 * @returns {Promise<object>}
 */
const updateMarkupSettings = async (payload = {}, adminId = null) => {
  try {
    const current = await getMarkupSettings();

    const incomingMarkPercent = payload.markPercent ?? payload.markupPercent;
    
    let flightMarkupPercent = payload.flightMarkupPercent;
    if (flightMarkupPercent === undefined && incomingMarkPercent !== undefined) {
      flightMarkupPercent = Number(incomingMarkPercent);
    }
    if (flightMarkupPercent === undefined) {
      flightMarkupPercent = current.flightMarkupPercent;
    }

    let hotelMarkupPercent = payload.hotelMarkupPercent;
    if (hotelMarkupPercent === undefined && incomingMarkPercent !== undefined) {
      hotelMarkupPercent = Number(incomingMarkPercent);
    }
    if (hotelMarkupPercent === undefined) {
      hotelMarkupPercent = current.hotelMarkupPercent;
    }

    let defaultMarkupPercent = payload.defaultMarkupPercent;
    if (defaultMarkupPercent === undefined && incomingMarkPercent !== undefined) {
      defaultMarkupPercent = Number(incomingMarkPercent);
    }
    if (defaultMarkupPercent === undefined) {
      defaultMarkupPercent = current.defaultMarkupPercent;
    }

    // const markPercent = Number(incomingMarkPercent ?? flightMarkupPercent ?? current.markPercent);
    const currency = String(payload.currency || current.currency || 'USD').toUpperCase();

    const newMarkupData = {
      flightMarkupPercent: Number(flightMarkupPercent),
      hotelMarkupPercent: Number(hotelMarkupPercent),
      defaultMarkupPercent: Number(defaultMarkupPercent),
      // markPercent: Number(markPercent),
      currency,
      updatedAt: new Date(),
    };

    // Update 'markup' section
    await updateSettingsBySection('markup', newMarkupData, adminId);

    // Sync into 'financial' section for backwards compatibility
    const currentFinancial = await getSettingsBySection('financial');
    await updateSettingsBySection(
      'financial',
      {
        ...currentFinancial,
        flightMarkupPercent: Number(flightMarkupPercent),
        hotelMarkupPercent: Number(hotelMarkupPercent),
        // markPercent: Number(markPercent),
        currency,
      },
      adminId
    );

    logger.info(`Markup settings updated by admin ${adminId || 'system'}`);
    return getMarkupSettings();
  } catch (error) {
    logger.error(`Update markup settings failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getSettingsBySection,
  updateSettingsBySection,
  getMarkupSettings,
  updateMarkupSettings,
  DEFAULT_SETTINGS,
};

