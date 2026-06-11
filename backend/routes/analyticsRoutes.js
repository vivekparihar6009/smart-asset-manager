const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Fetch admin dashboard analytics data
router.get('/dashboard', verifyToken, requireAdmin, analyticsController.getDashboardData);

module.exports = router;
