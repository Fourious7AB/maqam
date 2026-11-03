'use strict';

const { Queue, Worker } = require('bullmq');
const { getBullMQConnection } = require('../../utils/redis');
const NotificationLog = require('../../modules/notifications/notification.model');
const { sendEmail } = require('../../modules/notifications/email/emailService');
const { sendSMS } = require('../../modules/notifications/sms/smsService');
const { sendWhatsAppTemplate } = require('../../modules/notifications/whatsapp/whatsapp.service');
const logger = require('../../utils/logger');

const QUEUE_NAME = 'notification-dispatch-queue';
let notificationQueue = null;

const getNotificationQueue = () => {
  if (notificationQueue) return notificationQueue;
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const connection = getBullMQConnection();
    notificationQueue = new Queue(QUEUE_NAME, { connection });
    return notificationQueue;
  } catch (err) {
    logger.warn(`[Notification Worker] Could not initialize BullMQ queue: ${err.message}`);
    return null;
  }
};

const processNotificationJob = async (logId) => {
  const record = await NotificationLog.findById(logId);
  if (!record || record.status === 'sent') return;

  record.status = 'processing';
  record.attempts += 1;
  await record.save();

  try {
    let result = { success: true, provider: 'none', messageId: null, data: null };

    if (record.channel === 'email') {
      result = await sendEmail({
        to: record.recipient.email,
        subject: record.subject,
        htmlBody: record.bodyContent,
        mediaUrl: record.metadata?.mediaUrl,
      });
    } else if (record.channel === 'whatsapp') {
      result = await sendWhatsAppTemplate({
        to: record.recipient.phone,
        templateName: record.templateName,
        bodyVariables: record.metadata?.variables || [],
        mediaUrl: record.metadata?.mediaUrl || null,
      });
    } else if (record.channel === 'sms') {
      result = await sendSMS({
        phone: record.recipient.phone,
        message: record.bodyContent,
        variables: record.metadata?.variables?.[0] || '',
      });
    }

    record.status = 'sent';
    record.provider = {
      name: result.provider,
      messageId: result.messageId,
      response: result.data,
    };
    await record.save();
    return result;
  } catch (err) {
    record.status = record.attempts >= 3 ? 'failed' : 'queued';
    record.lastError = err.message;
    await record.save();
    throw err;
  }
};

const initWorker = () => {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const connection = getBullMQConnection();
    const concurrency = Number(process.env.NOTIFICATIONS_QUEUE_CONCURRENCY) || 5;

    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        logger.info(`[Notification Worker] Processing job ${job.id} for log ${job.data?.logId}`);
        await processNotificationJob(job.data.logId);
      },
      { connection, concurrency }
    );

    worker.on('completed', (job) => {
      logger.info(`[Notification Worker] Job ${job.id} successfully completed`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[Notification Worker] Job ${job?.id} failed: ${err.message}`);
    });

    return worker;
  } catch (err) {
    logger.error(`[Notification Worker] Failed to start worker: ${err.message}`);
    return null;
  }
};

module.exports = { getNotificationQueue, processNotificationJob, initWorker, QUEUE_NAME };
