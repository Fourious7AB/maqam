const mongoose = require('mongoose');
const Lead = require('./crm.model');
const Hotel = require('../hotels/hotelEntity.model');
const User = require('../auth/auth.model');
const HotelStock = require('../packages/stock/hotelStock.model');
const Payment = require('../payments/payment.model');
const { PAYMENT_STATUS } = require('../payments/payment.constants');
const Traveller = require('../account/traveller.model');
const OfferBooking = require('../packages/offers/offerBooking.model');
const Booking = require('../bookings/booking.model');
const bcrypt = require('bcryptjs');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const { LEAD_STATUS } = require('../../config/constants');

/**
 * ─── CRM SERVICE ───────────────────────────────────────
 * Business logic: manage sales leads, hotels, hotelier users, and stock review queue
 */

const formatTimelineTime = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hours}:${minutes}`;
};

const formatLeadResponse = (leadDoc) => {
  if (!leadDoc) return null;
  const lead = leadDoc.toObject ? leadDoc.toObject() : { ...leadDoc };

  const firstName = lead.firstName || '';
  const lastName = lead.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || lead.company || 'Unknown';

  const assignedToName = lead.assignedTo || (
    lead.assignedAgent && typeof lead.assignedAgent === 'object'
      ? [lead.assignedAgent.firstName, lead.assignedAgent.lastName].filter(Boolean).join(' ')
      : null
  );

  return {
    ...lead,
    id: lead._id ? String(lead._id) : lead.id,
    _id: lead._id ? String(lead._id) : lead.id,
    name: lead.name || fullName,
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    company: lead.company || '',
    phone: lead.phone || '',
    email: lead.email || '',
    destination: lead.destination || '',
    tripType: lead.tripType || 'Leisure',
    travelers: lead.numberOfPeople || lead.travelers || 1,
    numberOfPeople: lead.numberOfPeople || lead.travelers || 1,
    budget: lead.budget || 0,
    source: lead.source || 'Website',
    assignedTo: assignedToName,
    status: lead.status || 'new',
    priority: lead.priority || 'medium',
    query: lead.specialRequests || lead.query || '',
    specialRequests: lead.specialRequests || lead.query || '',
    notes: lead.notes || lead.contactNotes || '',
    contactNotes: lead.contactNotes || lead.notes || '',
    timeline: Array.isArray(lead.timeline) ? lead.timeline : [],
  };
};

const listLeads = async ({
  status,
  stage,
  priority,
  source,
  assignedTo,
  search,
  page = 1,
  limit = 20,
} = {}) => {
  try {
    const query = {};

    const statusFilter = stage || status;
    if (statusFilter) {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, 'i') };
    }

    if (priority) {
      query.priority = priority.toLowerCase();
    }

    if (source) {
      query.source = { $regex: new RegExp(source, 'i') };
    }

    if (assignedTo) {
      if (mongoose.Types.ObjectId.isValid(assignedTo)) {
        query.$or = [{ assignedAgent: assignedTo }, { assignedTo }];
      } else {
        query.assignedTo = { $regex: new RegExp(assignedTo, 'i') };
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const searchConditions = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { destination: searchRegex },
        { company: searchRegex },
        { assignedTo: searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .skip(skip)
        .limit(limitNum)
        .populate('assignedAgent', 'firstName lastName email phone')
        .sort({ createdAt: -1 }),
      Lead.countDocuments(query),
    ]);

    const formattedLeads = leads.map(formatLeadResponse);

    return {
      leads: formattedLeads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } catch (error) {
    logger.error(`List leads failed: ${error.message}`);
    throw error;
  }
};

const getLeadById = async (leadId) => {
  try {
    const lead = await Lead.findById(leadId)
      .populate('assignedAgent', 'firstName lastName email phone')
      .populate('convertedBooking');
    if (!lead) return null;
    return formatLeadResponse(lead);
  } catch (error) {
    logger.error(`Get lead failed: ${error.message}`);
    throw error;
  }
};

const createLead = async (agentId, leadData = {}) => {
  try {
    let { firstName, lastName, name, query: reqQuery, specialRequests, travelers, numberOfPeople, notes, contactNotes, ...rest } = leadData;

    if (!firstName && name) {
      const parts = name.trim().split(/\s+/);
      firstName = parts[0] || 'Unknown';
      lastName = parts.slice(1).join(' ') || '';
    }

    const effectiveSpecialRequests = specialRequests || reqQuery || '';
    const effectivePeople = numberOfPeople || travelers || 1;
    const effectiveNotes = notes || contactNotes || '';

    const initialTimeline = [
      {
        id: `T${Date.now()}`,
        type: 'created',
        title: 'Lead created',
        detail: `Lead was created${rest.source ? ` from ${rest.source}` : '.'}`,
        time: formatTimelineTime(),
        createdAt: new Date(),
      },
    ];

    if (effectiveNotes) {
      initialTimeline.push({
        id: `T${Date.now() + 1}`,
        type: 'note',
        title: 'Note added',
        detail: effectiveNotes,
        time: formatTimelineTime(),
        createdAt: new Date(),
      });
    }

    const lead = await Lead.create({
      ...rest,
      firstName: firstName || 'Unknown',
      lastName: lastName || '',
      numberOfPeople: effectivePeople,
      specialRequests: effectiveSpecialRequests,
      notes: effectiveNotes,
      contactNotes: effectiveNotes,
      assignedAgent: rest.assignedAgent || (agentId && mongoose.Types.ObjectId.isValid(agentId) ? agentId : null),
      status: rest.status || rest.stage || 'new',
      timeline: initialTimeline,
      createdBy: agentId && mongoose.Types.ObjectId.isValid(agentId) ? agentId : null,
    });

    logger.info(`Lead created: ${lead._id}`);
    const populated = await Lead.findById(lead._id).populate('assignedAgent', 'firstName lastName email phone');
    return formatLeadResponse(populated || lead);
  } catch (error) {
    logger.error(`Create lead failed: ${error.message}`);
    throw error;
  }
};

const updateLead = async (leadId, updates = {}) => {
  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return null;

    if (updates.name && (!updates.firstName || !updates.lastName)) {
      const parts = updates.name.trim().split(/\s+/);
      updates.firstName = parts[0];
      updates.lastName = parts.slice(1).join(' ');
    }

    if (updates.travelers !== undefined && updates.numberOfPeople === undefined) {
      updates.numberOfPeople = updates.travelers;
    }

    if (updates.query !== undefined && updates.specialRequests === undefined) {
      updates.specialRequests = updates.query;
    }

    // Status change -> append timeline entry
    const newStatus = updates.status || updates.stage;
    if (newStatus && newStatus.toLowerCase() !== (lead.status || '').toLowerCase()) {
      const displayStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      lead.timeline.push({
        id: `T${Date.now()}`,
        type: 'status',
        title: 'Status changed',
        detail: `Moved to ${displayStatus}`,
        time: formatTimelineTime(),
        createdAt: new Date(),
      });
      lead.status = newStatus.toLowerCase();
    }

    // Note update -> sync both fields
    if (updates.notes !== undefined || updates.contactNotes !== undefined) {
      const noteContent = updates.notes !== undefined ? updates.notes : updates.contactNotes;
      lead.notes = noteContent;
      lead.contactNotes = noteContent;
    }

    const directFields = [
      'firstName', 'lastName', 'company', 'email', 'phone', 'destination',
      'tripType', 'travelDates', 'numberOfPeople', 'budget', 'specialRequests',
      'priority', 'assignedTo', 'assignedAgent', 'nextFollowUp', 'nextFollowUpDate',
      'lastContactDate', 'quotedPrice', 'quoteExpiresAt', 'lostReason', 'source'
    ];

    directFields.forEach((field) => {
      if (updates[field] !== undefined) {
        lead[field] = updates[field];
      }
    });

    await lead.save();
    logger.info(`Lead updated: ${leadId}`);

    const populated = await Lead.findById(lead._id).populate('assignedAgent', 'firstName lastName email phone');

    // Trigger quote ready notification if a price is quoted
    if (updates.quotedPrice !== undefined || updates.status !== undefined || updates.stage !== undefined) {
      try {
        const { notifyQuoteReady } = require('../quotes/quote.service');
        notifyQuoteReady(populated || lead);
      } catch (quoteNotifyErr) {
        logger.warn(`Quote ready notification trigger error: ${quoteNotifyErr.message}`);
      }
    }

    return formatLeadResponse(populated || lead);
  } catch (error) {
    logger.error(`Update lead failed: ${error.message}`);
    throw error;
  }
};

const addLeadNote = async (leadId, noteText) => {
  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return null;

    const formattedTime = formatTimelineTime();
    lead.notes = noteText;
    lead.contactNotes = noteText;
    lead.lastContactDate = new Date();

    lead.timeline.push({
      id: `T${Date.now()}`,
      type: 'note',
      title: 'Note added',
      detail: noteText,
      time: formattedTime,
      createdAt: new Date(),
    });

    await lead.save();
    logger.info(`Note added to lead: ${leadId}`);

    const populated = await Lead.findById(lead._id).populate('assignedAgent', 'firstName lastName email phone');
    return formatLeadResponse(populated || lead);
  } catch (error) {
    logger.error(`Add lead note failed: ${error.message}`);
    throw error;
  }
};

const convertLeadToBooking = async (leadId, { customerType = 'existing', bookingId, bookingData } = {}) => {
  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return null;

    let customerUser = null;
    if (customerType === 'new' && lead.phone) {
      customerUser = await User.findOne({ phone: lead.phone });
      if (!customerUser) {
        customerUser = await User.create({
          phone: lead.phone,
          email: lead.email || undefined,
          firstName: lead.firstName || 'Customer',
          lastName: lead.lastName || '',
          password: await bcrypt.hash('Welcome123!', 10),
          role: 'customer',
        });
        logger.info(`Created new customer ${customerUser._id} from lead ${leadId}`);
      }
      lead.convertedCustomer = customerUser._id;
    }

    const effectiveBookingId = bookingId || bookingData?._id || bookingData?.id;
    if (effectiveBookingId && mongoose.Types.ObjectId.isValid(effectiveBookingId)) {
      lead.convertedBooking = effectiveBookingId;
    }

    lead.status = 'won';
    lead.convertedAt = new Date();

    lead.timeline.push({
      id: `T${Date.now()}`,
      type: 'won',
      title: 'Lead converted',
      detail: 'Lead marked as won / converted to customer.',
      time: formatTimelineTime(),
      createdAt: new Date(),
    });

    await lead.save();
    logger.info(`Lead converted: ${leadId}`);

    const populated = await Lead.findById(lead._id)
      .populate('assignedAgent', 'firstName lastName email phone')
      .populate('convertedBooking')
      .populate('convertedCustomer', 'firstName lastName email phone');
    return formatLeadResponse(populated || lead);
  } catch (error) {
    logger.error(`Convert lead failed: ${error.message}`);
    throw error;
  }
};

const getAgentStatistics = async (agentId) => {
  try {
    const leads = await Lead.find({ assignedAgent: agentId });

    const stats = {
      totalLeads: leads.length,
      new: leads.filter((l) => l.status === 'new' || l.status === LEAD_STATUS.NEW).length,
      contacted: leads.filter((l) => l.status === 'contacted' || l.status === LEAD_STATUS.CONTACTED).length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      proposal: leads.filter((l) => l.status === 'proposal' || l.status === LEAD_STATUS.QUOTED).length,
      negotiation: leads.filter((l) => l.status === 'negotiation' || l.status === LEAD_STATUS.INTERESTED).length,
      won: leads.filter((l) => l.status === 'won' || l.status === LEAD_STATUS.CONVERTED).length,
      lost: leads.filter((l) => l.status === 'lost' || l.status === LEAD_STATUS.LOST).length,
    };

    return stats;
  } catch (error) {
    logger.error(`Get agent stats failed: ${error.message}`);
    throw error;
  }
};

const getPipelineOverview = async () => {
  try {
    const leads = await Lead.find();

    const overview = {
      totalLeads: leads.length,
      byStatus: {},
    };

    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    stages.forEach((stage) => {
      overview.byStatus[stage] = leads.filter(
        (l) => (l.status || '').toLowerCase() === stage
      ).length;
    });

    return overview;
  } catch (error) {
    logger.error(`Get pipeline overview failed: ${error.message}`);
    throw error;
  }
};


// ─── CRM HOTEL MANAGEMENT ────────────────────────────────────────

const createHotel = async (data, createdBy) => {
  try {
    const hotel = await Hotel.create({ ...data, createdBy });
    logger.info(`Hotel created: ${hotel._id} (${hotel.name})`);
    return hotel;
  } catch (error) {
    logger.error(`Create hotel failed: ${error.message}`);
    throw error;
  }
};

const listHotels = async ({ page = 1, limit = 20, search } = {}) => {
  try {
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
      ];
    }

    const hotels = await Hotel.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Hotel.countDocuments(query);

    return {
      hotels,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    logger.error(`List hotels failed: ${error.message}`);
    throw error;
  }
};

const getHotelById = async (hotelId) => {
  try {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw new AppError('Hotel not found', 404);
    return hotel;
  } catch (error) {
    logger.error(`Get hotel failed: ${error.message}`);
    throw error;
  }
};

const updateHotel = async (hotelId, updates) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(hotelId, updates, {
      new: true,
      runValidators: true,
    });
    if (!hotel) throw new AppError('Hotel not found', 404);
    logger.info(`Hotel updated: ${hotelId}`);
    return hotel;
  } catch (error) {
    logger.error(`Update hotel failed: ${error.message}`);
    throw error;
  }
};

const deleteHotel = async (hotelId, { permanent = true } = {}) => {
  try {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw new AppError('Hotel not found', 404);

    const isPermanent = permanent === undefined || permanent === true || permanent === 'true';
    if (isPermanent) {
      await Hotel.findByIdAndDelete(hotelId);
      logger.info(`Hotel permanently deleted: ${hotelId}`);
      return {
        id: hotelId,
        deleted: true,
        permanent: true,
        message: 'Hotel deleted successfully',
      };
    }

    hotel.isActive = false;
    await hotel.save();
    logger.info(`Hotel soft-deleted/deactivated: ${hotelId}`);
    return {
      id: hotelId,
      deleted: true,
      permanent: false,
      message: 'Hotel deactivated (soft-deleted) successfully',
    };
  } catch (error) {
    logger.error(`Delete hotel failed: ${error.message}`);
    throw error;
  }
};

// ─── CRM USER CREATION (including hotelier role) ─────────────────

const createCrmUser = async (userData, createdByUserId) => {
  try {
    const { email, password, firstName, lastName, phone, role, hotelId } = userData;

    if (role === 'hotelier') {
      if (!hotelId) throw new AppError('hotelId is required when role is hotelier', 400);
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) throw new AppError('Associated hotel not found', 404);
    }

    const normalizedPhone = phone?.trim();
    const normalizedEmail = email?.trim().toLowerCase() || null;

    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) throw new AppError('Phone number already registered', 409);

    if (normalizedEmail) {
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone: normalizedPhone,
      email: normalizedEmail || undefined,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'customer',
      hotelId: role === 'hotelier' ? hotelId : undefined,
      createdBy: createdByUserId ? String(createdByUserId) : null,
    });

    logger.info(`CRM User created: ${user._id} with role ${user.role}`);

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  } catch (error) {
    logger.error(`Create CRM user failed: ${error.message}`);
    throw error;
  }
};

// ─── CRM HOTEL STOCK REVIEW QUEUE ─────────────────────────────────

const listPendingHotelStock = async ({ page = 1, limit = 20 } = {}) => {
  try {
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const stocks = await HotelStock.find({ reviewStatus: 'pending_review' })
      .populate('hotelId')
      .populate('createdBy', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await HotelStock.countDocuments({ reviewStatus: 'pending_review' });

    return {
      stocks,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    logger.error(`List pending stock failed: ${error.message}`);
    throw error;
  }
};

const reviewHotelStock = async (stockId, { decision, reviewNotes }, reviewerUserId) => {
  try {
    if (!['approved', 'rejected'].includes(decision)) {
      throw new AppError("decision must be either 'approved' or 'rejected'", 400);
    }

    const stock = await HotelStock.findById(stockId);
    if (!stock) throw new AppError('Hotel stock batch not found', 404);

    stock.reviewStatus = decision;
    stock.reviewedBy = reviewerUserId;
    stock.reviewNotes = reviewNotes || stock.reviewNotes;

    await stock.save();
    logger.info(`HotelStock batch ${stockId} reviewed: ${decision} by ${reviewerUserId}`);
    return stock;
  } catch (error) {
    logger.error(`Review hotel stock failed: ${error.message}`);
    throw error;
  }
};

const listApprovedHotelStock = async () => {
  try {
    const stocks = await HotelStock.find({ reviewStatus: 'approved' })
      .populate('hotelId')
      .sort({ createdAt: -1 });

    // Filter out stock whose hotel is inactive
    return stocks.filter((stock) => stock.hotelId && stock.hotelId.isActive !== false);
  } catch (error) {
    logger.error(`List approved hotel stock failed: ${error.message}`);
    throw error;
  }
};

// ─── CRM USER MANAGEMENT (List, Get, Update, Delete) ──────────────

const listUsers = async ({
  page = 1,
  limit = 10,
  role,
  isActive,
  isVerified,
  isPhoneVerified,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (role) {
      if (role === 'staff') {
        query.role = { $ne: 'customer' };
      } else {
        query.role = role;
      }
    }

    if (isActive !== undefined && isActive !== null && isActive !== '') {
      query.isActive = isActive === true || isActive === 'true';
    }

    if (isVerified !== undefined && isVerified !== null && isVerified !== '') {
      query.isVerified = isVerified === true || isVerified === 'true';
    }

    if (isPhoneVerified !== undefined && isPhoneVerified !== null && isPhoneVerified !== '') {
      query.isPhoneVerified = isPhoneVerified === true || isPhoneVerified === 'true';
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const sortDirection = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;
    const allowedSortFields = ['createdAt', 'firstName', 'lastName', 'email', 'role', 'isActive', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .populate('hotelId', 'name destination address starRating')
        .sort({ [sortField]: sortDirection })
        .skip(skip) 
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      users,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    };
  } catch (error) {
    logger.error(`List CRM users failed: ${error.message}`);
    throw error;
  }
};
const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('hotelId', 'name destination address starRating');

    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  } catch (error) {
    logger.error(`Get CRM user failed: ${error.message}`);
    throw error;
  }
};

const updateUser = async (userId, updateData, currentAdminUser) => {
  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Role Hierarchy Protections
    if (targetUser.role === 'super_admin' && currentAdminUser?.role !== 'super_admin') {
      throw new AppError('Only super administrators can modify super_admin accounts', 403);
    }

    if (updateData.role === 'super_admin' && currentAdminUser?.role !== 'super_admin') {
      throw new AppError('Only super administrators can promote a user to super_admin', 403);
    }

    // Email Uniqueness Check
    if (updateData.email) {
      const normalizedEmail = updateData.email.trim().toLowerCase();
      const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
      if (existingEmail) {
        throw new AppError('Email is already registered by another user', 409);
      }
      targetUser.email = normalizedEmail;
    }

    // Phone Uniqueness Check
    if (updateData.phone) {
      const normalizedPhone = updateData.phone.trim();
      const existingPhone = await User.findOne({ phone: normalizedPhone, _id: { $ne: userId } });
      if (existingPhone) {
        throw new AppError('Phone number is already registered by another user', 409);
      }
      targetUser.phone = normalizedPhone;
    }

    if (updateData.firstName !== undefined) targetUser.firstName = updateData.firstName.trim();
    if (updateData.lastName !== undefined) targetUser.lastName = updateData.lastName.trim();

    if (updateData.role !== undefined) {
      targetUser.role = updateData.role;
    }

    // Hotelier role validation
    const effectiveRole = updateData.role !== undefined ? updateData.role : targetUser.role;

    if (effectiveRole === 'hotelier') {
      if (updateData.hotelId) {
        const hotel = await Hotel.findById(updateData.hotelId);
        if (!hotel) throw new AppError('Associated hotel not found', 404);
        targetUser.hotelId = updateData.hotelId;
      } else if (!targetUser.hotelId) {
        throw new AppError('hotelId is required when role is hotelier', 400);
      }
    } else {
      // Non-hoteliers do not have an associated hotel
      targetUser.hotelId = null;
    }

    if (updateData.isActive !== undefined && updateData.isActive !== null) targetUser.isActive = Boolean(updateData.isActive);
    if (updateData.isVerified !== undefined && updateData.isVerified !== null) targetUser.isVerified = Boolean(updateData.isVerified);
    if (updateData.isPhoneVerified !== undefined && updateData.isPhoneVerified !== null) targetUser.isPhoneVerified = Boolean(updateData.isPhoneVerified);
    if (updateData.avatar !== undefined) targetUser.avatar = updateData.avatar;

    if (updateData.password) {
      targetUser.password = await bcrypt.hash(updateData.password, 10);
    }

    await targetUser.save();
    logger.info(`CRM User updated: ${targetUser._id}`);

    const userObj = targetUser.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    return userObj;
  } catch (error) {
    logger.error(`Update CRM user failed: ${error.message}`);
    throw error;
  }
};

const deleteUser = async (userId, currentAdminUser, { permanent = false } = {}) => {
  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    const currentAdminId = currentAdminUser?._id || currentAdminUser?.id;
    if (currentAdminId && String(currentAdminId) === String(userId)) {
      throw new AppError('You cannot delete your own administrator account', 400);
    }

    if (targetUser.role === 'super_admin' && currentAdminUser?.role !== 'super_admin') {
      throw new AppError('Only super administrators can delete super_admin accounts', 403);
    }

    const isPermanent = permanent === true || permanent === 'true';
    if (isPermanent) {
      await User.findByIdAndDelete(userId);
      logger.info(`User permanently deleted: ${userId}`);
      return {
        id: userId,
        deleted: true,
        permanent: true,
        message: 'User permanently deleted successfully',
      };
    }

    targetUser.isActive = false;
    await targetUser.save();
    logger.info(`User soft-deleted/deactivated: ${userId}`);
    return {
      id: userId,
      deleted: true,
      permanent: false,
      message: 'User account deactivated (soft-deleted) successfully',
    };
  } catch (error) {
    logger.error(`Delete CRM user failed: ${error.message}`);
    throw error;
  }
};

// ─── CRM FINANCE & REVENUE OVERVIEW ──────────────────────────────

const getFinanceOverview = async ({ startDate, endDate, currency } = {}) => {
  try {
    const targetCurrency = currency ? currency.toUpperCase() : null;

    // Build Date Filter on createdAt
    const dateFilter = {};
    if (startDate) {
      const s = new Date(startDate);
      if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
        const [y, m, d] = startDate.trim().split('-').map(Number);
        s.setFullYear(y, m - 1, d);
      }
      s.setHours(0, 0, 0, 0);
      dateFilter.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
        const [y, m, d] = endDate.trim().split('-').map(Number);
        e.setFullYear(y, m - 1, d);
      }
      e.setHours(23, 59, 59, 999);
      dateFilter.$lte = e;
    }

    const dateMatch = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const currencyMatch = targetCurrency ? { currency: targetCurrency } : {};

    // 1. Gross Revenue & Refunds Aggregation
    // Formula: Gross Revenue = SUM(Payment.amount) where status IN ['paid', 'captured', 'partially_refunded', 'refunded']
    // Refunds = SUM(Payment.totalRefunded)
    const completedMatch = {
      status: { $in: ['paid', 'captured', 'partially_refunded', 'refunded'] },
      ...dateMatch,
      ...currencyMatch,
    };

    let completedSummary = await Payment.aggregate([
      { $match: completedMatch },
      {
        $group: {
          _id: '$currency',
          grossRevenue: { $sum: '$amount' },
          refunds: { $sum: '$totalRefunded' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    // If Payment has no records matching the query, check Booking collection
    if (!completedSummary || completedSummary.length === 0) {
      const bookingCurrencyMatch = targetCurrency
        ? { 'details.currency': new RegExp(`^${targetCurrency}$`, 'i') }
        : {};
      const bookingMatch = {
        status: { $in: ['confirmed', 'completed', 'paid'] },
        ...dateMatch,
        ...bookingCurrencyMatch,
      };

      const bookingSummary = await Booking.aggregate([
        { $match: bookingMatch },
        {
          $group: {
            _id: { $toUpper: { $ifNull: ['$details.currency', 'INR'] } },
            grossRevenue: { $sum: { $ifNull: ['$details.totalPrice', 0] } },
            refunds: { $sum: { $ifNull: ['$refundAmount', 0] } },
            totalTransactions: { $sum: 1 },
          },
        },
      ]);

      if (bookingSummary && bookingSummary.length > 0) {
        completedSummary = bookingSummary;
      }
    }

    // 2. Pending Payment Aggregation
    // Formula: Pending Payment = SUM(Payment.amount) where status IN ['pending', 'created', 'authorized'] AND expiresAt > NOW()
    const now = new Date();
    const pendingMatch = {
      status: { $in: ['pending', 'created', 'authorized'] },
      expiresAt: { $gt: now },
      ...dateMatch,
      ...currencyMatch,
    };

    let pendingSummary = await Payment.aggregate([
      { $match: pendingMatch },
      {
        $group: {
          _id: '$currency',
          pendingPayment: { $sum: '$amount' },
          pendingTransactions: { $sum: 1 },
        },
      },
    ]);

    if (!pendingSummary || pendingSummary.length === 0) {
      const pendingBookingMatch = {
        status: 'pending',
        ...dateMatch,
        ...(targetCurrency ? { 'details.currency': new RegExp(`^${targetCurrency}$`, 'i') } : {}),
      };
      const pbSummary = await Booking.aggregate([
        { $match: pendingBookingMatch },
        {
          $group: {
            _id: { $toUpper: { $ifNull: ['$details.currency', 'INR'] } },
            pendingPayment: { $sum: { $ifNull: ['$details.totalPrice', 0] } },
            pendingTransactions: { $sum: 1 },
          },
        },
      ]);
      if (pbSummary && pbSummary.length > 0) {
        pendingSummary = pbSummary;
      }
    }

    // Format output
    // Case A: Specific currency was requested
    if (targetCurrency) {
      const comp = completedSummary.find((c) => c._id === targetCurrency) || {};
      const pend = pendingSummary.find((p) => p._id === targetCurrency) || {};

      const grossRevenue = Number((comp.grossRevenue || 0).toFixed(2));
      const refunds = Number((comp.refunds || 0).toFixed(2));
      const netRevenue = Number((grossRevenue - refunds).toFixed(2));
      const pendingPayment = Number((pend.pendingPayment || 0).toFixed(2));
      const totalTransactions = comp.totalTransactions || 0;

      return {
        grossRevenue,
        pendingPayment,
        netRevenue,
        refunds,
        totalTransactions,
        currency: targetCurrency,
      };
    }

    // Case B: No currency specified -> evaluate all currencies in results
    const allCurrencies = Array.from(
      new Set([
        ...completedSummary.map((c) => c._id),
        ...pendingSummary.map((p) => p._id),
      ])
    );

    if (allCurrencies.length === 0) {
      return {
        grossRevenue: 0,
        pendingPayment: 0,
        netRevenue: 0,
        refunds: 0,
        totalTransactions: 0,
        currency: 'INR',
      };
    }

    if (allCurrencies.length === 1) {
      const curr = allCurrencies[0];
      const comp = completedSummary.find((c) => c._id === curr) || {};
      const pend = pendingSummary.find((p) => p._id === curr) || {};

      const grossRevenue = Number((comp.grossRevenue || 0).toFixed(2));
      const refunds = Number((comp.refunds || 0).toFixed(2));
      const netRevenue = Number((grossRevenue - refunds).toFixed(2));
      const pendingPayment = Number((pend.pendingPayment || 0).toFixed(2));
      const totalTransactions = comp.totalTransactions || 0;

      return {
        grossRevenue,
        pendingPayment,
        netRevenue,
        refunds,
        totalTransactions,
        currency: curr,
      };
    }

    // Multiple currencies found
    const byCurrency = allCurrencies.map((curr) => {
      const comp = completedSummary.find((c) => c._id === curr) || {};
      const pend = pendingSummary.find((p) => p._id === curr) || {};
      const grossRevenue = Number((comp.grossRevenue || 0).toFixed(2));
      const refunds = Number((comp.refunds || 0).toFixed(2));
      const netRevenue = Number((grossRevenue - refunds).toFixed(2));
      const pendingPayment = Number((pend.pendingPayment || 0).toFixed(2));
      const totalTransactions = comp.totalTransactions || 0;

      return {
        grossRevenue,
        pendingPayment,
        netRevenue,
        refunds,
        totalTransactions,
        currency: curr,
      };
    });

    const primary = byCurrency[0];
    return {
      grossRevenue: primary.grossRevenue,
      pendingPayment: primary.pendingPayment,
      netRevenue: primary.netRevenue,
      refunds: primary.refunds,
      totalTransactions: primary.totalTransactions,
      currency: primary.currency,
      byCurrency,
    };
  } catch (error) {
    logger.error(`Get finance overview failed: ${error.message}`);
    throw error;
  }
};

// ─── CRM FINANCE TRANSACTIONS ────────────────────────────────────

const listTransactions = async ({
  page = 1,
  limit = 20,
  status,
  paymentMethod,
  bookingType,
  currency,
  startDate,
  endDate,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (bookingType) {
      query.bookingType = bookingType;
    }

    if (currency) {
      query.currency = currency.toUpperCase();
    }

    // Date range filter on createdAt
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
          const [y, m, d] = startDate.trim().split('-').map(Number);
          s.setFullYear(y, m - 1, d);
        }
        s.setHours(0, 0, 0, 0);
        query.createdAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
          const [y, m, d] = endDate.trim().split('-').map(Number);
          e.setFullYear(y, m - 1, d);
        }
        e.setHours(23, 59, 59, 999);
        query.createdAt.$lte = e;
      }
    }

    // Text search on gatewayData (transactionId, orderId, captureId)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'gatewayData.transactionId': searchRegex },
        { 'gatewayData.orderId': searchRegex },
        { 'gatewayData.captureId': searchRegex },
      ];
    }

    const sortDirection = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;
    const sortField = ['createdAt', 'amount', 'paidAt', 'updatedAt'].includes(sortBy)
      ? sortBy
      : 'createdAt';

    let [transactions, total] = await Promise.all([
      Payment.find(query)
        .populate('userId', 'firstName lastName email phone avatar role')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(query),
    ]);

    // If Payment collection has 0 records matching the filter, surface confirmed/pending bookings from Booking model
    if (total === 0) {
      const bQuery = {};
      if (status) {
        if (['paid', 'captured'].includes(status)) {
          bQuery.status = { $in: ['confirmed', 'completed'] };
        } else {
          bQuery.status = status;
        }
      }
      if (bookingType) bQuery.bookingType = bookingType;
      if (currency) bQuery['details.currency'] = new RegExp(`^${currency}$`, 'i');
      if (query.createdAt) bQuery.createdAt = query.createdAt;

      const [bookings, bTotal] = await Promise.all([
        Booking.find(bQuery)
          .populate('userId', 'firstName lastName email phone avatar role')
          .sort({ createdAt: sortDirection })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Booking.countDocuments(bQuery),
      ]);

      if (bTotal > 0) {
        transactions = bookings.map((b) => ({
          _id: b._id,
          userId: b.userId,
          bookingId: b._id,
          bookingType: b.bookingType || 'flight',
          paymentMethod: 'bank_transfer',
          amount: b.details?.totalPrice || 0,
          currency: (b.details?.currency || 'INR').toUpperCase(),
          status: ['confirmed', 'completed'].includes(b.status) ? 'paid' : (b.status || 'pending'),
          paidAt: b.updatedAt || b.createdAt,
          totalRefunded: b.refundAmount || 0,
          refunds: [],
          gatewayData: {
            transactionId: `TXN-${String(b._id).slice(-8).toUpperCase()}`,
          },
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }));
        total = bTotal;
      }
    }

    return {
      transactions,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  } catch (error) {
    logger.error(`List transactions failed: ${error.message}`);
    throw error;
  }
};

const getTransactionById = async (transactionId) => {
  try {
    const transaction = await Payment.findById(transactionId)
      .populate('userId', 'firstName lastName email phone avatar role')
      .lean();
    if (!transaction) throw new AppError('Transaction not found', 404);
    return transaction;
  } catch (error) {
    logger.error(`Get transaction failed: ${error.message}`);
    throw error;
  }
};

// ─── CRM FINANCE REFUNDS ─────────────────────────────────────────

const listRefunds = async ({
  page = 1,
  limit = 20,
  status,
  currency,
  paymentMethod,
  bookingType,
  startDate,
  endDate,
  search,
  sortBy = 'requestedAt',
  sortOrder = 'desc',
} = {}) => {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Match payments having at least 1 refund
    const initialMatch = { 'refunds.0': { $exists: true } };

    if (paymentMethod) initialMatch.paymentMethod = paymentMethod;
    if (bookingType) initialMatch.bookingType = bookingType;
    if (currency) initialMatch.currency = currency.toUpperCase();

    // Post-unwind filter on specific refund properties
    const refundMatch = {};
    if (status) {
      refundMatch['refunds.status'] = status;
    }
    if (startDate || endDate) {
      refundMatch['refunds.requestedAt'] = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        refundMatch['refunds.requestedAt'].$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        refundMatch['refunds.requestedAt'].$lte = e;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      refundMatch.$or = [
        { 'refunds.refundId': searchRegex },
        { 'refunds.reason': searchRegex },
        { 'gatewayData.transactionId': searchRegex },
        { 'gatewayData.orderId': searchRegex },
      ];
    }

    const sortDirection = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;
    const sortKey = sortBy === 'amount'
      ? 'refunds.amount'
      : sortBy === 'processedAt'
      ? 'refunds.processedAt'
      : 'refunds.requestedAt';

    const pipeline = [
      { $match: initialMatch },
      { $unwind: '$refunds' },
      ...(Object.keys(refundMatch).length > 0 ? [{ $match: refundMatch }] : []),
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: '$refunds._id',
          refundId: '$refunds.refundId',
          amount: '$refunds.amount',
          currency: '$refunds.currency',
          status: '$refunds.status',
          reason: '$refunds.reason',
          requestedAt: '$refunds.requestedAt',
          processedAt: '$refunds.processedAt',
          gatewayResponse: '$refunds.gatewayResponse',
          payment: {
            paymentId: '$_id',
            amount: '$amount',
            currency: '$currency',
            status: '$status',
            paymentMethod: '$paymentMethod',
            totalRefunded: '$totalRefunded',
            bookingId: '$bookingId',
            bookingModel: '$bookingModel',
            bookingType: '$bookingType',
            gatewayData: '$gatewayData',
          },
          customer: {
            _id: '$customer._id',
            firstName: '$customer.firstName',
            lastName: '$customer.lastName',
            email: '$customer.email',
            phone: '$customer.phone',
            avatar: '$customer.avatar',
          },
        },
      },
      { $sort: { [sortKey]: sortDirection } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'total' }],
        },
      },
    ];

    const [result] = await Payment.aggregate(pipeline);
    const refunds = result?.data || [];
    const total = result?.totalCount?.[0]?.total || 0;

    return {
      refunds,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } catch (error) {
    logger.error(`List refunds failed: ${error.message}`);
    throw error;
  }
};

const updateRefundStatus = async (refundId, { status, reason, gatewayResponse } = {}) => {
  try {
    const isMongoId = mongoose.Types.ObjectId.isValid(refundId);
    const query = isMongoId
      ? { $or: [{ 'refunds._id': new mongoose.Types.ObjectId(refundId) }, { 'refunds.refundId': refundId }] }
      : { 'refunds.refundId': refundId };

    const payment = await Payment.findOne(query);
    if (!payment) {
      throw new AppError('Refund record not found', 404);
    }

    const refund = payment.refunds.find(
      (r) => String(r.refundId) === String(refundId) || (isMongoId && String(r._id) === String(refundId))
    );

    if (!refund) {
      throw new AppError('Refund record not found within payment', 404);
    }

    // Update refund fields
    refund.status = status;
    if (status === 'processed' && !refund.processedAt) {
      refund.processedAt = new Date();
    }
    if (reason) {
      refund.reason = reason;
    }
    if (gatewayResponse) {
      refund.gatewayResponse = gatewayResponse;
    }

    // Recalculate totalRefunded strictly from processed refunds
    const processedTotal = payment.refunds
      .filter((r) => r.status === 'processed')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    payment.totalRefunded = Number(processedTotal.toFixed(2));

    // Update parent payment lifecycle status
    if (payment.totalRefunded >= payment.amount) {
      payment.status = PAYMENT_STATUS.REFUNDED;
    } else if (payment.totalRefunded > 0) {
      payment.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
    } else if (payment.status === PAYMENT_STATUS.REFUNDED || payment.status === PAYMENT_STATUS.PARTIALLY_REFUNDED) {
      payment.status = PAYMENT_STATUS.PAID;
    }

    await payment.save();
    logger.info(`Refund ${refundId} status updated to ${status} on payment ${payment._id}`);

    return {
      refundId: refund.refundId,
      refundMongoId: refund._id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      processedAt: refund.processedAt,
      paymentId: payment._id,
      paymentStatus: payment.status,
      totalRefunded: payment.totalRefunded,
    };
  } catch (error) {
    logger.error(`Update refund status failed: ${error.message}`);
    throw error;
  }
};

// ─── CRM CUSTOMER MANAGEMENT ─────────────────────────────────────

/**
 * List all customers with aggregate metrics:
 * - totalTravellers
 * - bookedOffersCount
 * - totalMoneySpent
 */
const listCustomers = async ({
  page = 1,
  limit = 20,
  search,
  isActive,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Filter strictly for customer role
    const query = { role: 'customer' };

    if (isActive !== undefined && isActive !== null && isActive !== '') {
      query.isActive = String(isActive) === 'true';
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const sortDirection = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;
    const sortField = ['createdAt', 'firstName', 'lastName', 'updatedAt'].includes(sortBy)
      ? sortBy
      : 'createdAt';

    const [customers, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName phone email avatar isActive createdAt updatedAt')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    if (customers.length === 0) {
      return {
        customers: [],
        meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      };
    }

    const customerIds = customers.map((c) => c._id);

    // Parallel aggregate queries across Traveller, OfferBooking & Payment
    const [travellersAgg, offersAgg, paymentsAgg] = await Promise.all([
      // 1. Total travellers per customer
      Traveller.aggregate([
        { $match: { userId: { $in: customerIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),

      // 2. Booked offers count per customer
      OfferBooking.aggregate([
        { $match: { userId: { $in: customerIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),

      // 3. Total money spent (Paid/Captured/Partially Refunded payments minus refunds)
      Payment.aggregate([
        {
          $match: {
            userId: { $in: customerIds },
            status: { $in: ['paid', 'captured', 'partially_refunded'] },
          },
        },
        {
          $group: {
            _id: '$userId',
            totalSpent: {
              $sum: { $subtract: ['$amount', { $ifNull: ['$totalRefunded', 0] }] },
            },
          },
        },
      ]),
    ]);

    const travellersMap = new Map(travellersAgg.map((t) => [String(t._id), t.count]));
    const offersMap = new Map(offersAgg.map((o) => [String(o._id), o.count]));
    const spentMap = new Map(paymentsAgg.map((p) => [String(p._id), p.totalSpent]));

    const formattedCustomers = customers.map((c) => {
      const idStr = String(c._id);
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'N/A';
      return {
        _id: c._id,
        name: fullName,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email || null,
        totalTravellers: travellersMap.get(idStr) || 0,
        bookedOffersCount: offersMap.get(idStr) || 0,
        isActive: c.isActive ?? true,
        totalMoneySpent: Number((spentMap.get(idStr) || 0).toFixed(2)),
        createdAt: c.createdAt,
      };
    });

    return {
      customers: formattedCustomers,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } catch (error) {
    logger.error(`List customers failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get detailed customer profile with lifetime spending, bookings & travellers breakdown
 */
