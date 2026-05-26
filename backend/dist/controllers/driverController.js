"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitVehicleIssue = exports.submitVehicleCheck = exports.getDriverSchedule = exports.getVehicleChecks = exports.getBusById = exports.reportEmergency = exports.reportDelay = exports.getDriverEarnings = exports.boardPassenger = exports.openBoarding = exports.getTripBookings = exports.updateDriverStatus = exports.getDashboardData = void 0;
const client_1 = require("@prisma/client");
const admin = __importStar(require("firebase-admin"));
const prisma = new client_1.PrismaClient();
const db = admin.firestore();
// Get Driver Dashboard Data
const getDashboardData = async (req, res) => {
    try {
        const { driverId } = req.query;
        if (!driverId || typeof driverId !== 'string') {
            return res.status(400).json({ error: 'Missing driverId' });
        }
        // 1. Get driver state
        let driver = await prisma.driver.findUnique({
            where: { id: driverId }
        });
        if (!driver) {
            // Create a minimal driver record if they don't exist in pg (legacy support)
            // For now, return error
            return res.status(404).json({ error: 'Driver not found' });
        }
        // 2. Get assigned trips
        const trips = await prisma.trip.findMany({
            where: {
                driverId: driverId,
                status: { in: ['scheduled', 'in_progress', 'delayed'] }
            },
            include: {
                bus: true,
                route: true
            },
            orderBy: {
                departureTime: 'asc'
            }
        });
        // We still have to fetch seats from Firestore as bookings are not fully migrated
        // but for now we'll format the trips
        const formattedTrips = trips.map(t => ({
            id: t.id,
            busId: t.busId,
            busNumber: t.bus?.busNumber,
            routeName: `${t.route?.sourceCityId} → ${t.route?.destCityId}`,
            status: t.status,
            startTime: t.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: t.arrivalTime ? t.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            date: t.departureTime.toISOString().split('T')[0], // local date string logic
            from: t.route?.sourceCityId,
            to: t.route?.destCityId,
            distance: t.route?.distance?.toString(),
            totalSeats: t.bus?.capacity || 40,
        }));
        // 3. Driver Stats
        const totalTrips = await prisma.trip.count({
            where: { driverId: driverId, status: 'completed' }
        });
        // Driver stats (simple mock for now, implement properly based on real schema later)
        const driverStats = {
            totalTrips,
            todayTrips: 0,
            averageRating: 4.8,
            totalReviews: 12,
            onlineHours: 0
        };
        res.status(200).json({
            driverStatus: driver.status || 'offline',
            currentTripId: driver.status === 'on_trip' ? (trips.find(t => t.status === 'in_progress')?.id || null) : null,
            duties: formattedTrips,
            stats: driverStats
        });
    }
    catch (error) {
        console.error('Error fetching driver dashboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDashboardData = getDashboardData;
const updateDriverStatus = async (req, res) => {
    try {
        const { driverId, status } = req.body;
        // Driver status is not supported on the User model in Postgres schema,
        // so we only manage/mirror it dynamically via Firestore.
        // Mirror to firestore for legacy
        await db.collection('drivers').doc(driverId).update({
            status,
            lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(200).json({ message: 'Status updated' });
    }
    catch (error) {
        console.error('Error updating driver status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateDriverStatus = updateDriverStatus;
const getTripBookings = async (req, res) => {
    try {
        const id = req.params.id;
        const bookings = await prisma.booking.findMany({
            where: { tripId: id }
        });
        res.status(200).json(bookings);
    }
    catch (error) {
        console.error('Error getting trip bookings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getTripBookings = getTripBookings;
const openBoarding = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.trip.update({
            where: { id },
            data: { status: 'boarding' } // or whatever status we use for open boarding
        });
        await db.collection('trips').doc(id).update({
            boardingOpen: true,
            boardingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({ message: 'Boarding opened' });
    }
    catch (error) {
        console.error('Error opening boarding:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.openBoarding = openBoarding;
const boardPassenger = async (req, res) => {
    try {
        const id = req.params.id; // passengerId
        const { driverId, tripId } = req.body;
        await prisma.booking.update({
            where: { id },
            data: { status: 'boarded' }
        });
        // Update in Firestore for legacy UI
        await db.runTransaction(async (transaction) => {
            const bookingRef = db.collection('bookings').doc(id);
            const tripRef = db.collection('trips').doc(tripId);
            transaction.update(bookingRef, {
                boardingStatus: 'boarded',
                boardedAt: admin.firestore.FieldValue.serverTimestamp(),
                boardedBy: driverId,
            });
            transaction.update(tripRef, {
                boardedSeats: admin.firestore.FieldValue.increment(1),
            });
        });
        res.status(200).json({ message: 'Passenger boarded' });
    }
    catch (error) {
        console.error('Error boarding passenger:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.boardPassenger = boardPassenger;
const getDriverEarnings = async (req, res) => {
    try {
        const { driverId } = req.query;
        if (!driverId)
            return res.status(400).json({ error: 'Driver ID required' });
        const trips = await prisma.trip.findMany({
            where: { driverId: String(driverId), status: 'completed' },
            include: { bookings: true }
        });
        // This is simple logic. Customize based on real schema.
        let totalEarnings = 0;
        trips.forEach(t => {
            const revenue = t.bookings.length * t.price;
            totalEarnings += revenue;
        });
        res.status(200).json({
            totalEarnings,
            trips
        });
    }
    catch (error) {
        console.error('Error fetching driver earnings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDriverEarnings = getDriverEarnings;
const reportDelay = async (req, res) => {
    try {
        const { tripId, driverId, busId, routeName, reason, delayMinutes, currentLocation } = req.body;
        // Update Prisma trip status to delayed
        await prisma.trip.update({
            where: { id: tripId },
            data: { status: 'delayed' }
        });
        // Sync to Firestore
        const batch = db.batch();
        const tripRef = db.collection('trips').doc(tripId);
        batch.update(tripRef, {
            status: 'delayed',
            delayReason: reason,
            delayReportedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const delayRef = db.collection('delays').doc();
        batch.set(delayRef, {
            tripId,
            driverId,
            busId,
            routeName,
            reason,
            delayMinutes,
            currentLocation,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            requiresMaintenance: reason === 'Mechanical Issue',
        });
        await batch.commit();
        res.status(200).json({ message: 'Delay reported' });
    }
    catch (error) {
        console.error('Error reporting delay:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.reportDelay = reportDelay;
const reportEmergency = async (req, res) => {
    try {
        const { tripId, driverId, busId, location } = req.body;
        await db.collection('emergencies').add({
            tripId,
            driverId,
            busId,
            location,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
        });
        res.status(200).json({ message: 'Emergency reported' });
    }
    catch (error) {
        console.error('Error reporting emergency:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.reportEmergency = reportEmergency;
// Get Bus by ID
const getBusById = async (req, res) => {
    try {
        const id = req.params.id;
        const bus = await prisma.bus.findUnique({
            where: { id }
        });
        if (!bus)
            return res.status(404).json({ error: 'Bus not found' });
        res.status(200).json(bus);
    }
    catch (error) {
        console.error('Error fetching bus:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getBusById = getBusById;
// Get Driver Vehicle Checks
const getVehicleChecks = async (req, res) => {
    try {
        const { driverId } = req.query;
        if (!driverId)
            return res.status(400).json({ error: 'Missing driverId' });
        const checksSnapshot = await db.collection('vehicle_checks')
            .where('driverId', '==', driverId)
            .orderBy('checkDate', 'desc')
            .limit(5)
            .get();
        const checks = checksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.status(200).json(checks);
    }
    catch (error) {
        console.error('Error fetching vehicle checks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getVehicleChecks = getVehicleChecks;
// Get Driver Schedule (All trips)
const getDriverSchedule = async (req, res) => {
    try {
        const { driverId } = req.query;
        if (!driverId || typeof driverId !== 'string') {
            return res.status(400).json({ error: 'Missing driverId' });
        }
        const trips = await prisma.trip.findMany({
            where: { driverId },
            include: {
                bus: true,
                route: true,
                bookings: true
            },
            orderBy: {
                departureTime: 'desc'
            }
        });
        const formattedTrips = trips.map(t => ({
            id: t.id,
            tripId: t.id,
            busId: t.busId,
            busNumber: t.bus?.busNumber,
            routeName: `${t.route?.sourceCityId} → ${t.route?.destCityId}`,
            status: t.status,
            startTime: t.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: t.arrivalTime ? t.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            date: t.departureTime.toISOString().split('T')[0],
            from: t.route?.sourceCityId,
            to: t.route?.destCityId,
            distance: t.route?.distance?.toString(),
            totalSeats: t.bus?.capacity || 40,
            bookedSeats: t.bookings.length,
            fare: t.price
        }));
        res.status(200).json(formattedTrips);
    }
    catch (error) {
        console.error('Error fetching driver schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDriverSchedule = getDriverSchedule;
// Submit Vehicle Check
const submitVehicleCheck = async (req, res) => {
    try {
        const { driverId, driverName, tripId, busId, busNumber, checkType, items, checklist, passed, odometerReading, fuelLevel, notes } = req.body;
        const checkData = {
            driverId,
            driverName,
            tripId,
            busId,
            busNumber,
            checkDate: admin.firestore.FieldValue.serverTimestamp(),
            checkType,
            items,
            checklist,
            passed,
            odometerReading,
            fuelLevel,
            notes,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const batch = db.batch();
        const checkRef = db.collection('vehicle_checks').doc();
        batch.set(checkRef, checkData);
        if (tripId) {
            const tripRef = db.collection('trips').doc(tripId);
            batch.update(tripRef, {
                vehicleChecked: true,
                vehicleCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
                vehicleCheckId: checkRef.id,
            });
        }
        if (busId && busId !== 'unknown') {
            const busRef = db.collection('buses').doc(busId);
            batch.update(busRef, {
                lastCheck: admin.firestore.FieldValue.serverTimestamp(),
                lastCheckId: checkRef.id,
            });
        }
        await batch.commit();
        res.status(200).json({ message: 'Vehicle check submitted', id: checkRef.id });
    }
    catch (error) {
        console.error('Error submitting vehicle check:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.submitVehicleCheck = submitVehicleCheck;
// Submit Vehicle Issue
const submitVehicleIssue = async (req, res) => {
    try {
        const { driverId, driverName, tripId, busId, busNumber, checkType, items, checklist, passed, odometerReading, fuelLevel, notes, issueData, isStartDutyFlow } = req.body;
        const batch = db.batch();
        // 1. Save the vehicle check (failed state)
        const checkRef = db.collection('vehicle_checks').doc();
        batch.set(checkRef, {
            driverId,
            driverName,
            tripId,
            busId,
            busNumber,
            checkDate: admin.firestore.FieldValue.serverTimestamp(),
            checkType,
            items,
            checklist,
            passed: false,
            issues: [issueData],
            odometerReading,
            fuelLevel,
            notes,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 2. Save the issue itself
        const issueRef = db.collection('vehicle_issues').doc();
        batch.set(issueRef, {
            ...issueData,
            vehicleCheckId: checkRef.id,
            reportedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 3. Update the bus state
        if (busId && busId !== 'unknown') {
            const busRef = db.collection('buses').doc(busId);
            if (issueData.severity === 'critical' || issueData.severity === 'high') {
                batch.update(busRef, {
                    status: 'maintenance',
                    currentIssueId: issueRef.id,
                    lastIssueReported: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                batch.update(busRef, {
                    lastIssueReported: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        // 4. Update trip and driver if applicable
        if (isStartDutyFlow && tripId) {
            const tripRef = db.collection('trips').doc(tripId);
            batch.update(tripRef, {
                status: 'delayed',
                delayReason: `Vehicle issue: ${issueData.typeLabel}`,
                delayReportedAt: admin.firestore.FieldValue.serverTimestamp(),
                vehicleCheckId: checkRef.id,
            });
            // Prisma trip update
            await prisma.trip.update({
                where: { id: tripId },
                data: { status: 'delayed' }
            });
            const driverRef = db.collection('drivers').doc(driverId);
            batch.update(driverRef, {
                status: 'available',
                currentTripId: admin.firestore.FieldValue.delete(),
            });
            if (busId && busId !== 'unknown' && issueData.severity !== 'critical' && issueData.severity !== 'high') {
                const busRef = db.collection('buses').doc(busId);
                batch.update(busRef, {
                    status: 'available',
                    currentTripId: admin.firestore.FieldValue.delete(),
                });
            }
        }
        // 5. Send Notification to Transporter
        const notificationRef = db.collection('transporter_notifications').doc();
        batch.set(notificationRef, {
            type: 'maintenance',
            title: 'Vehicle Issue Reported',
            message: `${issueData.typeLabel} issue reported for bus ${busNumber} by ${driverName}`,
            busId,
            busNumber,
            issueId: issueRef.id,
            vehicleCheckId: checkRef.id,
            severity: issueData.severity,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
            actionable: true,
            target: 'transporter',
        });
        await batch.commit();
        res.status(200).json({ message: 'Vehicle issue reported', issueId: issueRef.id, checkId: checkRef.id });
    }
    catch (error) {
        console.error('Error submitting vehicle issue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.submitVehicleIssue = submitVehicleIssue;
