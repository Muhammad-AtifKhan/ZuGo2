"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTour = exports.createTour = exports.getMyTours = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get all tours for the current passenger
const getMyTours = async (req, res) => {
    try {
        const passengerId = req.user.uid;
        const tours = await prisma.tour.findMany({
            where: { passengerId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tours);
    }
    catch (error) {
        console.error('Error fetching tours:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getMyTours = getMyTours;
// Create a new tour
const createTour = async (req, res) => {
    try {
        const passengerId = req.user.uid;
        const { name, description, startDate, endDate, status } = req.body;
        const tour = await prisma.tour.create({
            data: {
                passengerId,
                name,
                description,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                status: status || 'planning'
            }
        });
        res.status(201).json(tour);
    }
    catch (error) {
        console.error('Error creating tour:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createTour = createTour;
// Delete a tour
const deleteTour = async (req, res) => {
    try {
        const passengerId = req.user.uid;
        const id = req.params.id;
        const tour = await prisma.tour.findUnique({ where: { id } });
        if (!tour || tour.passengerId !== passengerId) {
            return res.status(404).json({ error: 'Tour not found' });
        }
        await prisma.tour.delete({ where: { id } });
        res.json({ success: true, message: 'Tour deleted' });
    }
    catch (error) {
        console.error('Error deleting tour:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.deleteTour = deleteTour;
