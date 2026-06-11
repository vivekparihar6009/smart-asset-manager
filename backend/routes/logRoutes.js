const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// User notifications routes
router.get('/notifications', verifyToken, logController.getNotifications);
router.put('/notifications/:id/read', verifyToken, logController.markAsRead);

// Global audit logs (Admin only)
router.get('/audit-logs', verifyToken, requireAdmin, logController.getAuditLogs);

module.exports = router;
