import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { 
  getDashboardData, 
  updateDriverStatus, 
  getTripBookings, 
  openBoarding, 
  boardPassenger, 
  getDriverEarnings,
  reportDelay,
  reportEmergency,
  getDriverSchedule,
  submitVehicleCheck,
  submitVehicleIssue,
  getBusById,
  getVehicleChecks
} from '../controllers/driverController';
// Re-use updateTripStatus and getTripById from transporter since it does the same thing
import { updateTripStatus, getTripById } from '../controllers/transporterController';

const router = express.Router();

router.get('/dashboard', requireAuth, getDashboardData);
router.get('/schedule', requireAuth, getDriverSchedule);
router.get('/vehicle-checks', requireAuth, getVehicleChecks);
router.post('/vehicle-check', requireAuth, submitVehicleCheck);
router.post('/vehicle-issue', requireAuth, submitVehicleIssue);
router.get('/buses/:id', requireAuth, getBusById);
router.put('/status', requireAuth, updateDriverStatus);
router.get('/trips/:id', requireAuth, getTripById);
router.put('/trips/:id/status', requireAuth, updateTripStatus);
router.get('/trips/:id/bookings', requireAuth, getTripBookings);
router.put('/trips/:id/boarding/open', requireAuth, openBoarding);
router.put('/bookings/:id/board', requireAuth, boardPassenger);
router.get('/earnings', requireAuth, getDriverEarnings);
router.post('/delay', requireAuth, reportDelay);
router.post('/emergency', requireAuth, reportEmergency);

export default router;
