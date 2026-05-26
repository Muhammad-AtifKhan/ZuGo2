import { Router } from 'express';
import { getAllRoutes, createRoute } from '../controllers/routeController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllRoutes);
router.post('/', requireAuth, createRoute);

export default router;
