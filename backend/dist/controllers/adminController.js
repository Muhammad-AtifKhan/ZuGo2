"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveTrips = exports.getFinance = exports.approveRoute = exports.approveUser = exports.getApprovals = exports.toggleUserSuspend = exports.getUsers = exports.getDashboardStats = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Dashboard Stats
const getDashboardStats = async (req, res) => {
    try {
        const [passengerCount, transporterCount, driverCount] = await Promise.all([
            prisma.passenger.count(),
            prisma.transporter.count(),
            prisma.driver.count()
        ]);
        const totalUsers = passengerCount + transporterCount + driverCount;
        const totalBuses = await prisma.bus.count();
        const totalTrips = await prisma.trip.count();
        const verifiedBookings = await prisma.booking.findMany({
            where: { status: 'confirmed' },
            include: { trip: true }
        });
        let totalRevenue = 0;
        const last7Days = Array(7).fill(0).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return {
                name: d.toLocaleDateString('en-US', { weekday: 'short' }),
                date: d.toISOString().split('T')[0],
                revenue: 0,
                commission: 0
            };
        });
        const routeCount = {};
        const hoursCount = {};
        verifiedBookings.forEach(booking => {
            const amount = booking.trip.price * (booking.seatNumbers ? booking.seatNumbers.length : 1);
            totalRevenue += amount;
            const dateStr = booking.createdAt.toISOString().split('T')[0];
            const hour = booking.createdAt.getHours();
            const dayObj = last7Days.find(d => d.date === dateStr);
            if (dayObj) {
                dayObj.revenue += amount;
                dayObj.commission += amount * 0.1;
            }
            hoursCount[hour] = (hoursCount[hour] || 0) + 1;
        });
        // We don't have busNumber in booking natively, we need to fetch trip -> bus, but for now we aggregate trips directly
        // Let's get top routes by grouping trips
        const trips = await prisma.trip.findMany({
            include: { route: { include: { sourceCity: true, destCity: true } } }
        });
        const routeStats = {};
        trips.forEach(trip => {
            const routeName = trip.route ? `${trip.route.sourceCity.name}-${trip.route.destCity.name}` : 'Unknown Route';
            routeStats[routeName] = (routeStats[routeName] || 0) + 1; // Assuming 1 trip = 1 metric for demand
        });
        const routeData = Object.entries(routeStats)
            .map(([route, bookings]) => ({ route, bookings }))
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 5);
        const peakHoursData = Object.entries(hoursCount)
            .map(([hour, volume]) => ({ hour: parseInt(hour), volume }))
            .sort((a, b) => a.hour - b.hour);
        const activeBusesTrips = await prisma.trip.findMany({ where: { status: 'active' }, select: { busId: true }, distinct: ['busId'] });
        const activeBuses = activeBusesTrips.length;
        const maintenanceBuses = 0; // Not tracked in Trip currently
        const idleBuses = totalBuses - activeBuses - maintenanceBuses;
        const utilizationData = [
            { name: 'Active', value: activeBuses },
            { name: 'Idle', value: idleBuses > 0 ? idleBuses : 1 },
            { name: 'Maintenance', value: maintenanceBuses },
        ];
        const performanceData = [
            { name: 'Average Transporter', trips: totalTrips, rating: 4.5, rev: totalRevenue }
        ];
        res.json({
            totalUsers,
            totalBuses,
            totalTrips,
            totalRevenue,
            revenueData: last7Days,
            routeData: routeData.length > 0 ? routeData : [{ route: 'No Data', bookings: 0 }],
            peakHoursData: peakHoursData.length > 0 ? peakHoursData : [{ hour: 12, volume: 0 }],
            utilizationData,
            performanceData
        });
    }
    catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        let usersList = [];
        if (role === 'passenger') {
            const passengers = await prisma.passenger.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
            usersList = passengers.map(p => ({ ...p, role: 'passenger' }));
        }
        else if (role === 'transporter') {
            const transporters = await prisma.transporter.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
            usersList = transporters.map(t => ({ ...t, role: 'transporter', name: t.companyName }));
        }
        else if (role === 'driver') {
            const drivers = await prisma.driver.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
            usersList = drivers.map(d => ({ ...d, role: 'driver' }));
        }
        else {
            const [passengers, transporters, drivers] = await Promise.all([
                prisma.passenger.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
                prisma.transporter.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
                prisma.driver.findMany({ take: 20, orderBy: { createdAt: 'desc' } })
            ]);
            usersList = [
                ...passengers.map(p => ({ ...p, role: 'passenger' })),
                ...transporters.map(t => ({ ...t, role: 'transporter', name: t.companyName })),
                ...drivers.map(d => ({ ...d, role: 'driver' }))
            ];
        }
        const formatted = usersList.map(user => ({
            id: user.id,
            name: user.name || 'Unknown User',
            role: user.role,
            status: user.isBlocked ? 'suspended' : 'active',
            joined: user.createdAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getUsers = getUsers;
const toggleUserSuspend = async (req, res) => {
    try {
        const id = req.params.id;
        // Check Passenger
        let passenger = await prisma.passenger.findUnique({ where: { id } });
        if (passenger) {
            const updated = await prisma.passenger.update({
                where: { id },
                data: { isBlocked: !passenger.isBlocked }
            });
            return res.json(updated);
        }
        // Check Transporter
        let transporter = await prisma.transporter.findUnique({ where: { id } });
        if (transporter) {
            const updated = await prisma.transporter.update({
                where: { id },
                data: { isBlocked: !transporter.isBlocked }
            });
            return res.json(updated);
        }
        // Check Driver
        let driver = await prisma.driver.findUnique({ where: { id } });
        if (driver) {
            const updated = await prisma.driver.update({
                where: { id },
                data: { isBlocked: !driver.isBlocked }
            });
            return res.json(updated);
        }
        return res.status(404).json({ error: 'User not found' });
    }
    catch (error) {
        console.error('Error toggling user suspend:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.toggleUserSuspend = toggleUserSuspend;
// Approvals
const getApprovals = async (req, res) => {
    try {
        // 1. Pending Users (not verified)
        // Note: Assuming we add a 'verified' field to users or use 'pending_verification' status if it exists.
        // For now, let's assume 'role' based logic or a generic approach.
        const pendingUsers = await prisma.transporter.findMany({
            where: { isApproved: false },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });
        // 2. Pending Routes
        const pendingRoutes = await prisma.route.findMany({
            where: { isVerified: false },
            include: { sourceCity: true, destCity: true }
        });
        res.json({
            users: pendingUsers.map(u => ({
                id: u.id,
                name: u.companyName || 'Unknown',
                email: u.email || 'N/A',
                phone: u.phone || 'N/A',
                role: 'transporter',
                status: 'pending_verification',
                joined: u.createdAt.toLocaleDateString()
            })),
            routes: pendingRoutes.map(r => ({
                id: r.id,
                code: r.id.substring(0, 6),
                name: `${r.sourceCity.name} to ${r.destCity.name}`,
                from: r.sourceCity.name,
                to: r.destCity.name,
                transporterId: 'N/A', // Assuming no transporterId in Route
                status: 'unverified'
            }))
        });
    }
    catch (error) {
        console.error('Error fetching approvals:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getApprovals = getApprovals;
const approveUser = async (req, res) => {
    try {
        const id = req.params.id;
        // Update isApproved in Postgres
        const updatedUser = await prisma.transporter.update({
            where: { id },
            data: { isApproved: true }
        });
        res.json({ message: 'User approved', user: updatedUser });
    }
    catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.approveUser = approveUser;
const approveRoute = async (req, res) => {
    try {
        const id = req.params.id;
        const updatedRoute = await prisma.route.update({
            where: { id },
            data: { isVerified: true }
        });
        res.json(updatedRoute);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.approveRoute = approveRoute;
const getFinance = async (req, res) => {
    try {
        const verifiedBookings = await prisma.booking.findMany({
            where: { status: 'confirmed' },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { trip: { include: { bus: true } }, passenger: true }
        });
        let totalRevenue = 0;
        const formatted = verifiedBookings.map(b => {
            const amt = b.trip.price * (b.seatNumbers ? b.seatNumbers.length : 1);
            totalRevenue += amt;
            return {
                id: b.id,
                bookingCode: b.id.substring(0, 8).toUpperCase(), // Or use actual booking code if present
                passengerName: b.passenger?.name || 'Unknown',
                busNumber: b.trip?.bus?.busNumber || 'N/A',
                totalAmount: amt,
                paymentMethod: 'cash', // Fallback or read from b
                paymentStatus: 'confirmed',
                createdAt: b.createdAt.toLocaleString()
            };
        });
        res.json({ bookings: formatted, totalRevenue });
    }
    catch (error) {
        console.error('Error fetching finance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getFinance = getFinance;
const getActiveTrips = async (req, res) => {
    try {
        const trips = await prisma.trip.findMany({
            where: { status: 'active' },
            include: { driver: true, bus: true, route: { include: { sourceCity: true, destCity: true } } }
        });
        const formatted = trips.map(t => ({
            id: t.id,
            routeName: t.route ? `${t.route.sourceCity.name}-${t.route.destCity.name}` : 'Unknown Route',
            busNumber: t.bus?.busNumber || 'N/A',
            driverName: t.driver?.name,
            departureTime: t.departureTime.toLocaleTimeString(),
            status: t.status
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getActiveTrips = getActiveTrips;
