const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Check-out / Issue approved booking assets
router.post('/bookings/:id/issue', verifyToken, requireAdmin, adminController.issueAssets);

// Check-in / Return active booking assets
router.post('/bookings/:id/return', verifyToken, requireAdmin, adminController.returnAssets);

module.exports = router;
