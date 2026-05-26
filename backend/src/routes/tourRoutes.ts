import { Router } from 'express';
import { getMyTours, createTour, deleteTour } from '../controllers/tourController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Protected routes (Passengers must be logged in)
router.get('/', requireAuth, getMyTours);
router.post('/', requireAuth, createTour);
router.delete('/:id', requireAuth, deleteTour);

export default router;
