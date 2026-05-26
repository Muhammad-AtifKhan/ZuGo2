"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const driverController_1 = require("../controllers/driverController");
// Re-use updateTripStatus and getTripById from transporter since it does the same thing
const transporterController_1 = require("../controllers/transporterController");
const router = express_1.default.Router();
router.get('/dashboard', authMiddleware_1.requireAuth, driverController_1.getDashboardData);
router.get('/schedule', authMiddleware_1.requireAuth, driverController_1.getDriverSchedule);
router.get('/vehicle-checks', authMiddleware_1.requireAuth, driverController_1.getVehicleChecks);
router.post('/vehicle-check', authMiddleware_1.requireAuth, driverController_1.submitVehicleCheck);
router.post('/vehicle-issue', authMiddleware_1.requireAuth, driverController_1.submitVehicleIssue);
router.get('/buses/:id', authMiddleware_1.requireAuth, driverController_1.getBusById);
router.put('/status', authMiddleware_1.requireAuth, driverController_1.updateDriverStatus);
router.get('/trips/:id', authMiddleware_1.requireAuth, transporterController_1.getTripById);
router.put('/trips/:id/status', authMiddleware_1.requireAuth, transporterController_1.updateTripStatus);
router.get('/trips/:id/bookings', authMiddleware_1.requireAuth, driverController_1.getTripBookings);
router.put('/trips/:id/boarding/open', authMiddleware_1.requireAuth, driverController_1.openBoarding);
router.put('/bookings/:id/board', authMiddleware_1.requireAuth, driverController_1.boardPassenger);
router.get('/earnings', authMiddleware_1.requireAuth, driverController_1.getDriverEarnings);
router.post('/delay', authMiddleware_1.requireAuth, driverController_1.reportDelay);
router.post('/emergency', authMiddleware_1.requireAuth, driverController_1.reportEmergency);
exports.default = router;
