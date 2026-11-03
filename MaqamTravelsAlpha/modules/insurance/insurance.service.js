const crypto = require('crypto');
const { InsurancePlan, InsurancePolicy } = require('./insurance.model');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * ─── HELPER: Calculate duration in days ────────────────────
 */
const calculateDurationDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid startDate or endDate format', 400);
  }

  if (end < start) {
    throw new AppError('endDate cannot be earlier than startDate', 400);
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  return Math.max(1, diffDays);
};

/**
 * ─── HELPER: Calculate tier/duration pricing ──────────────
 */
const calculateTierPrice = (plan, durationDays) => {
  if (Array.isArray(plan.durationOptions) && plan.durationOptions.length > 0) {
    // 1. Look for an exact matching range
    const matchedOption = plan.durationOptions.find(
      (opt) => durationDays >= opt.minDays && durationDays <= opt.maxDays
    );

    if (matchedOption) {
      return matchedOption.price;
    }

    // 2. If duration exceeds all tiers, use highest tier + daily overage
    const sortedOptions = [...plan.durationOptions].sort((a, b) => b.maxDays - a.maxDays);
    const highestTier = sortedOptions[0];

    if (durationDays > highestTier.maxDays) {
      const extraDays = durationDays - highestTier.maxDays;
      const dailyRate = Math.max(1, plan.basePrice / 7);
      return Math.round((highestTier.price + extraDays * dailyRate) * 100) / 100;
    }

    // 3. If under lowest tier
    const lowestTier = sortedOptions[sortedOptions.length - 1];
    return lowestTier.price;
  }

  // Fallback: duration in weeks * basePrice
  const weeks = Math.max(1, Math.ceil(durationDays / 7));
  return plan.basePrice * weeks;
};

/**
 * ─── 1. GET ACTIVE PLANS (PUBLIC) ──────────────────────────
 */
