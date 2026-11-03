'use strict';

const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../modules/notifications/email/emailService.js');
let content = fs.readFileSync(file, 'utf8');

const target = `  const mailOptions = {
    from: \`"\${process.env.EMAIL_FROM_NAME || 'Maqam Travels'}" <\${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>\`,
    to,
    subject,
    html: htmlBody,
    attachments: mailAttachments,
  };

  const info = await mailer.sendMail(mailOptions);
  logger.info(\`[Email Service] Sent email to \${to} (MessageID: \${info.messageId})\`);
  return {
    success: true,
    provider: 'nodemailer',
    messageId: info.messageId,
    data: info,
  };`;

const replacement = `  const formattedHtml = (htmlBody && htmlBody.trim().length > 0)
    ? htmlBody
    : \`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; line-height: 1.6;">
        <h2 style="color: #1e293b; margin-top: 0;">\${subject}</h2>
        <p style="color: #475569; font-size: 15px;">Your booking status has been updated. Please check your account dashboard for full details.</p>
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">© \${new Date().getFullYear()} Maqam Travels. All rights reserved.</p>
      </div>
    \`;

  const mailOptions = {
    from: \`"\${process.env.EMAIL_FROM_NAME || 'Maqam Travels'}" <\${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>\`,
    to,
    subject,
    html: formattedHtml,
    attachments: mailAttachments,
  };

  const info = await mailer.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(\`[Email Service] 🔗 Ethereal Test Email Preview URL: \${previewUrl}\`);
  }
  logger.info(\`[Email Service] Sent email to \${to} (MessageID: \${info.messageId})\`);
  return {
    success: true,
    provider: 'nodemailer',
    messageId: info.messageId,
    previewUrl: previewUrl || null,
    data: info,
  };`;

const isCRLF = content.includes('\r\n');
const normalizedTarget = isCRLF ? target.replace(/\n/g, '\r\n') : target;
const normalizedReplacement = isCRLF ? replacement.replace(/\n/g, '\r\n') : replacement;

if (content.includes(normalizedTarget)) {
  content = content.replace(normalizedTarget, normalizedReplacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✔ Updated emailService.js successfully.');
} else {
  console.error('❌ Target not found in emailService.js');
}

