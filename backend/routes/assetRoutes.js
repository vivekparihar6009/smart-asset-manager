const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Get all assets (Discovery catalog)
router.get('/', verifyToken, assetController.getAssets);

// Get specific asset by ID
router.get('/:id', verifyToken, assetController.getAssetById);

// Create new asset (Admin only)
router.post('/', verifyToken, requireAdmin, assetController.createAsset);

// Update asset details (Admin only)
router.put('/:id', verifyToken, requireAdmin, assetController.updateAsset);

// Delete asset (Admin only)
router.delete('/:id', verifyToken, requireAdmin, assetController.deleteAsset);

module.exports = router;
