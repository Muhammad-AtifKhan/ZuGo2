"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routeController_1 = require("../controllers/routeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', routeController_1.getAllRoutes);
router.post('/', authMiddleware_1.requireAuth, routeController_1.createRoute);
exports.default = router;
