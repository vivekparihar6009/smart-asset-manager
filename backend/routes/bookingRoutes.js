const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Check asset availability dynamically over a date window
router.get('/availability', verifyToken, bookingController.getAvailability);

// Create new multi-item booking request
router.post('/', verifyToken, bookingController.createBooking);

// Get borrowing history logs for logged-in user
router.get('/my', verifyToken, bookingController.getMyBookings);

// Get system-wide booking requests (Admin only - filters by status supported)
router.get('/', verifyToken, requireAdmin, bookingController.getBookings);

// Approve a booking request (Admin only)
router.post('/:id/approve', verifyToken, requireAdmin, bookingController.approveBooking);

// Reject a booking request (Admin only)
router.post('/:id/reject', verifyToken, requireAdmin, bookingController.rejectBooking);

module.exports = router;