const getCustomerById = async (customerId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new AppError('Invalid customer ID format', 400);
    }

    const customer = await User.findOne({ _id: customerId, role: 'customer' })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .lean();

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Parallel metrics query
    const [totalTravellers, bookedOffersCount, totalBookingsCount, paymentsAgg, recentBookings] =
      await Promise.all([
        Traveller.countDocuments({ userId: customer._id }),
        OfferBooking.countDocuments({ userId: customer._id }),
        Booking.countDocuments({ userId: customer._id }),
        Payment.aggregate([
          {
            $match: {
              userId: customer._id,
              status: { $in: ['paid', 'captured', 'partially_refunded'] },
            },
          },
          {
            $group: {
              _id: '$currency',
              totalSpent: {
                $sum: { $subtract: ['$amount', { $ifNull: ['$totalRefunded', 0] }] },
              },
              count: { $sum: 1 },
            },
          },
        ]),
        Booking.find({ userId: customer._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    const totalMoneySpent = paymentsAgg.reduce((sum, p) => sum + (p.totalSpent || 0), 0);

    return {
      _id: customer._id,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A',
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email || null,
      avatar: customer.avatar || null,
      role: customer.role,
      isActive: customer.isActive ?? true,
      isVerified: customer.isVerified ?? false,
      isPhoneVerified: customer.isPhoneVerified ?? false,
      totalTravellers,
      bookedOffersCount,
      totalBookingsCount,
      totalMoneySpent: Number(totalMoneySpent.toFixed(2)),
      currencyBreakdown: paymentsAgg.map((p) => ({
        currency: p._id,
        spent: Number(p.totalSpent.toFixed(2)),
        transactions: p.count,
      })),
      recentBookings,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  } catch (error) {
    logger.error(`Get customer details failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get all travellers registered under a specific customer
 */
const getCustomerTravellers = async (customerId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new AppError('Invalid customer ID format', 400);
    }

    const customer = await User.findOne({ _id: customerId, role: 'customer' })
      .select('firstName lastName phone email')
      .lean();

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const travellers = await Traveller.find({ userId: customerId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return {
      customer: {
        _id: customer._id,
        name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A',
        phone: customer.phone,
        email: customer.email || null,
      },
      totalTravellers: travellers.length,
      travellers: travellers.map((t) => ({
        _id: t._id,
        title: t.title,
        firstName: t.firstName,
        lastName: t.lastName,
        middleName: t.middleName || null,
        fullName: [t.title, t.firstName, t.middleName, t.lastName].filter(Boolean).join(' '),
        passengerType: t.passengerType,
        gender: t.gender,
        dateOfBirth: t.dateOfBirth,
        nationality: t.nationality,
        email: t.email || null,
        phone: t.phone || null,
        cellCountryCode: t.cellCountryCode || '+91',
        passportNo: t.passportNo || null,
        passportExpiry: t.passportExpiry || null,
        passportIssueCountryCode: t.passportIssueCountryCode || null,
        passportIssueDate: t.passportIssueDate || null,
        address: {
          addressLine1: t.addressLine1 || null,
          city: t.city || null,
          countryCode: t.countryCode || 'IN',
          countryName: t.countryName || 'INDIA',
        },
        documentType: t.documentType || null,
        documentId: t.documentId || null,
        isDefault: t.isDefault || false,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    };
  } catch (error) {
    logger.error(`Get customer travellers failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  addLeadNote,
  convertLeadToBooking,
  getAgentStatistics,
  getPipelineOverview,
  createHotel,
  listHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
  createCrmUser,
  listPendingHotelStock,
  reviewHotelStock,
  listApprovedHotelStock,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  getFinanceOverview,
  listTransactions,
  getTransactionById,
  listRefunds,
  updateRefundStatus,
  listCustomers,
  getCustomerById,
  getCustomerTravellers,
};

