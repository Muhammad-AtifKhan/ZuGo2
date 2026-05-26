"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCity = exports.getAllCities = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllCities = async (req, res) => {
    try {
        const cities = await prisma.city.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(cities);
    }
    catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getAllCities = getAllCities;
const createCity = async (req, res) => {
    try {
        const { name, latitude, longitude } = req.body;
        // Validate inputs
        if (!name || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
        }
        const city = await prisma.city.create({
            data: { name, latitude, longitude }
        });
        res.status(201).json(city);
    }
    catch (error) {
        console.error('Error creating city:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'City with this name already exists' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createCity = createCity;
