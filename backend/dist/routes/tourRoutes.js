"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tourController_1 = require("../controllers/tourController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Protected routes (Passengers must be logged in)
router.get('/', authMiddleware_1.requireAuth, tourController_1.getMyTours);
router.post('/', authMiddleware_1.requireAuth, tourController_1.createTour);
router.delete('/:id', authMiddleware_1.requireAuth, tourController_1.deleteTour);
exports.default = router;
