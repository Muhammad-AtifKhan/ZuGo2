import { Router } from 'express';
import { getAllCities, createCity } from '../controllers/cityController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Public route to get all cities
router.get('/', getAllCities);

// Protected route to create a city (Admin only ideally, but using general auth for now)
router.post('/', requireAuth, createCity);

export default router;
