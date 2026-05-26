"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateBooking = exports.rescheduleBooking = exports.cancelBooking = exports.getActiveBooking = exports.getBookingById = exports.getMyBookings = exports.confirmBooking = exports.createBooking = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const firebase_1 = require("../config/firebase");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const prisma = new client_1.PrismaClient();
// Create a new booking
const createBooking = async (req, res) => {
    try {
        const { tripId, busId, seatNumbers, tourId, paymentMethod, from, to, fromCode, toCode, baseFare, serviceFee, totalAmount, passengerName, passengerEmail, passengerPhone, busNumber, travelDate, departureTime } = req.body;
        const passengerId = req.user.uid;
        if (!tripId || !seatNumbers || seatNumbers.length === 0) {
            return res.status(400).json({ error: 'tripId and seatNumbers are required' });
        }
        // Verify trip exists
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        // Generate unique QR code payload for ticket validation
        const qrPayload = crypto_1.default.randomBytes(16).toString('hex');
        const bookingCode = `ZUG-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        // Calculate deadline (24 hours from now) for pending_payment
        const isCash = paymentMethod === 'cash_counter';
        const status = isCash ? 'pending_payment' : 'confirmed';
        const paymentStatus = isCash ? 'pending' : 'paid';
        const booking = await prisma.booking.create({
            data: {
                tripId,
                passengerId,
                seatNumbers,
                qrCode: qrPayload,
                status: status,
                paymentMethod,
                paymentStatus,
                totalAmount,
                bookingCode,
                tourId: tourId || null
            }
        });
        // Mirror to Firestore for Driver App (Offline Boarding / scanning)
        const bookingRef = firebase_1.db.collection('bookings').doc(booking.id);
        const firestoreData = {
            id: booking.id,
            userId: passengerId,
            tripId,
            busId,
            seatNumbers,
            seatCount: seatNumbers.length,
            from,
            to,
            fromCode,
            toCode,
            travelDate: travelDate ? new Date(travelDate) : new Date(),
            departureTime,
            baseFare,
            serviceFee,
            totalAmount,
            passengerName,
            passengerEmail,
            passengerPhone,
            busNumber,
            paymentMethod,
            paymentStatus,
            status,
            bookingCode,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await bookingRef.set(firestoreData);
        // Update Firestore trip seats for real-time seat map
        const batch = firebase_1.db.batch();
        for (const seatNum of seatNumbers) {
            const seatRef = firebase_1.db.collection('trips').doc(tripId).collection('seats').doc(seatNum.toString());
            batch.set(seatRef, {
                seatNumber: seatNum.toString(),
                isBooked: !isCash,
                status: isCash ? 'reserved' : 'booked',
                reservedBy: passengerId,
                bookedBy: !isCash ? passengerId : null,
                bookingId: booking.id,
                updatedAt: new Date(),
            }, { merge: true });
        }
        // Update held/available seats
        const tripRef = firebase_1.db.collection('trips').doc(tripId);
        if (!isCash) {
            batch.update(tripRef, {
                availableSeats: firebase_admin_1.default.firestore.FieldValue.increment(-seatNumbers.length),
                heldSeats: firebase_admin_1.default.firestore.FieldValue.increment(-seatNumbers.length),
                updatedAt: new Date(),
            });
        }
        else {
            batch.update(tripRef, {
                heldSeats: firebase_admin_1.default.firestore.FieldValue.increment(seatNumbers.length),
                updatedAt: new Date(),
            });
        }
        await batch.commit();
        res.status(201).json(booking);
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createBooking = createBooking;
// Confirm a pending booking (Manual payment)
const confirmBooking = async (req, res) => {
    try {
        const id = req.params.id;
        const passengerId = req.user.uid;
        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking || booking.passengerId !== passengerId) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (booking.status === 'confirmed') {
            return res.status(400).json({ error: 'Booking already confirmed' });
        }
        // Update Postgres
        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: {
                status: 'confirmed',
                paymentStatus: 'paid',
            }
        });
        // Update Firestore booking
        const bookingRef = firebase_1.db.collection('bookings').doc(id);
        await bookingRef.update({
            status: 'confirmed',
            paymentStatus: 'paid',
            confirmedAt: new Date(),
            updatedAt: new Date()
        });
        // Update Firestore seats
        const tripRef = firebase_1.db.collection('trips').doc(booking.tripId);
        const batch = firebase_1.db.batch();
        for (const seatNum of booking.seatNumbers) {
            const seatRef = tripRef.collection('seats').doc(seatNum.toString());
            batch.update(seatRef, {
                status: 'booked',
                isBooked: true,
                bookedBy: passengerId,
                updatedAt: new Date()
            });
        }
        // Move heldSeats to booked
        batch.update(tripRef, {
            availableSeats: firebase_admin_1.default.firestore.FieldValue.increment(-booking.seatNumbers.length),
            heldSeats: firebase_admin_1.default.firestore.FieldValue.increment(-booking.seatNumbers.length),
            updatedAt: new Date()
        });
        await batch.commit();
        res.json(updatedBooking);
    }
    catch (error) {
        console.error('Error confirming booking:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.confirmBooking = confirmBooking;
// Get passenger bookings
const getMyBookings = async (req, res) => {
    try {
        const passengerId = req.user.uid;
        const bookings = await prisma.booking.findMany({
            where: { passengerId },
            include: {
                trip: {
                    include: {
                        route: {
                            include: { sourceCity: true, destCity: true }
                        },
                        driver: true,
                        bus: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getMyBookings = getMyBookings;
// Get booking by ID
const getBookingById = async (req, res) => {
    try {
        const id = req.params.id;
        const passengerId = req.user.uid;
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                trip: {
                    include: {
                        route: {
                            include: { sourceCity: true, destCity: true }
                        },
                        driver: true,
                        bus: true
                    }
                }
            }
        });
        if (!booking || booking.passengerId !== passengerId) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json(booking);
    }
    catch (error) {
        console.error('Error fetching booking by ID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getBookingById = getBookingById;
// Get passenger's current active booking
const getActiveBooking = async (req, res) => {
    try {
        const passengerId = req.user.uid;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeBooking = await prisma.booking.findFirst({
            where: {
                passengerId,
                status: { in: ['confirmed', 'boarded', 'paid', 'boarding'] },
                trip: {
                    departureTime: { gte: today }
                }
            },
            include: {
                trip: {
                    include: {
                        route: {
                            include: { sourceCity: true, destCity: true }
                        },
                        driver: true,
                        bus: true
                    }
                }
            },
            orderBy: {
                trip: { departureTime: 'asc' }
            }
        });
        if (!activeBooking) {
            return res.status(200).json(null);
        }
        res.json(activeBooking);
    }
    catch (error) {
        console.error('Error fetching active booking:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getActiveBooking = getActiveBooking;
// Cancel a booking
const cancelBooking = async (req, res) => {
    try {
        const id = req.params.id;
        const { reason } = req.body;
        const passengerId = req.user.uid;
        const booking = await prisma.booking.findUnique({ where: { id }, include: { trip: true } });
        if (!booking || booking.passengerId !== passengerId) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        await prisma.booking.update({
            where: { id },
            data: { status: 'cancelled' }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.cancelBooking = cancelBooking;
// Reschedule a booking
const rescheduleBooking = async (req, res) => {
    try {
        const id = req.params.id;
        const { newTripId } = req.body;
        const passengerId = req.user.uid;
        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking || booking.passengerId !== passengerId) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        await prisma.booking.update({
            where: { id },
            data: { tripId: newTripId }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error rescheduling booking:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.rescheduleBooking = rescheduleBooking;
// Rate a booking
const rateBooking = async (req, res) => {
    try {
        const id = req.params.id;
        const { rating, review } = req.body;
        const passengerId = req.user.uid;
        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking || booking.passengerId !== passengerId) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        // A simple mock for rating since Rating model does not exist yet
        // In real scenario, would create Rating record
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error rating booking:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.rateBooking = rateBooking;
