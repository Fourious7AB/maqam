'use strict';

const NotificationLog = require('./notification.model');
const { getNotificationQueue } = require('../../workers/notifications/notification.worker');
const logger = require('../../utils/logger');

class NotificationService {
  /**
   * =========================================================================
   * 🌟 1. UNIFIED SINGLE-FUNCTION ENTRY POINT (Omnichannel Orchestrator)
   * =========================================================================
   * Callers invoke this SINGLE function with target recipient and options.
   * Internally, it automatically resolves, coordinates, and calls the respective
   * sub-functions for Email, WhatsApp, and SMS.
   *
   * @param {Object} options
   * @param {string} [options.userId] - Optional User ID reference
   * @param {Object} options.recipient - Recipient contact info: { email: string, phone: string }
   * @param {Array<string>|string} [options.channels] - Target channels: ['email', 'whatsapp', 'sms'] or 'all'. Auto-inferred if omitted.
   * @param {string} options.eventType - Notification event identifier (e.g. 'booking_confirmation')
   * @param {string} [options.subject] - Subject line for Email
   * @param {string} [options.templateName] - Template identifier for WhatsApp HSM or branded Email
   * @param {Array} [options.variables] - Template variables (e.g. [name, pnr, amount])
   * @param {string} [options.messageText] - Plaintext SMS body or general message text
   * @param {string} [options.mediaUrl] - Remote URL for PDF invoice / ticket / voucher attachment
   * @param {string} [options.idempotencyKey] - Unique key for deduplication across retries
   * @returns {Promise<{ success: boolean, eventType: string, dispatchedChannels: string[], results: Object }>}
   */
  async sendNotification({
    userId = null,
    recipient = {},
    channels = null, // ['email', 'whatsapp', 'sms'] or 'all' (auto-resolves if omitted)
    eventType,
    subject = '',
    templateName = null,
    variables = [],
    messageText = '',
    mediaUrl = null,
    idempotencyKey = null,
  }) {
    try {
      // 1. Resolve target channels based on recipient contact capabilities
      const targetChannels = this._resolveChannels(channels, recipient);

      if (targetChannels.length === 0) {
        logger.warn(`[NotificationService] No valid channels resolved for recipient: ${JSON.stringify(recipient)}`);
        return {
          success: false,
          eventType,
          message: 'No valid recipient contact for requested channels',
          dispatchedChannels: [],
          results: {},
        };
      }

      // 2. Dispatch concurrently to each channel sub-task
      const dispatchPromises = targetChannels.map((channel) => {
        const channelKey = idempotencyKey ? `${idempotencyKey}:${channel}` : null;
        return this.enqueueNotification({
          userId,
          recipientEmail: recipient.email,
          recipientPhone: recipient.phone,
          channel,
          eventType,
          subject,
          templateName,
          variables,
          messageText,
          mediaUrl,
          idempotencyKey: channelKey,
        }).then((doc) => ({
          channel,
          success: true,
          status: doc?.status || 'queued',
          logId: doc?._id,
        })).catch((err) => ({
          channel,
          success: false,
          error: err.message,
        }));
      });

      const settled = await Promise.allSettled(dispatchPromises);
      const channelResults = {};
      settled.forEach((res) => {
        if (res.status === 'fulfilled') {
          channelResults[res.value.channel] = res.value;
        }
      });

      logger.info(`[NotificationService] '${eventType}' dispatched to [${targetChannels.join(', ')}]`);
      return {
        success: true,
        eventType,
        dispatchedChannels: targetChannels,
        results: channelResults,
      };
    } catch (err) {
      logger.error(`[NotificationService] sendNotification failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Helper: Resolves and validates target channels against available recipient contact data
   * @private
   */
  _resolveChannels(channels, recipient) {
    const available = [];
    const hasEmail = Boolean(recipient?.email && recipient.email.includes('@'));
    const hasPhone = Boolean(recipient?.phone && String(recipient.phone).trim().length >= 8);

    // If omitted or set to 'all', automatically route to all reachable channels
    if (!channels || channels === 'all') {
      if (hasEmail) available.push('email');
      if (hasPhone) {
        available.push('whatsapp');
        available.push('sms');
      }
      return available;
    }

    const requested = Array.isArray(channels) ? channels : [channels];
    return requested.filter((ch) => {
      if (ch === 'email' && hasEmail) return true;
      if (ch === 'whatsapp' && hasPhone) return true;
      if (ch === 'sms' && hasPhone) return true;
      return false;
    });
  }

  /**
   * =========================================================================
   * ⚙️ 2. LOW-LEVEL CHANNEL ENQUEUE (Idempotent Outbox Pipeline)
   * =========================================================================
   */
  async enqueueNotification({
    userId = null,
    recipientEmail = null,
    recipientPhone = null,
    channel, // 'email' | 'whatsapp' | 'sms'
    eventType,
    subject = '',
    templateName = null,
    variables = [],
    messageText = '',
    mediaUrl = null,
    idempotencyKey,
  }) {
    try {
      // 1. Check idempotency: avoid duplicate sending on retries
      if (idempotencyKey) {
        const existing = await NotificationLog.findOne({ idempotencyKey });
        if (existing && ['sent', 'delivered', 'queued', 'processing'].includes(existing.status)) {
          logger.info(`[Notification] Duplicate skipped for idempotencyKey: ${idempotencyKey}`);
          return existing;
        }
      }

      // 2. Persist audit log
      const logDoc = await NotificationLog.create({
        userId,
        recipient: { email: recipientEmail, phone: recipientPhone },
        channel,
        eventType,
        subject,
        templateName,
        bodyContent: messageText,
        metadata: { variables, mediaUrl },
        idempotencyKey,
        status: 'queued',
      });

      // 3. Queue into BullMQ
      const queue = getNotificationQueue();
      if (queue) {
        await queue.add(
          'send-notification',
          { logId: logDoc._id },
          {
            jobId: idempotencyKey ? String(idempotencyKey).replace(/[:/]/g, '_') : String(logDoc._id),
            attempts: 3,
            backoff: { type: 'exponential', delay: 4000 },
          }
        );
      } else {
        // Fallback for dev / non-Redis environments
        const { processNotificationJob } = require('../../workers/notifications/notification.worker');
        setTimeout(() => processNotificationJob(logDoc._id), 50);
      }

      return logDoc;
    } catch (err) {
      logger.error(`[Notification Service] Enqueue failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * =========================================================================
   * 🚀 3. HIGH-LEVEL HELPERS (Powered by single sendNotification)
   * =========================================================================
   */
  async sendBookingConfirmation({ booking, user, invoicePdfUrl = null }) {
    const bookingRef = booking.bookingReference || `BK-${booking._id}`;
    const destination = booking.details?.destination || booking.destination || 'Holy Makkah & Madinah';
    const customerName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Valued Customer';
    const totalAmount = booking.details?.totalPrice || booking.totalAmount || 0;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Maqam Travels</h1>
          <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">Booking Confirmation &amp; Receipt</p>
        </div>
        <div style="padding: 32px 28px; color: #334155; line-height: 1.6;">
          <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Your Booking is Confirmed! 🎉</h2>
          <p style="font-size: 15px; color: #475569;">Dear <strong>${customerName}</strong>,</p>
          <p style="font-size: 15px; color: #475569;">Thank you for booking with Maqam Travels. Your reservation has been successfully confirmed and your itinerary details are summarized below.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Booking Reference:</td>
                <td style="padding: 8px 0; font-family: monospace; font-weight: 600; color: #0f172a; text-align: right;">${bookingRef}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Destination / Tour:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-align: right; border-top: 1px solid #e2e8f0;">${destination}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Amount Paid:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #16a34a; text-align: right; border-top: 1px solid #e2e8f0;">₹${Number(totalAmount).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Status:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #16a34a; text-align: right; border-top: 1px solid #e2e8f0;">CONFIRMED</td>
              </tr>
            </table>
          </div>

          ${invoicePdfUrl ? `
          <div style="text-align: center; margin: 28px 0;">
            <a href="${invoicePdfUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Download Invoice PDF</a>
          </div>
          ` : ''}

          <p style="font-size: 13px; color: #64748b; margin-top: 28px;">If you have any questions or require special arrangements, please reach out to our 24/7 dedicated support team.</p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} Maqam Travels. All rights reserved.
        </div>
      </div>
    `;

    return this.sendNotification({
      userId: user?._id || user?.id,
      recipient: { email: user?.email, phone: user?.phone },
      channels: ['email', 'whatsapp'],
      eventType: 'booking_confirmation',
      subject: `Booking Confirmed: ${bookingRef} - Maqam Travels`,
      templateName: 'booking_confirmation_v1',
      variables: [customerName, bookingRef, destination, totalAmount],
      messageText: emailHtml,
      mediaUrl: invoicePdfUrl,
      idempotencyKey: `booking:${booking._id}:confirm`,
    });
  }

  async sendFlightTicketed({ booking, pnr, user, eTicketPdfUrl = null }) {
    const origin = booking.origin || booking.details?.destination?.split('-')[0] || 'Origin';
    const destination = booking.destination || booking.details?.destination?.split('-')[1] || 'Destination';

    return this.sendNotification({
      userId: user?._id || user?.id,
      recipient: { email: user?.email, phone: user?.phone },
      channels: ['email', 'whatsapp'],
      eventType: 'ticket_issued',
      subject: `E-Ticket Issued: PNR ${pnr} (${origin} -> ${destination})`,
      templateName: 'flight_ticket_issued',
      variables: [user?.name || 'Passenger', pnr, `${origin} to ${destination}`],
      mediaUrl: eTicketPdfUrl,
      idempotencyKey: `ticket:${booking._id}:${pnr}`,
    });
  }

  async sendOtp(phone, otpCode) {
    return this.sendNotification({
      recipient: { phone },
      channels: ['sms', 'whatsapp'],
      eventType: 'otp_verification',
      messageText: `Your Maqam Travels verification code is ${otpCode}. Valid for 5 minutes. Do not share this code.`,
      variables: [otpCode],
      idempotencyKey: `otp:${phone}:${Date.now()}`,
    });
  }
}

module.exports = new NotificationService();
