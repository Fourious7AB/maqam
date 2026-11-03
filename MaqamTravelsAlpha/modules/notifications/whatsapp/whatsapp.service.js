const axios = require('axios');
const logger = require('../../../utils/logger');

const GRAPH_API_VERSION = 'v19.0';

/**
 * Dispatches an approved WhatsApp Template message via Meta Cloud API
 *
 * @param {string} to - Recipient number with country code (e.g. '919876543210' or '966501234567')
 * @param {string} templateName - Approved template slug (e.g. 'booking_confirmation_v1')
 * @param {string} languageCode - e.g. 'en', 'en_US', 'ar'
 * @param {Array} bodyVariables - List of values replacing {{1}}, {{2}} in template
 * @param {string} mediaUrl - Optional PDF/image link to attach as Document Header
 */
const sendWhatsAppTemplate = async ({
  to,
  templateName,
  languageCode = 'en',
  bodyVariables = [],
  mediaUrl = null,
}) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    logger.warn(`[WhatsApp] Meta credentials not set. Mock dispatch to ${to} for template: ${templateName}`);
    return { success: true, provider: 'mock', messageId: `wa_mock_${Date.now()}` };
  }

  // Recipient phone must be plain digits without '+'
  const recipient = String(to).replace(/[^\d]/g, '');

  const components = [];

  // Header Component: Attach PDF Document if available
  if (mediaUrl) {
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: {
            link: mediaUrl,
            filename: 'MaqamTravels_Booking.pdf',
          },
        },
      ],
    });
  }

  // Body Component: Dynamic Variables {{1}}, {{2}}, etc.
  if (bodyVariables && bodyVariables.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyVariables.map((val) => ({
        type: 'text',
        text: String(val),
      })),
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const messageId = response.data?.messages?.[0]?.id;
    logger.info(`[WhatsApp] Dispatched template ${templateName} to ${recipient} (WAMID: ${messageId})`);

    return {
      success: true,
      provider: 'meta_whatsapp',
      messageId,
      data: response.data,
    };
  } catch (error) {
    const errorDetails = error.response?.data?.error || error.message;
    logger.error(`[WhatsApp] Dispatch failed for ${recipient}: ${JSON.stringify(errorDetails)}`);
    throw new Error(typeof errorDetails === 'object' ? errorDetails.message : errorDetails);
  }
};

module.exports = { sendWhatsAppTemplate };
