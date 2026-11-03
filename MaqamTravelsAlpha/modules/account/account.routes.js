const router = require('express').Router();
const travellerRoutes = require('./traveller.routes');

/**
 * ─── ACCOUNT ROUTES ────────────────────────────────────
 * User traveller endpoints mounted under /api/v1/account
 */
router.use('/traveller', travellerRoutes);

module.exports = router;
