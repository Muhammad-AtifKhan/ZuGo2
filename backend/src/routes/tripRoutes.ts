import { Router } from 'express';
import { getAllTrips, createTrip, searchTrips, getTripSeats, reserveSeats, releaseSeats, getRescheduleOptions } from '../controllers/tripController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Public route to get all trips
router.get('/', getAllTrips);

// Search trips
router.get('/search', searchTrips);
router.get('/reschedule-options/:routeId', getRescheduleOptions);

// Seats endpoints
router.get('/:id/seats', getTripSeats);
router.post('/:id/seats/reserve', requireAuth, reserveSeats);
router.post('/:id/seats/release', requireAuth, releaseSeats);

// Protected route to create a trip
router.post('/', requireAuth, createTrip);

export default router;
