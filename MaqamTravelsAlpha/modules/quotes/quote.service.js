'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

const Lead = require('../crm/crm.model');
const notificationService = require('../notifications/notification.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * ─── QUOTE SERVICE (Customer Side) ─────────────────────
 * Customer-facing quotation workflow on top of the CRM Lead model.
 *
 *   1. Customer requests a quote      → Lead (status "new", quoteReference)
 *   2. Agent issues quote (CRM PATCH) → quotedPrice / quoteExpiresAt → notifyQuoteReady()
 *   3. Customer views / tracks quote
 *   4. Customer accepts / rejects / asks for changes → agent is notified
 *   5. Agent converts lead to booking (existing CRM convert endpoint)
 *
 * Customers never see internal CRM data (agent notes, priority, internal timeline).
 */

// Statuses in which a quoted price is considered "issued" to the customer
const QUOTED_STATUSES = ['proposal', 'quoted', 'proposal_sent', 'negotiation', 'negotiating'];
// Statuses before a quote is issued (agent may auto-advance from these when pricing)
const PRE_QUOTE_STATUSES = ['new', 'contacted', 'qualified', 'interested'];
const CLOSED_STATUSES = ['won', 'converted', 'lost'];

// Timeline entry types that are safe to show customers
const CUSTOMER_TIMELINE_TYPES = ['created', 'quote_sent', 'customer_response', 'won'];

const RESPONSE_ACTIONS = ['accepted', 'rejected', 'changes_requested'];

const QUOTE_CURRENCY = process.env.QUOTE_CURRENCY || 'INR';

// ─── Helpers ────────────────────────────────────────────

const formatTimelineTime = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]}, ${hours}:${minutes}`;
};

const timelineEntry = (type, title, detail) => ({
  id: `T${Date.now()}${crypto.randomBytes(2).toString('hex')}`,
  type,
  title,
  detail,
  time: formatTimelineTime(),
  createdAt: new Date(),
});

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const formatPrice = (amount) =>
  `${QUOTE_CURRENCY} ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (date) => (date ? new Date(date).toDateString() : '');

// Compare phones by trailing 10 digits so "+91 98765-43210" matches "9876543210"
const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

