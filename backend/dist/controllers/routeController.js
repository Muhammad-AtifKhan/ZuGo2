"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoute = exports.getAllRoutes = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get all routes
const getAllRoutes = async (req, res) => {
    try {
        const routes = await prisma.route.findMany({
            include: {
                sourceCity: true,
                destCity: true
            }
        });
        res.json(routes);
    }
    catch (error) {
        console.error('Error fetching routes:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getAllRoutes = getAllRoutes;
// Create Route
const createRoute = async (req, res) => {
    try {
        const { sourceCityId, destCityId, distance, price } = req.body;
        if (!sourceCityId || !destCityId) {
            return res.status(400).json({ error: 'sourceCityId and destCityId are required' });
        }
        const route = await prisma.route.create({
            data: {
                sourceCityId,
                destCityId,
                distance: distance || 0,
                price: price || 0
            }
        });
        res.status(201).json(route);
    }
    catch (error) {
        console.error('Error creating route:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Route between these cities already exists' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createRoute = createRoute;
