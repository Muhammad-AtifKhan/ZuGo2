"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cityController_1 = require("../controllers/cityController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public route to get all cities
router.get('/', cityController_1.getAllCities);
// Protected route to create a city (Admin only ideally, but using general auth for now)
router.post('/', authMiddleware_1.requireAuth, cityController_1.createCity);
exports.default = router;
