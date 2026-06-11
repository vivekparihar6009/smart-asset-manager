const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Fetch all maintenance tickets
router.get('/', verifyToken, maintenanceController.getMaintenanceLogs);

// Report a new asset maintenance ticket
router.post('/', verifyToken, maintenanceController.createMaintenanceLog);

// Resolve an active maintenance ticket (Admin only)
router.put('/:id/resolve', verifyToken, requireAdmin, maintenanceController.resolveMaintenanceLog);

module.exports = router;