const getPlans = async ({
  page = 1,
  limit = 10,
  planType,
  // destinationScope,
  // provider,
  // minPrice,
  // maxPrice,
  // search,
}) => {
  const query = { isActive: true, isDeleted: false };

  if (planType) query.planType = planType;
  // if (destinationScope) query.destinationScope = destinationScope;
  // if (provider) query.provider = new RegExp(provider.trim(), 'i');

  // if (minPrice !== undefined || maxPrice !== undefined) {
  //   query.basePrice = {};
  //   if (minPrice !== undefined) query.basePrice.$gte = Number(minPrice);
  //   if (maxPrice !== undefined) query.basePrice.$lte = Number(maxPrice);
  // }

  // if (search) {
  //   const searchRegex = new RegExp(search.trim(), 'i');
  //   query.$or = [{ name: searchRegex }, { provider: searchRegex }, { description: searchRegex }];
  // }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await InsurancePlan.countDocuments(query);
  const plans = await InsurancePlan.find(query)
    .sort({ basePrice: 1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return { plans, total, page: Number(page), limit: Number(limit) };
};

/**
 * ─── 2. GET SINGLE PLAN DETAIL (PUBLIC) ────────────────────
 */
const getPlanById = async (id) => {
  const plan = await InsurancePlan.findOne({ _id: id, isDeleted: false });
  if (!plan) {
    throw new AppError('Insurance plan not found', 404);
  }
  return plan;
};

/**
 * ─── 3. GET QUOTE (PUBLIC) ─────────────────────────────────
 */
const calculateQuote = async ({ planId, startDate, endDate, travelers, addOnNames = [] }) => {
  const plan = await InsurancePlan.findOne({ _id: planId, isActive: true, isDeleted: false });
  if (!plan) {
    throw new AppError('Insurance plan not found or currently inactive', 404);
  }

  if (!Array.isArray(travelers) || travelers.length === 0) {
    throw new AppError('At least one traveler is required for quotation', 400);
  }

  const durationDays = calculateDurationDays(startDate, endDate);
  const baseRatePerPerson = calculateTierPrice(plan, durationDays);

  // Match and calculate selected add-ons
  const selectedAddOns = [];
  let addOnsTotalPerPerson = 0;

  if (Array.isArray(addOnNames) && addOnNames.length > 0 && Array.isArray(plan.addOns)) {
    const normalizedSelectedNames = addOnNames.map((n) => String(n).trim().toLowerCase());
    plan.addOns.forEach((addOn) => {
      if (normalizedSelectedNames.includes(addOn.name.trim().toLowerCase())) {
        selectedAddOns.push({
          name: addOn.name,
          price: addOn.price,
          description: addOn.description,
        });
        addOnsTotalPerPerson += addOn.price;
      }
    });
  }

  // Calculate per-traveler breakdown
  const travelerBreakdown = travelers.map((t, idx) => {
    const age = Number(t.age) || 0;
    let ageMultiplier = 1.0;

    // Senior citizen loading (> 65 years = 20% surcharge, > 75 = 50% surcharge)
    if (age > 75) {
      ageMultiplier = 1.5;
    } else if (age > 65) {
      ageMultiplier = 1.2;
    }

    const travelerBaseRate = Math.round(baseRatePerPerson * ageMultiplier * 100) / 100;
    const travelerTotal = Math.round((travelerBaseRate + addOnsTotalPerPerson) * 100) / 100;

    return {
      travelerIndex: idx + 1,
      name: t.name || `Traveler ${idx + 1}`,
      age,
      baseRate: travelerBaseRate,
      addOnsRate: addOnsTotalPerPerson,
      total: travelerTotal,
    };
  });

  const totalPremium = travelerBreakdown.reduce((sum, item) => sum + item.total, 0);

  return {
    plan: {
      id: plan._id,
      name: plan.name,
      provider: plan.provider,
      planType: plan.planType,
      destinationScope: plan.destinationScope,
      currency: plan.currency,
    },
    tripDetails: {
      startDate: new Date(startDate).toISOString().split('T')[0],
      endDate: new Date(endDate).toISOString().split('T')[0],
      durationDays,
    },
    pricingBreakdown: {
      baseRatePerPerson,
      durationDays,
      travelersCount: travelers.length,
      selectedAddOns,
      addOnsTotal: addOnsTotalPerPerson * travelers.length,
      travelerBreakdown,
      tax: 0,
      discount: 0,
      totalPremium: Math.round(totalPremium * 100) / 100,
      currency: plan.currency,
    },
  };
};

/**
 * ─── 4. PURCHASE POLICY (USER) ─────────────────────────────
 */
const purchasePolicy = async (userId, data) => {
  const { planId, tripDetails, travelers,linkedTo, paymentReference } = data;

  const quote = await calculateQuote({
    planId,
    startDate: tripDetails.startDate,
    endDate: tripDetails.endDate,
    travelers,
 
  });

  // Generate unique policy number
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const policyNumber = `INS-${dateStr}-${randomSuffix}`;

  const policy = await InsurancePolicy.create({
    policyNumber,
    plan: planId,
    user: userId,
    tripDetails: {
      origin: tripDetails.origin,
      destination: tripDetails.destination,
      startDate: new Date(tripDetails.startDate),
      endDate: new Date(tripDetails.endDate),
      durationDays: quote.tripDetails.durationDays,
    },
    travelers: travelers.map((t) => ({
      name: t.name,
      age: Number(t.age),
      passportNumber: t.passportNumber || null,
      gender: t.gender || 'other',
      dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth) : null,
      relationship: t.relationship || 'primary',
    })),
   
    pricingBreakdown: {
      baseRate: quote.pricingBreakdown.baseRatePerPerson,
      durationDays: quote.pricingBreakdown.durationDays,
      travelersCount: quote.pricingBreakdown.travelersCount,
      addOnsTotal: quote.pricingBreakdown.addOnsTotal,
      tax: quote.pricingBreakdown.tax || 0,
      discount: quote.pricingBreakdown.discount || 0,
      totalPremium: quote.pricingBreakdown.totalPremium,
      currency: quote.pricingBreakdown.currency,
    },
    linkedTo: linkedTo || { type: 'none', refId: null },
    paymentStatus: 'paid',
    paymentReference: paymentReference || null,
    status: 'active',
    policyDocumentUrl: null,
  });

  const populatedPolicy = await InsurancePolicy.findById(policy._id)
    .populate('plan', 'name provider planType destinationScope coverageDetails')
    .populate('user', 'firstName lastName email phone');

  logger.info(`Insurance policy issued: ${policy.policyNumber} for user: ${userId}`);

  return populatedPolicy;
};

/**
 * ─── 5. GET USER'S POLICIES (USER) ─────────────────────────
 */
const getMyPolicies = async (userId, { page = 1, limit = 10, status }) => {
  const query = { user: userId };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await InsurancePolicy.countDocuments(query);
  const policies = await InsurancePolicy.find(query)
    .populate('plan', 'name provider planType destinationScope coverageDetails currency')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return { policies, total, page: Number(page), limit: Number(limit) };
};

/**
 * ─── 6. GET SINGLE POLICY DETAIL (USER OR STAFF) ───────────
 */
const getPolicyById = async (policyId, user) => {
  const policy = await InsurancePolicy.findById(policyId)
    .populate('plan')
    .populate('user', 'firstName lastName email phone');

  if (!policy) {
    throw new AppError('Insurance policy not found', 404);
  }

  const isOwner = policy.user?._id?.toString() === user._id?.toString();
  const staffRoles = ['admin', 'super_admin', 'sales_agent', 'support_agent'];
  const isStaff = staffRoles.includes(user.role);

  if (!isOwner && !isStaff) {
    throw new AppError('You do not have permission to view this policy', 403);
  }

  return policy;
};

/**
 * ─── 7. FILE A CLAIM (USER) ────────────────────────────────
 */
const createClaim = async (policyId, userOrUserId, claimData = {}) => {
  const { description = '', amountClaimed = 0, documents = [] } = claimData;
  const policy = await InsurancePolicy.findById(policyId);
 
  if (!policy) {
    throw new AppError('Insurance policy not found', 404);
  }

  const currentUserId = (userOrUserId?._id || userOrUserId?.id || userOrUserId)?.toString();
  const currentUserRole = userOrUserId?.role;

  const isOwner = policy.user?.toString() === currentUserId;
  const staffRoles = ['admin', 'super_admin', 'sales_agent', 'support_agent'];
  const isStaff = staffRoles.includes(currentUserRole);

  if (!isOwner && !isStaff) {
    throw new AppError('You do not have permission to file a claim on this policy', 403);
  }

  // Policy must be active (or returns 422 Unprocessable Entity)
  if (policy.status !== 'active') {
    throw new AppError(
      `Cannot file claim: Policy is currently '${policy.status}'. Claims can only be filed on active policies.`,
      422
    );
  }

  const claimRandom = crypto.randomBytes(2).toString('hex').toUpperCase();
  const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${claimRandom}`;

  const newClaim = {
    claimNumber,
    description: typeof description === 'string' ? description.trim() : '',
    amountClaimed: Number(amountClaimed) || 0,
    amountApproved: 0,
    currency: policy.pricingBreakdown?.currency || 'USD',
    documents: Array.isArray(documents) ? documents : [],
    status: 'pending',
    adminNotes: null,
    filedAt: new Date(),
    resolvedAt: null,
    resolvedBy: null,
  };

  policy.claims.push(newClaim);
  await policy.save();

  logger.info(`Claim filed: ${claimNumber} on policy ${policy.policyNumber} by user ${currentUserId}`);

  const addedClaim = policy.claims[policy.claims.length - 1];
  return {
    policyNumber: policy.policyNumber,
    claim: addedClaim,
  };
};

/**
 * ─── 8. CREATE PLAN (ADMIN) ────────────────────────────────
 */
const createPlanAdmin = async (planData, adminUserId) => {
  const plan = await InsurancePlan.create({
    ...planData,
    createdBy: adminUserId || null,
  });

  logger.info(`Insurance plan created by admin: ${plan.name} (${plan._id})`);
  return plan;
};

/**
 * ─── 9. UPDATE PLAN (ADMIN) ────────────────────────────────
 */
const updatePlanAdmin = async (id, updateData) => {
  const plan = await InsurancePlan.findOne({ _id: id, isDeleted: false });
  if (!plan) {
    throw new AppError('Insurance plan not found', 404);
  }

  Object.assign(plan, updateData);
  await plan.save();

  logger.info(`Insurance plan updated by admin: ${plan._id}`);
  return plan;
};

/**
 * ─── 10. SOFT-DELETE PLAN (ADMIN) ──────────────────────────
 */
const deletePlanAdmin = async (id) => {
  const plan = await InsurancePlan.findOne({ _id: id, isDeleted: false });
  if (!plan) {
    throw new AppError('Insurance plan not found', 404);
  }

  plan.isActive = false;
  plan.isDeleted = true;
  await plan.save();

  logger.info(`Insurance plan soft-deleted by admin: ${id}`);
  return { message: 'Insurance plan soft-deleted successfully', planId: id };
};

/**
 * ─── 11. GET ALL POLICIES (ADMIN) ──────────────────────────
 */
const getAdminPolicies = async ({ page = 1, limit = 10, status, paymentStatus }) => {
  const query = {};

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  // if (search) {
  //   const searchRegex = new RegExp(search.trim(), 'i');
  //   query.$or = [
  //     { policyNumber: searchRegex },
  //     { 'travelers.name': searchRegex },
  //     { 'tripDetails.origin': searchRegex },
  //     { 'tripDetails.destination': searchRegex },
  //     { paymentReference: searchRegex },
  //   ];
  // }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await InsurancePolicy.countDocuments(query);
  const policies = await InsurancePolicy.find(query)
    .populate('plan', 'name provider planType destinationScope')
    .populate('user', 'firstName lastName email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return { policies, total, page: Number(page), limit: Number(limit) };
};

/**
 * ─── 12. UPDATE POLICY STATUS (ADMIN) ──────────────────────
 */
const updatePolicyStatusAdmin = async (id, status) => {
  const policy = await InsurancePolicy.findById(id);
  if (!policy) {
    throw new AppError('Insurance policy not found', 404);
  }

  policy.status = status;
  await policy.save();

  logger.info(`Insurance policy status updated: ${policy.policyNumber} -> ${status}`);
  return policy;
};

/**
 * ─── 13. RESOLVE CLAIM (ADMIN) ─────────────────────────────
 */
const resolveClaimAdmin = async (
  policyId,
  claimId,
  { status, amountApproved, adminNotes },
  adminUserId
) => {
  const policy = await InsurancePolicy.findById(policyId);
  if (!policy) {
    throw new AppError('Insurance policy not found', 404);
  }

  const claim = policy.claims.id(claimId);
  if (!claim) {
    throw new AppError('Claim not found in policy', 404);
  }

  claim.status = status;
  if (amountApproved !== undefined) claim.amountApproved = Number(amountApproved);
  if (adminNotes !== undefined) claim.adminNotes = adminNotes;
  claim.resolvedAt = new Date();
  claim.resolvedBy = adminUserId;

  if (status === 'approved' || status === 'paid') {
    policy.status = 'claimed';
  }

  await policy.save();

  logger.info(`Claim ${claim.claimNumber} on policy ${policy.policyNumber} resolved as ${status}`);

  return {
    policyNumber: policy.policyNumber,
    claim,
  };
};

module.exports = {
  getPlans,
  getPlanById,
  calculateQuote,
  purchasePolicy,
  getMyPolicies,
  getPolicyById,
  createClaim,
  createPlanAdmin,
  updatePlanAdmin,
  deletePlanAdmin,
  getAdminPolicies,
  updatePolicyStatusAdmin,
  resolveClaimAdmin,
};
