"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Protected routes (Passengers must be logged in to book/view bookings)
router.post('/', authMiddleware_1.requireAuth, bookingController_1.createBooking);
router.post('/:id/confirm', authMiddleware_1.requireAuth, bookingController_1.confirmBooking);
router.post('/:id/cancel', authMiddleware_1.requireAuth, bookingController_1.cancelBooking);
router.post('/:id/reschedule', authMiddleware_1.requireAuth, bookingController_1.rescheduleBooking);
router.post('/:id/rate', authMiddleware_1.requireAuth, bookingController_1.rateBooking);
router.get('/my-bookings', authMiddleware_1.requireAuth, bookingController_1.getMyBookings);
router.get('/active', authMiddleware_1.requireAuth, bookingController_1.getActiveBooking);
router.get('/:id', authMiddleware_1.requireAuth, bookingController_1.getBookingById);
exports.default = router;
