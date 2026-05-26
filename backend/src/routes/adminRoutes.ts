import { Router } from 'express';
import { 
  getDashboardStats, 
  getUsers, 
  toggleUserSuspend,
  getApprovals,
  approveUser,
  approveRoute,
  getActiveTrips,
  getFinance
} from '../controllers/adminController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to all admin routes
router.use(requireAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getUsers);
router.post('/users/:id/suspend', toggleUserSuspend);

// Approvals
router.get('/approvals', getApprovals);
router.post('/approvals/users/:id', approveUser);
router.post('/approvals/routes/:id', approveRoute);

// Fleet
router.get('/fleet', getActiveTrips);

// Finance
router.get('/finance', getFinance);

export default router;
