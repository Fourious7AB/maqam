'use strict';

const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../modules/notifications/notification.service.js');
let content = fs.readFileSync(file, 'utf8');

const target = `  async sendBookingConfirmation({ booking, user, invoicePdfUrl = null }) {
    const bookingRef = booking.bookingReference || \`BK-\${booking._id}\`;
    const destination = booking.details?.destination || booking.destination || 'Holy Makkah & Madinah';

    return this.sendNotification({
      userId: user?._id || user?.id,
      recipient: { email: user?.email, phone: user?.phone },
      channels: ['email', 'whatsapp'],
      eventType: 'booking_confirmation',
      subject: \`Booking Confirmed: \${bookingRef} - Maqam Travels\`,
      templateName: 'booking_confirmation_v1',
      variables: [user?.name || 'Valued Pilgrim', bookingRef, destination, booking.details?.totalPrice || booking.totalAmount],
      mediaUrl: invoicePdfUrl,
      idempotencyKey: \`booking:\${booking._id}:confirm\`,
    });
  }`;

const replacement = `  async sendBookingConfirmation({ booking, user, invoicePdfUrl = null }) {
    const bookingRef = booking.bookingReference || \`BK-\${booking._id}\`;
    const destination = booking.details?.destination || booking.destination || 'Holy Makkah & Madinah';
    const customerName = user?.name || \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || 'Valued Customer';
    const totalAmount = booking.details?.totalPrice || booking.totalAmount || 0;

    const emailHtml = \`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Maqam Travels</h1>
          <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">Booking Confirmation &amp; Receipt</p>
        </div>
        <div style="padding: 32px 28px; color: #334155; line-height: 1.6;">
          <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Your Booking is Confirmed! 🎉</h2>
          <p style="font-size: 15px; color: #475569;">Dear <strong>\${customerName}</strong>,</p>
          <p style="font-size: 15px; color: #475569;">Thank you for booking with Maqam Travels. Your reservation has been successfully confirmed and your itinerary details are summarized below.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Booking Reference:</td>
                <td style="padding: 8px 0; font-family: monospace; font-weight: 600; color: #0f172a; text-align: right;">\${bookingRef}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Destination / Tour:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-align: right; border-top: 1px solid #e2e8f0;">\${destination}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Amount Paid:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #16a34a; text-align: right; border-top: 1px solid #e2e8f0;">₹\${Number(totalAmount).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Status:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #16a34a; text-align: right; border-top: 1px solid #e2e8f0;">CONFIRMED</td>
              </tr>
            </table>
          </div>

          \${invoicePdfUrl ? \`
          <div style="text-align: center; margin: 28px 0;">
            <a href="\${invoicePdfUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Download Invoice PDF</a>
          </div>
          \` : ''}

          <p style="font-size: 13px; color: #64748b; margin-top: 28px;">If you have any questions or require special arrangements, please reach out to our 24/7 dedicated support team.</p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
          © \${new Date().getFullYear()} Maqam Travels. All rights reserved.
        </div>
      </div>
    \`;

    return this.sendNotification({
      userId: user?._id || user?.id,
      recipient: { email: user?.email, phone: user?.phone },
      channels: ['email', 'whatsapp'],
      eventType: 'booking_confirmation',
      subject: \`Booking Confirmed: \${bookingRef} - Maqam Travels\`,
      templateName: 'booking_confirmation_v1',
      variables: [customerName, bookingRef, destination, totalAmount],
      messageText: emailHtml,
      mediaUrl: invoicePdfUrl,
      idempotencyKey: \`booking:\${booking._id}:confirm\`,
    });
  }`;

const isCRLF = content.includes('\r\n');
const normalizedTarget = isCRLF ? target.replace(/\n/g, '\r\n') : target;
const normalizedReplacement = isCRLF ? replacement.replace(/\n/g, '\r\n') : replacement;

if (content.includes(normalizedTarget)) {
  content = content.replace(normalizedTarget, normalizedReplacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✔ Updated notification.service.js successfully.');
} else {
  console.error('❌ Could not find target in notification.service.js');
}

