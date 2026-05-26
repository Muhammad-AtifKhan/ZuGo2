import { Router } from 'express';
import { createNotification, markAsRead, markAllAsRead, clearNotifications, getNotifications } from '../controllers/notificationController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.post('/', requireAuth, createNotification);
router.patch('/bulk/read', requireAuth, markAllAsRead);
router.post('/bulk/clear', requireAuth, clearNotifications);
router.patch('/:id/read', requireAuth, markAsRead);

export default router;
