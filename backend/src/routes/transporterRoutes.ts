import express from 'express';
import { requireAuth, requireApprovedTransporter } from '../middleware/authMiddleware';
import { 
  addBus, getBuses, updateBusStatus, logMaintenance, getMaintenanceHistory,
  addDriver, getDrivers, deleteDriver, checkDuplicateDriver,
  scheduleTrip, createTripSchedule,
  getDashboardStats, getTrips, getRoutes, updateTripStatus, getTripById, addRoute,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  getAnalytics, getSettings, updateSettings
} from '../controllers/transporterController';

const router = express.Router();

// Apply authentication and approval verification middleware to all transporter routes
router.use(requireAuth);
router.use(requireApprovedTransporter);

// Dashboard & Analytics
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/mark-all-read', markAllNotificationsRead);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Bus Management
router.post('/buses', addBus);
router.get('/buses', getBuses);
router.put('/buses/:id/status', updateBusStatus);
router.post('/buses/:id/maintenance', logMaintenance);
router.get('/buses/:id/maintenance', getMaintenanceHistory);

// Driver Management
router.post('/drivers', addDriver);
router.get('/drivers', getDrivers);
router.get('/drivers/check-duplicate', checkDuplicateDriver);
router.delete('/drivers/:id', deleteDriver);

// Trip Management
router.post('/trips', scheduleTrip);
router.get('/trips', getTrips);
router.get('/trips/:id', getTripById);
router.put('/trips/:id/status', updateTripStatus);
router.post('/trip-schedules', createTripSchedule);

// Route Management
router.get('/routes', getRoutes);
router.post('/routes', addRoute);

export default router;

