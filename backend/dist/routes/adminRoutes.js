"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all admin routes
router.use(authMiddleware_1.requireAuth);
// Dashboard
router.get('/dashboard', adminController_1.getDashboardStats);
// Users
router.get('/users', adminController_1.getUsers);
router.post('/users/:id/suspend', adminController_1.toggleUserSuspend);
// Approvals
router.get('/approvals', adminController_1.getApprovals);
router.post('/approvals/users/:id', adminController_1.approveUser);
router.post('/approvals/routes/:id', adminController_1.approveRoute);
// Fleet
router.get('/fleet', adminController_1.getActiveTrips);
// Finance
router.get('/finance', adminController_1.getFinance);
exports.default = router;
