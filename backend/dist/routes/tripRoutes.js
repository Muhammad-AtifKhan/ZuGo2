"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tripController_1 = require("../controllers/tripController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public route to get all trips
router.get('/', tripController_1.getAllTrips);
// Search trips
router.get('/search', tripController_1.searchTrips);
router.get('/reschedule-options/:routeId', tripController_1.getRescheduleOptions);
// Seats endpoints
router.get('/:id/seats', tripController_1.getTripSeats);
router.post('/:id/seats/reserve', authMiddleware_1.requireAuth, tripController_1.reserveSeats);
router.post('/:id/seats/release', authMiddleware_1.requireAuth, tripController_1.releaseSeats);
// Protected route to create a trip
router.post('/', authMiddleware_1.requireAuth, tripController_1.createTrip);
exports.default = router;
