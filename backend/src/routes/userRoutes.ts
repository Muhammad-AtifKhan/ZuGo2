import { Router } from 'express';
import {
  syncUser,
  getProfile,
  updateProfile,
  deleteProfile,
  saveFcmToken,
} from '../controllers/userController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Protected route: user must be authenticated with Firebase to sync their data to Postgres
router.post('/sync', requireAuth, syncUser);

// Profile management routes
router.get('/profile', requireAuth, getProfile);
router.put('/fcm-token', requireAuth, saveFcmToken);
router.put('/profile', requireAuth, updateProfile);
router.delete('/profile', requireAuth, deleteProfile);

export default router;
