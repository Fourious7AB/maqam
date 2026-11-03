const insuranceService = require('./insurance.service');
const {
  sendSuccess,
  sendCreated,
  sendForbidden,
  sendPaginated,
} = require('../../utils/apiResponse');

/**
 * ─── 1. GET /api/v1/insurance/plans ──────────────────────────
 * Lists active insurance plans with optional query filters (Public)
 */
const getPlans = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      planType,
      // destinationScope,
      // provider,
      // minPrice,
      // maxPrice,
      // search,
    } = req.query;

    const result = await insuranceService.getPlans({
      page,
      limit,
      planType,
      // destinationScope,
      // provider,
      // minPrice,
      // maxPrice,
      // search,
    });

    return sendPaginated(res, {
      message: 'Active insurance plans retrieved successfully',
      data: result.plans,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 2. GET /api/v1/insurance/plans/:id ──────────────────────
 * Single plan detail (Public)
 */
const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await insuranceService.getPlanById(id);

    return sendSuccess(res, {
      message: 'Insurance plan details retrieved successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 3. POST /api/v1/insurance/quote ─────────────────────────
 * Calculates premium quote without creating anything (Public)
 */
const calculateQuote = async (req, res, next) => {
  try {
    const { planId, startDate, endDate, travelers, addOnNames } = req.body;

    const quote = await insuranceService.calculateQuote({
      planId,
      startDate,
      endDate,
      travelers,
      addOnNames,
    });

    return sendSuccess(res, {
      message: 'Insurance quote calculated successfully',
      data: quote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 4. POST /api/v1/insurance/purchase ──────────────────────
 * Creates a new policy for authenticated user (Bearer Token)
 */
const purchasePolicy = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const policy = await insuranceService.purchasePolicy(userId, req.body);

    return sendCreated(res, policy, 'Insurance policy purchased successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 5. GET /api/v1/insurance/my-policies ────────────────────
 * Logged-in user's policy list
 */
const getMyPolicies = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const result = await insuranceService.getMyPolicies(userId, {
      page,
      limit,
      status,
    });

    return sendPaginated(res, {
      message: 'User policies retrieved successfully',
      data: result.policies,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 6. GET /api/v1/insurance/policies/:id ───────────────────
 * Single policy detail for owner or staff
 */
const getPolicyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const policy = await insuranceService.getPolicyById(id, req.user);

    return sendSuccess(res, {
      message: 'Policy details retrieved successfully',
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 7. POST /api/v1/insurance/policies/:id/claims ───────────
 * File a claim on an active policy (Owner)
 */
const createClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const { description, amountClaimed, documents } = req.body;

    const result = await insuranceService.createClaim(id, req.user, {
      description,
      amountClaimed,
      documents,
    });

    return sendCreated(res, result, 'Insurance claim submitted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 8. POST /api/v1/insurance/admin/plans ───────────────────
 * Admin creates new insurance plan
 */
const createPlanAdmin = async (req, res, next) => {
  try {
    const adminUserId = req.user?._id || req.user?.id;
    const plan = await insuranceService.createPlanAdmin(req.body, adminUserId);

    return sendCreated(res, plan, 'Insurance plan created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 9. PUT /api/v1/insurance/admin/plans/:id ─────────────────
 * Admin full update / merge plan fields
 */
const updatePlanAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await insuranceService.updatePlanAdmin(id, req.body);

    return sendSuccess(res, {
      message: 'Insurance plan updated successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 10. DELETE /api/v1/insurance/admin/plans/:id ────────────
 * Admin soft delete (sets isActive: false, isDeleted: true)
 */
const deletePlanAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await insuranceService.deletePlanAdmin(id);

    return sendSuccess(res, {
      message: result.message,
      data: { planId: result.planId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 11. GET /api/v1/insurance/admin/policies ────────────────
 * Admin ops dashboard policy list with search & pagination
 */
const getAdminPolicies = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, paymentStatus } = req.query;

    const result = await insuranceService.getAdminPolicies({
      page,
      limit,
      status,
      paymentStatus,
      
    });

    return sendPaginated(res, {
      message: 'All insurance policies retrieved successfully',
      data: result.policies,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 12. PATCH /api/v1/insurance/admin/policies/:id/status ───
 * Admin manually update policy status
 */
const updatePolicyStatusAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const policy = await insuranceService.updatePolicyStatusAdmin(id, status);

    return sendSuccess(res, {
      message: `Policy status updated to ${status}`,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 13. PATCH /api/v1/insurance/admin/policies/:policyId/claims/:claimId ──
 * Admin resolve specific claim in policy
 */
const resolveClaimAdmin = async (req, res, next) => {
  try {
    const { policyId, claimId } = req.params;
    const adminUserId = req.user?._id || req.user?.id;
    const { status, amountApproved, adminNotes } = req.body;

    const result = await insuranceService.resolveClaimAdmin(
      policyId,
      claimId,
      { status, amountApproved, adminNotes },
      adminUserId
    );

    return sendSuccess(res, {
      message: `Claim status updated to ${status}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
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
