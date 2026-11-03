# Notifications Module

Welcome to the **MaqamTravels Notifications Module**. This module handles all omnichannel messaging (Email, SMS, Push, and Outbox event logs) across the platform.

For complete architectural specifications, schemas, integration touchpoints, and implementation guides, refer to:

👉 **[NOTIFICATIONS_DOCUMENTATION.md](./NOTIFICATIONS_DOCUMENTATION.md)**  
👉 **[FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md)** (Step-by-step function calling diagrams & sequence flows)

## Folder Hierarchy

* `email/`
  * [`emailService.js`](./email/emailService.js): Email transport adapters (Nodemailer connection pool) and dynamic HTML templates.
* `sms/`
  * [`smsService.js`](./sms/smsService.js): SMS gateway connectors (Fast2SMS India DLT / Twilio International) for alerts and OTP dispatch.
* `whatsapp/`
  * [`whatsapp.service.js`](./whatsapp/whatsapp.service.js): Meta WhatsApp Cloud API client (Graph API v19.0) for HSM templates and PDF attachments.
* [`notification.model.js`](./notification.model.js): Mongoose schema tracking delivery lifecycle, status, and retry audits.
* [`notification.service.js`](./notification.service.js): Unified single-function dispatcher (`sendNotification`) interfacing with payment orchestrators, booking engines, and webhooks.
* [`FLOW_DIAGRAM.md`](./FLOW_DIAGRAM.md): Visual flowchart & sequence diagrams detailing function calls step by step.
