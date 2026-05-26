"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseSeats = exports.reserveSeats = exports.getTripSeats = exports.getRescheduleOptions = exports.searchTrips = exports.createTrip = exports.getAllTrips = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get all trips with source and destination details
const getAllTrips = async (req, res) => {
    try {
        const trips = await prisma.trip.findMany({
            include: {
                route: {
                    include: {
                        sourceCity: true,
                        destCity: true
                    }
                },
                driver: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { departureTime: 'asc' }
        });
        res.json(trips);
    }
    catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getAllTrips = getAllTrips;
// Create a new trip
const createTrip = async (req, res) => {
    try {
        const { routeId, driverId, busId, departureTime, status, price, totalSeats } = req.body;
        if (!routeId || !driverId || !busId || !departureTime || !price) {
            return res.status(400).json({ error: 'Missing required fields for Trip creation' });
        }
        const trip = await prisma.trip.create({
            data: {
                routeId,
                driverId,
                busId,
                departureTime: new Date(departureTime),
                status: status || 'scheduled',
                price: Number(price),
                totalSeats: totalSeats || 45
            }
        });
        res.status(201).json(trip);
    }
    catch (error) {
        console.error('Error creating trip:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createTrip = createTrip;
// Search trips by route and date
const searchTrips = async (req, res) => {
    try {
        const { fromCityId, toCityId, date } = req.query;
        if (!fromCityId || !toCityId || !date) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        const trips = await prisma.trip.findMany({
            where: {
                route: {
                    sourceCityId: fromCityId,
                    destCityId: toCityId
                },
                departureTime: {
                    gte: startDate,
                    lt: endDate
                },
                status: { in: ['scheduled', 'in_progress'] }
            },
            include: {
                bus: true,
                route: {
                    include: { sourceCity: true, destCity: true }
                }
            },
            orderBy: { departureTime: 'asc' }
        });
        res.json(trips);
    }
    catch (error) {
        console.error('Error searching trips:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.searchTrips = searchTrips;
// Get reschedule options for a specific route
const getRescheduleOptions = async (req, res) => {
    try {
        const { routeId } = req.params;
        const now = new Date();
        const trips = await prisma.trip.findMany({
            where: {
                routeId: routeId,
                departureTime: { gt: now },
                status: { in: ['scheduled'] }
            },
            include: {
                bus: true,
                route: { include: { sourceCity: true, destCity: true } }
            },
            orderBy: { departureTime: 'asc' },
            take: 5
        });
        res.json(trips);
    }
    catch (error) {
        console.error('Error fetching reschedule options:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getRescheduleOptions = getRescheduleOptions;
// --- In-Memory Seat Holds (For temporary reservation before payment) ---
// Key: `${tripId}_${seatNum}`, Value: { userId, expiresAt }
const seatHolds = {};
// Get seats for a trip
const getTripSeats = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await prisma.trip.findUnique({
            where: { id: id },
            include: { bookings: true }
        });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        // Clean up expired holds
        const now = new Date();
        Object.keys(seatHolds).forEach(key => {
            if (seatHolds[key].expiresAt < now) {
                delete seatHolds[key];
            }
        });
        const seats = [];
        const bookedSeatNumbers = new Set();
        trip.bookings.forEach((b) => {
            if (b.status === 'confirmed' || b.status === 'boarded' || b.status === 'pending_payment') {
                b.seatNumbers.forEach((s) => bookedSeatNumbers.add(s));
            }
        });
        for (let i = 1; i <= trip.totalSeats; i++) {
            const holdKey = `${id}_${i}`;
            let status = 'available';
            let reservedBy = null;
            if (bookedSeatNumbers.has(i)) {
                status = 'booked';
            }
            else if (seatHolds[holdKey]) {
                status = 'reserved';
                reservedBy = seatHolds[holdKey].userId;
            }
            // Generate row and column logically (4 seats per row typical bus)
            const row = Math.ceil(i / 4);
            const column = ((i - 1) % 4) + 1;
            seats.push({
                id: i.toString(),
                seatNumber: i.toString(),
                number: i.toString(),
                row,
                column,
                type: 'standard',
                isAvailable: status === 'available',
                status,
                isPremium: row <= 2,
                price: trip.price,
                reservedBy
            });
        }
        res.json(seats);
    }
    catch (error) {
        console.error('Error getting trip seats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getTripSeats = getTripSeats;
// Reserve seats temporarily
const reserveSeats = async (req, res) => {
    try {
        const { id } = req.params;
        const { seatNumbers } = req.body;
        const userId = req.user.uid;
        if (!seatNumbers || !Array.isArray(seatNumbers)) {
            return res.status(400).json({ error: 'Invalid seat numbers' });
        }
        // Check if any seat is already held or booked
        const trip = await prisma.trip.findUnique({ where: { id: id }, include: { bookings: true } });
        if (!trip)
            return res.status(404).json({ error: 'Trip not found' });
        const bookedSeatNumbers = new Set();
        trip.bookings.forEach((b) => {
            if (b.status === 'confirmed' || b.status === 'boarded' || b.status === 'pending_payment') {
                b.seatNumbers.forEach((s) => bookedSeatNumbers.add(s));
            }
        });
        const now = new Date();
        for (const seatNum of seatNumbers) {
            if (bookedSeatNumbers.has(Number(seatNum))) {
                return res.status(400).json({ error: `Seat ${seatNum} is already booked` });
            }
            const holdKey = `${id}_${seatNum}`;
            if (seatHolds[holdKey] && seatHolds[holdKey].expiresAt > now && seatHolds[holdKey].userId !== userId) {
                return res.status(400).json({ error: `Seat ${seatNum} is reserved by another user` });
            }
        }
        // Hold the seats
        const expiresAt = new Date(now.getTime() + 10 * 60000); // 10 mins hold
        for (const seatNum of seatNumbers) {
            const holdKey = `${id}_${seatNum}`;
            seatHolds[holdKey] = { userId, expiresAt };
        }
        res.json({ success: true, message: 'Seats reserved temporarily' });
    }
    catch (error) {
        console.error('Error reserving seats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.reserveSeats = reserveSeats;
// Release held seats
const releaseSeats = async (req, res) => {
    try {
        const { id } = req.params;
        const { seatNumbers } = req.body;
        const userId = req.user.uid;
        if (!seatNumbers || !Array.isArray(seatNumbers)) {
            return res.status(400).json({ error: 'Invalid seat numbers' });
        }
        for (const seatNum of seatNumbers) {
            const holdKey = `${id}_${seatNum}`;
            if (seatHolds[holdKey] && seatHolds[holdKey].userId === userId) {
                delete seatHolds[holdKey];
            }
        }
        res.json({ success: true, message: 'Seats released' });
    }
    catch (error) {
        console.error('Error releasing seats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.releaseSeats = releaseSeats;
