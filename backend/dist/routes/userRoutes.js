"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Protected route: user must be authenticated with Firebase to sync their data to Postgres
router.post('/sync', authMiddleware_1.requireAuth, userController_1.syncUser);
// Profile management routes
router.get('/profile', authMiddleware_1.requireAuth, userController_1.getProfile);
router.put('/profile', authMiddleware_1.requireAuth, userController_1.updateProfile);
router.delete('/profile', authMiddleware_1.requireAuth, userController_1.deleteProfile);
exports.default = router;