const generateQuoteReference = () => `QT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const createUniqueReference = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = generateQuoteReference();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Lead.exists({ quoteReference: reference });
    if (!exists) return reference;
  }
  throw new AppError('Could not generate a quotation reference, please retry', 500);
};

const statusOf = (lead) => String(lead.status || '').toLowerCase();

const isQuoteExpired = (lead) =>
  Boolean(lead.quoteExpiresAt) && new Date(lead.quoteExpiresAt).getTime() < Date.now();

const hasIssuedQuote = (lead) =>
  Number(lead.quotedPrice) > 0 && QUOTED_STATUSES.includes(statusOf(lead));

const isClosed = (lead) => CLOSED_STATUSES.includes(statusOf(lead));

/**
 * Returns null when the customer may respond with `action`, otherwise an AppError.
 * Expired quotes can still receive "changes_requested" (ask for a revised quote).
 */
const getResponseBlocker = (lead, action) => {
  if (isClosed(lead)) return new AppError('This quotation request is already closed', 409);
  if (!hasIssuedQuote(lead)) return new AppError('No quotation has been issued for this request yet', 409);
  if (lead.customerResponse?.action === 'accepted') {
    return new AppError('You have already accepted this quotation. Our agent will contact you to confirm the booking.', 409);
  }
  if (isQuoteExpired(lead) && action !== 'changes_requested') {
    return new AppError('This quotation has expired. Please request a revised quotation.', 400);
  }
  return null;
};

/** Customer-facing stage, derived from internal CRM status */
const deriveCustomerStage = (lead) => {
  const status = statusOf(lead);
  if (status === 'won' || status === 'converted') return 'booked';
  if (status === 'lost') return 'closed';

  const response = lead.customerResponse?.action;
  if (hasIssuedQuote(lead)) {
    if (response === 'accepted') return 'accepted';
    if (response === 'changes_requested') return 'revision_requested';
    if (isQuoteExpired(lead)) return 'expired';
    return 'quote_ready';
  }
  if (response === 'changes_requested') return 'revision_requested';
  return 'under_review';
};

/** Strip internal CRM fields before returning to a customer */
const toCustomerView = (leadDoc, { includeContact = true } = {}) => {
  if (!leadDoc) return null;
  const lead = leadDoc.toObject ? leadDoc.toObject() : { ...leadDoc };
  const issued = hasIssuedQuote(lead);

  const view = {
    id: String(lead._id),
    reference: lead.quoteReference || null,
    stage: deriveCustomerStage(lead),
    destination: lead.destination || '',
    tripType: lead.tripType || 'Leisure',
    travelDates: {
      from: lead.travelDates?.from || null,
      to: lead.travelDates?.to || null,
    },
    numberOfPeople: lead.numberOfPeople || 1,
    budget: lead.budget || 0,
    specialRequests: lead.specialRequests || '',
    quote: issued
      ? {
        price: lead.quotedPrice,
        currency: QUOTE_CURRENCY,
        expiresAt: lead.quoteExpiresAt || null,
        isExpired: isQuoteExpired(lead),
      }
      : null,
    availableActions: RESPONSE_ACTIONS.filter((action) => !getResponseBlocker(lead, action)),
    customerResponse: lead.customerResponse?.action
      ? {
        action: lead.customerResponse.action,
        note: lead.customerResponse.note || '',
        respondedAt: lead.customerResponse.respondedAt,
      }
      : null,
    timeline: (lead.timeline || [])
      .filter((t) => CUSTOMER_TIMELINE_TYPES.includes(t.type))
      .map((t) => ({ type: t.type, title: t.title, detail: t.detail, createdAt: t.createdAt })),
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };

  if (includeContact) {
    view.contact = {
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phone || '',
    };
  }

  return view;
};

/**
 * Leads a logged-in customer owns: explicitly linked, or matching a
 * VERIFIED phone/email (so unverified accounts can't read others' quotes).
 */
const buildOwnershipFilter = (user) => {
  const or = [{ customer: user._id }];
  if (user.isPhoneVerified && user.phone) or.push({ phone: user.phone });
  if (user.isVerified && user.email) or.push({ email: String(user.email).toLowerCase() });
  return { $or: or };
};

// Fire-and-forget: notification failures must never break the customer request
const dispatchNotification = (payload) => {
  Promise.resolve()
    .then(() => notificationService.sendNotification(payload))
    .catch((err) => logger.warn(`[QuoteService] ${payload.eventType} notification failed: ${err.message}`));
};

// ─── Notifications ──────────────────────────────────────

const notifyQuoteRequestReceived = (lead) => {
  const name = lead.firstName || 'Traveller';
  const ref = lead.quoteReference;

  dispatchNotification({
    userId: lead.customer || null,
    recipient: { email: lead.email, phone: lead.phone },
    channels: ['email', 'whatsapp'],
    eventType: 'quote_request_received',
    subject: `We received your quotation request (${ref}) - Maqam Travels`,
    templateName: 'quote_request_received',
    variables: [name, ref, lead.destination],
    messageText: `
      <p>Assalamu Alaikum ${escapeHtml(name)},</p>
      <p>Thank you for your quotation request for <strong>${escapeHtml(lead.destination)}</strong>
      (${lead.numberOfPeople} traveller(s), ${formatDate(lead.travelDates?.from)} – ${formatDate(lead.travelDates?.to)}).</p>
      <p>Your reference number is <strong>${escapeHtml(ref)}</strong>. Our travel expert will prepare your
      personalised quotation and get back to you shortly.</p>
      <p>— Maqam Travels</p>`,
    idempotencyKey: `quote:${lead._id}:received`,
  });
};

/**
 * Called by CRM (crm.service.updateLead) when an agent issues or revises a quote.
 * Idempotency key includes price + expiry so revised quotes notify again.
 */
const notifyQuoteReady = (lead) => {
  if (!lead || Number(lead.quotedPrice) <= 0) return;
  const name = lead.firstName || 'Traveller';
  const ref = lead.quoteReference || String(lead._id);
  const price = formatPrice(lead.quotedPrice);
  const expiry = lead.quoteExpiresAt ? formatDate(lead.quoteExpiresAt) : 'until further notice';
  const expiryKey = lead.quoteExpiresAt ? new Date(lead.quoteExpiresAt).getTime() : 'none';

  dispatchNotification({
    userId: lead.customer || null,
    recipient: { email: lead.email, phone: lead.phone },
    channels: ['email', 'whatsapp'],
    eventType: 'quote_ready',
    subject: `Your quotation ${ref} is ready - Maqam Travels`,
    templateName: 'quote_ready',
    variables: [name, ref, price, expiry],
    messageText: `
      <p>Assalamu Alaikum ${escapeHtml(name)},</p>
      <p>Your quotation <strong>${escapeHtml(ref)}</strong> for <strong>${escapeHtml(lead.destination)}</strong> is ready.</p>
      <p>Quoted price: <strong>${escapeHtml(price)}</strong><br/>Valid until: <strong>${escapeHtml(expiry)}</strong></p>
      <p>Log in to your Maqam Travels account to accept the quotation or request changes.</p>
      <p>— Maqam Travels</p>`,
    idempotencyKey: `quote:${lead._id}:ready:${lead.quotedPrice}:${expiryKey}`,
  });
};

const RESPONSE_LABELS = {
  accepted: 'ACCEPTED',
  rejected: 'DECLINED',
  changes_requested: 'REQUESTED CHANGES to',
};

const notifyAgentOfResponse = (lead, action, note) => {
  const agent = lead.assignedAgent && typeof lead.assignedAgent === 'object' ? lead.assignedAgent : null;
  const agentEmail = agent?.email || process.env.QUOTE_ALERT_EMAIL || null;
  if (!agentEmail) {
    logger.info(`[QuoteService] No agent/alert email for lead ${lead._id}; response recorded in timeline only`);
    return;
  }

  const customerName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Customer';
  const ref = lead.quoteReference || String(lead._id);
  const respondedAt = lead.customerResponse?.respondedAt
    ? new Date(lead.customerResponse.respondedAt).getTime()
    : Date.now();

  dispatchNotification({
    userId: agent?._id || null,
    recipient: { email: agentEmail },
    channels: ['email'],
    eventType: 'quote_customer_response',
    subject: `[${ref}] ${customerName} ${RESPONSE_LABELS[action]} the quotation`,
    messageText: `
      <p><strong>${escapeHtml(customerName)}</strong> (${escapeHtml(lead.phone)}) has
      <strong>${RESPONSE_LABELS[action]}</strong> quotation <strong>${escapeHtml(ref)}</strong>.</p>
      <p>Destination: ${escapeHtml(lead.destination)}<br/>Quoted price: ${escapeHtml(formatPrice(lead.quotedPrice))}</p>
      ${note ? `<p>Customer note: <em>${escapeHtml(note)}</em></p>` : ''}
      <p>Open the lead in the CRM to follow up.</p>`,
    idempotencyKey: `quote:${lead._id}:response:${action}:${respondedAt}`,
  });
};

// ─── Customer Operations ────────────────────────────────

/**
 * Step 1: Customer (guest or logged-in) requests a quotation.
 * Only whitelisted fields are taken from the payload — customers cannot set
 * status, price, assignment, etc.
 */
const requestQuote = async ({ user = null, data = {} }) => {
  const firstName = data.firstName || user?.firstName;
  const lastName = data.lastName ?? user?.lastName ?? '';
  const email = data.email || user?.email || '';
  const phone = data.phone || user?.phone;

  if (!firstName) throw new AppError('First name is required', 400);
  if (!phone) throw new AppError('Phone number is required', 400);

  // Double-submit guard: same phone + destination within 10 minutes returns the existing request
  const recent = await Lead.findOne({
    phone,
    destination: data.destination,
    quoteReference: { $exists: true },
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  });
  if (recent) {
    return { quote: toCustomerView(recent), duplicate: true };
  }

  const reference = await createUniqueReference();
  const people = data.numberOfPeople || 1;

  const lead = await Lead.create({
    firstName,
    lastName,
    email,
    phone,
    source: 'Website - Quote Request',
    tripType: data.tripType || 'Leisure',
    destination: data.destination,
    travelDates: { from: data.travelDates?.from, to: data.travelDates?.to },
    numberOfPeople: people,
    budget: data.budget || 0,
    specialRequests: data.specialRequests || '',
    status: 'new',
    priority: 'medium',
    customer: user?._id || null,
    quoteReference: reference,
    timeline: [
      timelineEntry(
        'created',
        'Quotation requested',
        `Customer requested a quotation for ${data.destination} (${people} traveller(s)). Ref ${reference}.`,
      ),
    ],
  });

  logger.info(`[QuoteService] Quote requested: lead ${lead._id} ref ${reference}${user ? ` by user ${user._id}` : ' (guest)'}`);
  notifyQuoteRequestReceived(lead);

  return { quote: toCustomerView(lead), duplicate: false };
};

/** Step 3a: Logged-in customer lists their quotation requests */
const listMyQuotes = async (user, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
  const filter = buildOwnershipFilter(user);

  const [leads, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Lead.countDocuments(filter),
  ]);

  return {
    quotes: leads.map((lead) => toCustomerView(lead)),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/** Step 3b: Logged-in customer views a single quotation */
const getMyQuote = async (user, quoteId) => {
  if (!mongoose.Types.ObjectId.isValid(quoteId)) throw new AppError('Invalid quotation ID', 400);
  const lead = await Lead.findOne({ _id: quoteId, ...buildOwnershipFilter(user) });
  if (!lead) throw new AppError('Quotation not found', 404);
  return toCustomerView(lead);
};

/**
 * Step 3c: Guest tracks a quotation by reference + phone.
 * Same error for "no such reference" and "phone mismatch" to prevent enumeration.
 * Contact details are omitted from the guest view.
 */
const trackQuote = async ({ reference, phone }) => {
  const notFound = new AppError('No quotation found for this reference and phone number', 404);
  const normalizedPhone = normalizePhone(phone);
  if (!reference || !normalizedPhone) throw notFound;

  const lead = await Lead.findOne({ quoteReference: String(reference).trim().toUpperCase() });
  if (!lead || normalizePhone(lead.phone) !== normalizedPhone) throw notFound;

  return toCustomerView(lead, { includeContact: false });
};

/**
 * Step 4: Logged-in customer responds to an issued quotation.
 *  - accepted          → customerResponse recorded, priority high, agent notified (agent converts to booking)
 *  - rejected          → status "lost" with customer's reason
 *  - changes_requested → status "negotiation", agent revises quote (allowed even if expired)
 */
const respondToQuote = async (user, quoteId, { action, note = '' }) => {
  if (!mongoose.Types.ObjectId.isValid(quoteId)) throw new AppError('Invalid quotation ID', 400);
  if (!RESPONSE_ACTIONS.includes(action)) throw new AppError('Invalid response action', 400);

  const lead = await Lead.findOne({ _id: quoteId, ...buildOwnershipFilter(user) })
    .populate('assignedAgent', 'firstName lastName email phone');
  if (!lead) throw new AppError('Quotation not found', 404);

  const blocker = getResponseBlocker(lead, action);
  if (blocker) throw blocker;

  const trimmedNote = String(note || '').trim();
  const now = new Date();
  const price = formatPrice(lead.quotedPrice);

  lead.customerResponse = { action, note: trimmedNote, respondedAt: now };
  lead.lastContactDate = now;
  if (!lead.customer) lead.customer = user._id;

  if (action === 'accepted') {
    lead.priority = 'high';
    lead.timeline.push(timelineEntry(
      'customer_response',
      'Quotation accepted',
      `Customer accepted the quotation of ${price}.${trimmedNote ? ` Note: ${trimmedNote}` : ''}`,
    ));
  } else if (action === 'rejected') {
    lead.status = 'lost';
    lead.lostReason = trimmedNote || 'Declined by customer';
    lead.timeline.push(timelineEntry(
      'customer_response',
      'Quotation declined',
      `Customer declined the quotation.${trimmedNote ? ` Reason: ${trimmedNote}` : ''}`,
    ));
  } else {
    lead.status = 'negotiation';
    lead.timeline.push(timelineEntry(
      'customer_response',
      'Changes requested',
      `Customer requested changes: ${trimmedNote}`,
    ));
  }

  await lead.save();
  logger.info(`[QuoteService] Lead ${lead._id}: customer ${user._id} ${action} the quotation`);

  notifyAgentOfResponse(lead, action, trimmedNote);
  return toCustomerView(lead);
};

// ─── Admin / CRM Quotation Operations ──────────────────────

/**
 * 1. List all quotations with search and filters (status, agentId, date ranges, search).
 */
const listQuotationsAdmin = async ({
  status,
  agentId,
  assignedTo,
  fromDate,
  toDate,
  startDate,
  endDate,
  dateFrom,
  dateTo,
  search,
  page = 1,
  limit = 20,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

  const filter = {};

  // Status filter
  if (status) {
    const normStatus = String(status).toLowerCase().trim();
    if (normStatus === 'unhandled') {
      filter.assignedAgent = null;
    } else {
      filter.status = normStatus;
    }
  }

  // Agent filter (agentId, assignedTo, or special values 'unhandled' / 'unassigned')
  const targetAgent = agentId || assignedTo;
  if (targetAgent) {
    const normAgent = String(targetAgent).trim().toLowerCase();
    if (normAgent === 'unhandled' || normAgent === 'unassigned' || normAgent === 'null') {
      filter.assignedAgent = null;
    } else if (mongoose.Types.ObjectId.isValid(targetAgent)) {
      filter.$or = [
        { assignedAgent: new mongoose.Types.ObjectId(targetAgent) },
        { assignedTo: targetAgent },
      ];
    } else {
      filter.assignedTo = targetAgent;
    }
  }

  // Date range filter (createdAt)
  const from = dateFrom || startDate || fromDate;
  const to = dateTo || endDate || toDate;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toD = new Date(to);
      toD.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toD;
    }
  }

  // Search text filter (firstName, lastName, email, phone, destination, quoteReference)
  if (search) {
    const s = String(search).trim();
    const regex = new RegExp(s, 'i');
    const searchConditions = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
      { destination: regex },
      { quoteReference: regex },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedAgent', 'firstName lastName email phone role')
      .populate('customer', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Lead.countDocuments(filter),
  ]);

  return {
    quotations: leads,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * 2. Get a single quotation by ID (Admin view with complete CRM lead metadata).
 */
const getQuotationByIdAdmin = async (quoteId) => {
  if (!mongoose.Types.ObjectId.isValid(quoteId)) {
    throw new AppError('Invalid quotation ID format', 400);
  }
  const lead = await Lead.findById(quoteId)
    .populate('assignedAgent', 'firstName lastName email phone role')
    .populate('customer', 'firstName lastName email phone')
    .populate('createdBy', 'firstName lastName email');

  if (!lead) {
    throw new AppError('Quotation not found', 404);
  }
  return lead;
};

/**
 * 3. Assign an unhandled quotation lead to a specific travel specialist / sales agent.
 */
const assignQuotationAdmin = async (quoteId, { agentId, assignedTo }) => {
  if (!mongoose.Types.ObjectId.isValid(quoteId)) {
    throw new AppError('Invalid quotation ID format', 400);
  }

  const targetAgentId = agentId || assignedTo;
  if (!targetAgentId) {
    throw new AppError('Agent ID is required to assign quotation', 400);
  }
  if (!mongoose.Types.ObjectId.isValid(targetAgentId)) {
    throw new AppError('Invalid travel specialist / agent ID format', 400);
  }

  const lead = await Lead.findById(quoteId);
  if (!lead) {
    throw new AppError('Quotation not found', 404);
  }

  const User = mongoose.model('User');
  const agent = await User.findById(targetAgentId);
  if (!agent) {
    throw new AppError('Travel specialist / agent not found', 404);
  }

  const agentName = [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.email;

  lead.assignedAgent = agent._id;
  lead.assignedTo = agent._id.toString();
  lead.timeline.push(timelineEntry(
    'assigned',
    'Assigned to travel specialist',
    `Quotation lead assigned to travel specialist ${agentName}.`
  ));

  await lead.save();
  logger.info(`[QuoteService] Lead ${lead._id} assigned to specialist ${agent._id} (${agentName})`);

  return Lead.findById(lead._id)
    .populate('assignedAgent', 'firstName lastName email phone role')
    .populate('customer', 'firstName lastName email phone');
};

/**
 * 4. Send/Issue specific quotation proposal to customer with price, expiry date, and notes.
 * Triggers real-time Email & WhatsApp notification to the customer.
 */
const sendQuotationToCustomer = async (quoteId, { quotedPrice, price, quoteExpiresAt, expiresAt, notes, remark } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(quoteId)) {
    throw new AppError('Invalid quotation ID format', 400);
  }

  const finalPrice = Number(quotedPrice ?? price);
  if (isNaN(finalPrice) || finalPrice <= 0) {
    throw new AppError('quotedPrice must be a valid number greater than 0', 400);
  }

  const lead = await Lead.findById(quoteId);
  if (!lead) {
    throw new AppError('Quotation not found', 404);
  }

  const expiryDate = quoteExpiresAt || expiresAt ? new Date(quoteExpiresAt || expiresAt) : null;
  const customNotes = String(notes || remark || '').trim();

  lead.quotedPrice = finalPrice;
  if (expiryDate && !isNaN(expiryDate.getTime())) {
    lead.quoteExpiresAt = expiryDate;
  }
  lead.status = 'proposal_sent';
  lead.lastContactDate = new Date();

  const formattedPrice = formatPrice(finalPrice);
  lead.timeline.push(timelineEntry(
    'quote_sent',
    'Quotation sent to customer',
    `Quotation proposal issued to customer for ${formattedPrice}.${customNotes ? ` Notes: ${customNotes}` : ''}`
  ));

  await lead.save();
  logger.info(`[QuoteService] Lead ${lead._id}: Quotation sent to customer for ${formattedPrice}`);

  // Dispatch Email & WhatsApp notification to customer
  notifyQuoteReady(lead);

  return Lead.findById(lead._id)
    .populate('assignedAgent', 'firstName lastName email phone role')
    .populate('customer', 'firstName lastName email phone');
};


/**
 * Create a new quotation lead directly from CRM / Back-Office Desk
 */
const createQuotationAdmin = async (agentId, data = {}) => {
  const quoteReference = await createUniqueReference();
  const firstName = String(data.firstName || data.name || 'Valued').trim();
  const lastName = String(data.lastName || '').trim();
  const email = String(data.email || '').toLowerCase().trim();
  const phone = normalizePhone(data.phone || '9999999999');
  const destination = data.destination || 'Makkah & Madinah';
  const numberOfPeople = Math.max(1, parseInt(data.numberOfPeople || data.travelers || 1, 10));
  const budget = Number(data.budget || 0);
  const quotedPrice = data.quotedPrice !== undefined ? Number(data.quotedPrice) : (budget || 0);
  const quoteExpiresAt = data.quoteExpiresAt ? new Date(data.quoteExpiresAt) : null;
  const status = data.status || (quotedPrice > 0 ? 'proposal_sent' : 'new');

  const timeline = [
    timelineEntry('created', 'Quotation Created', `Quotation ${quoteReference} generated by sales specialist`)
  ];

  if (quotedPrice > 0) {
    timeline.push(timelineEntry('quote_sent', 'Proposal Issued', `Quotation proposal issued for ${formatPrice(quotedPrice)}`));
  }

  const assigned = data.assignedTo || data.agentId || agentId;

  const lead = await Lead.create({
    quoteReference,
    firstName,
    lastName,
    email,
    phone,
    destination,
    numberOfPeople,
    budget,
    quotedPrice,
    quoteExpiresAt,
    specialRequests: data.specialRequests || data.notes || '',
    tripType: data.tripType || 'Umrah',
    travelDates: data.travelDates || {},
    status,
    priority: data.priority || 'medium',
    assignedTo: assigned,
    assignedAgent: mongoose.Types.ObjectId.isValid(assigned) ? assigned : null,
    source: data.source || 'CRM Desk',
    timeline,
  });

  logger.info(`[QuoteService] Created CRM quotation lead ${lead._id} (${quoteReference})`);
  return Lead.findById(lead._id)
    .populate('assignedAgent', 'firstName lastName email phone role')
    .populate('customer', 'firstName lastName email phone');
};

/**
 * Update an existing quotation lead
 */
const updateQuotationAdmin = async (quoteId, updates = {}) => {
  const lead = await Lead.findById(quoteId);
  if (!lead) {
    const error = new Error('Quotation not found');
    error.statusCode = 404;
    throw error;
  }

  if (updates.firstName !== undefined) lead.firstName = updates.firstName;
  if (updates.lastName !== undefined) lead.lastName = updates.lastName;
  if (updates.email !== undefined) lead.email = updates.email;
  if (updates.phone !== undefined) lead.phone = updates.phone;
  if (updates.destination !== undefined) lead.destination = updates.destination;
  if (updates.numberOfPeople !== undefined) lead.numberOfPeople = updates.numberOfPeople;
  if (updates.budget !== undefined) lead.budget = updates.budget;
  if (updates.quotedPrice !== undefined) lead.quotedPrice = Number(updates.quotedPrice);
  if (updates.quoteExpiresAt !== undefined) lead.quoteExpiresAt = new Date(updates.quoteExpiresAt);
  if (updates.notes !== undefined || updates.quoteNotes !== undefined) {
    lead.contactNotes = updates.notes || updates.quoteNotes;
  }

  if (updates.status && updates.status !== lead.status) {
    const prev = lead.status;
    lead.status = updates.status;
    lead.timeline.push(
      timelineEntry('status_change', `Status updated to ${updates.status.toUpperCase()}`, `Updated from ${prev} to ${updates.status}`)
    );
  }

  lead.lastContactDate = new Date();
  await lead.save();

  return Lead.findById(lead._id)
    .populate('assignedAgent', 'firstName lastName email phone role')
    .populate('customer', 'firstName lastName email phone');
};

/**
 * Append dialogue note to quotation timeline
 */
const addQuotationNoteAdmin = async (quoteId, { note, channel = 'Call', author = 'Travel Specialist' } = {}) => {
  const lead = await Lead.findById(quoteId);
  if (!lead) {
    const error = new Error('Quotation not found');
    error.statusCode = 404;
    throw error;
  }

  const cleanNote = String(note || '').trim();
  if (!cleanNote) {
    const error = new Error('Note content is required');
    error.statusCode = 400;
    throw error;
  }

  lead.timeline.push(
    timelineEntry('conversation_note', `${channel} Note (${author})`, cleanNote)
  );
  lead.contactNotes = cleanNote;
  lead.lastContactDate = new Date();
  await lead.save();

  return Lead.findById(lead._id)
    .populate('assignedAgent', 'firstName lastName email phone role')
    .populate('customer', 'firstName lastName email phone');
};

module.exports = {
  requestQuote,
  listMyQuotes,
  getMyQuote,
  trackQuote,
  respondToQuote,
  notifyQuoteReady,
  listQuotationsAdmin,
  getQuotationByIdAdmin,
  assignQuotationAdmin,
  sendQuotationToCustomer,
  createQuotationAdmin,
  updateQuotationAdmin,
  addQuotationNoteAdmin,
  // exported for CRM integration
  QUOTED_STATUSES,
  PRE_QUOTE_STATUSES,
  CLOSED_STATUSES,
};

