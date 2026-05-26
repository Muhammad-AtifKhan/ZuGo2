"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const transporterController_1 = require("../controllers/transporterController");
const router = express_1.default.Router();
// Apply authentication and approval verification middleware to all transporter routes
router.use(authMiddleware_1.requireAuth);
router.use(authMiddleware_1.requireApprovedTransporter);
// Dashboard & Analytics
router.get('/dashboard', transporterController_1.getDashboardStats);
router.get('/analytics', transporterController_1.getAnalytics);
// Notifications
router.get('/notifications', transporterController_1.getNotifications);
router.put('/notifications/:id/read', transporterController_1.markNotificationRead);
router.put('/notifications/mark-all-read', transporterController_1.markAllNotificationsRead);
// Settings
router.get('/settings', transporterController_1.getSettings);
router.put('/settings', transporterController_1.updateSettings);
// Bus Management
router.post('/buses', transporterController_1.addBus);
router.get('/buses', transporterController_1.getBuses);
router.put('/buses/:id/status', transporterController_1.updateBusStatus);
router.post('/buses/:id/maintenance', transporterController_1.logMaintenance);
router.get('/buses/:id/maintenance', transporterController_1.getMaintenanceHistory);
// Driver Management
router.post('/drivers', transporterController_1.addDriver);
router.get('/drivers', transporterController_1.getDrivers);
router.get('/drivers/check-duplicate', transporterController_1.checkDuplicateDriver);
router.delete('/drivers/:id', transporterController_1.deleteDriver);
// Trip Management
router.post('/trips', transporterController_1.scheduleTrip);
router.get('/trips', transporterController_1.getTrips);
router.get('/trips/:id', transporterController_1.getTripById);
router.put('/trips/:id/status', transporterController_1.updateTripStatus);
router.post('/trip-schedules', transporterController_1.createTripSchedule);
// Route Management
router.get('/routes', transporterController_1.getRoutes);
router.post('/routes', transporterController_1.addRoute);
exports.default = router;
