const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('../../../utils/logger');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }
  return transporter;
};

/**
 * Sends a transactional email with optional PDF attachments
 */
const sendEmail = async ({ to, subject, htmlBody, attachments = [], mediaUrl = null }) => {
  // If SMTP credentials not provided, log dev fallback so developers aren't blocked
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn(`[Email Service] SMTP credentials not set. Dev fallback: to=${to} subject="${subject}"`);
    return {
      success: true,
      provider: 'mock',
      messageId: `mock_email_${Date.now()}`,
      data: { to, subject },
    };
  }

  const mailer = getTransporter();
  const mailAttachments = [...attachments];

  // If a remote PDF url (e.g. Cloudinary) is provided, stream it as an attachment
  if (mediaUrl) {
    try {
      const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
      mailAttachments.push({
        filename: 'MaqamTravels_Document.pdf',
        content: Buffer.from(response.data),
        contentType: 'application/pdf',
      });
    } catch (err) {
      logger.warn(`[Email Service] Failed to attach media from URL: ${mediaUrl} - ${err.message}`);
    }
  }

  const formattedHtml = (htmlBody && htmlBody.trim().length > 0)
    ? htmlBody
    : `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; line-height: 1.6;">
        <h2 style="color: #1e293b; margin-top: 0;">${subject}</h2>
        <p style="color: #475569; font-size: 15px;">Your booking status has been updated. Please check your account dashboard for full details.</p>
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} Maqam Travels. All rights reserved.</p>
      </div>
    `;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Maqam Travels'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
    to,
    subject,
    html: formattedHtml,
    attachments: mailAttachments,
  };

  const info = await mailer.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`[Email Service] 🔗 Ethereal Test Email Preview URL: ${previewUrl}`);
  }
  logger.info(`[Email Service] Sent email to ${to} (MessageID: ${info.messageId})`);
  return {
    success: true,
    provider: 'nodemailer',
    messageId: info.messageId,
    previewUrl: previewUrl || null,
    data: info,
  };
};

module.exports = { sendEmail, getTransporter };
