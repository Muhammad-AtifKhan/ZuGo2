import { Router } from 'express';
import { createBooking, getMyBookings, confirmBooking, getActiveBooking, getBookingById, cancelBooking, rescheduleBooking, rateBooking } from '../controllers/bookingController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Protected routes (Passengers must be logged in to book/view bookings)
router.post('/', requireAuth, createBooking);
router.post('/:id/confirm', requireAuth, confirmBooking);
router.post('/:id/cancel', requireAuth, cancelBooking);
router.post('/:id/reschedule', requireAuth, rescheduleBooking);
router.post('/:id/rate', requireAuth, rateBooking);
router.get('/my-bookings', requireAuth, getMyBookings);
router.get('/active', requireAuth, getActiveBooking);
router.get('/:id', requireAuth, getBookingById);

export default router;
