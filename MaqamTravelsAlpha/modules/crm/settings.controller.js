const settingsService = require('./settings.service');
const { sendSuccess } = require('../../utils/apiResponse');

/**
 * ─── CRM SETTINGS CONTROLLER ───────────────────────────
 */

/**
 * Get settings for a specific section (e.g. general, financial, booking, notifications)
 * Returns the raw section object by default (matching API contract),
 * or standard envelope if ?envelope=true is requested.
 */
const getSettings = async (req, res, next) => {
  try {
    const { section } = req.params;
    if (String(section).toLowerCase() === 'markup') {
      const data = await settingsService.getMarkupSettings();
      if (req.query.envelope === 'true') {
        return sendSuccess(res, {
          message: 'Markup settings retrieved successfully',
          data,
        });
      }
      return res.status(200).json(data);
    }

    const data = await settingsService.getSettingsBySection(section);

    if (req.query.envelope === 'true') {
      return sendSuccess(res, {
        message: `Settings for section '${section}' retrieved successfully`,
        data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Update/Upsert settings for a specific section (Admin only)
 */
const updateSettings = async (req, res, next) => {
  try {
    const { section } = req.params;
    const adminId = req.user?._id || req.user?.id;

    if (String(section).toLowerCase() === 'markup') {
      const data = await settingsService.updateMarkupSettings(req.body, adminId);
      if (req.query.envelope === 'true') {
        return sendSuccess(res, {
          message: 'Markup settings updated successfully',
          data,
        });
      }
      return res.status(200).json(data);
    }

    const data = await settingsService.updateSettingsBySection(section, req.body, adminId);

    if (req.query.envelope === 'true') {
      return sendSuccess(res, {
        message: `Settings for section '${section}' updated successfully`,
        data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get CRM Markup configuration
 */
const getMarkup = async (req, res, next) => {
  try {
    const data = await settingsService.getMarkupSettings();
    return sendSuccess(res, {
      message: 'Markup settings retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update CRM Markup configuration (Admin only)
 */
const updateMarkup = async (req, res, next) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    const data = await settingsService.updateMarkupSettings(req.body, adminId);
    return sendSuccess(res, {
      message: 'Markup settings updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getMarkup,
  updateMarkup,
};

