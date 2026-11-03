'use strict';

/**
 * modules/hotels/application/pricing.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuration-driven markup placeholder as pricing engine.
 * Calculates customer selling prices in integer minor units (paise for INR).
 */

/**
 * calculateSellingPrice
 * ─────────────────────────────────────────────────────────────────────────────
 * Applies configured markup and convenience fee to a supplier price and returns
 * all pricing components in integer minor units (paise for INR).
 *
 * Formula:
 *   customerTotalMinor = supplierAmountMinor + markupMinor + feeMinor
 *   markupMinor        = round(supplierAmountMinor * HOTEL_MARKUP_PERCENT / 100)
 *   feeMinor           = round(HOTEL_CONVENIENCE_FEE_INR * 100)  [INR only; 0 for other currencies]
 *
 * Environment variables:
 *   HOTEL_MARKUP_PERCENT       - Percentage markup applied to supplier price (default: 8)
 *   HOTEL_CONVENIENCE_FEE_INR  - Flat per-night convenience fee in INR major units (default: 200)
 *
 * @param {number} supplierAmountMinor - Supplier per-night price in minor units (paise).
 * @param {string} [currency='INR'] - ISO 4217 currency code. Convenience fee only applied for INR.
 * @returns {{
 *   supplierAmountMinor: number,
 *   markupMinor: number,
 *   feeMinor: number,
 *   discountMinor: number,
 *   customerTotalMinor: number,
 *   currency: string,
 *   pricingVersion: string
 * }} Pricing breakdown in minor units.
 */
const settingsService = require('../../crm/settings.service');

/**
 * Get dynamic hotel markup percentage from CRM settings, falling back to process.env.HOTEL_MARKUP_PERCENT or 8.
 */
const getHotelMarkupPercent = async () => {
  try {
    const markupSettings = await settingsService.getMarkupSettings();
    const markup = markupSettings?.hotelMarkupPercent ?? markupSettings?.defaultMarkupPercent;
    if (markup !== undefined && markup !== null && !isNaN(Number(markup))) {
      return Number(markup);
    }
  } catch (err) {
    // fallback
  }
  return parseFloat(process.env.HOTEL_MARKUP_PERCENT || '8');
};

const calculateSellingPrice = (supplierAmountMinor, currency = 'INR', customMarkupPercent = null) => {
  const markupPercent = customMarkupPercent !== null && customMarkupPercent !== undefined
    ? Number(customMarkupPercent)
    : parseFloat(process.env.HOTEL_MARKUP_PERCENT || '8');
  const convenienceFeeInr = parseFloat(process.env.HOTEL_CONVENIENCE_FEE_INR || '200');

  // Supplier price in paise
  const supplierPaise = Math.round(supplierAmountMinor);

  // Markup amount
  const markupPaise = Math.round(supplierPaise * (markupPercent / 100));

  // Flat convenience fee (only if currency is INR, else convert or omit)
  const feePaise = currency === 'INR' ? Math.round(convenienceFeeInr * 100) : 0;

  // Final selling price
  const customerTotalMinor = supplierPaise + markupPaise + feePaise;

  return {
    supplierAmountMinor: supplierPaise,
    markupMinor: markupPaise,
    feeMinor: feePaise,
    discountMinor: 0,
    customerTotalMinor,
    currency,
    pricingVersion: `env-p${markupPercent}-f${convenienceFeeInr}-v1`,
  };
};

module.exports = { calculateSellingPrice, getHotelMarkupPercent };

