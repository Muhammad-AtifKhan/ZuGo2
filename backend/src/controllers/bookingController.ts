import prisma from '../lib/prisma';
import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/firebase';
import admin from 'firebase-admin';


// Create a new booking
export const createBooking = async (req: Request, res: Response) => {
  try {
    const { 
      tripId, 
      busId,
      seatNumbers, 
      tourId, 
      paymentMethod,
      from,
      to,
      fromCode,
      toCode,
      baseFare,
      serviceFee,
      totalAmount,
      passengerName,
      passengerEmail,
      passengerPhone,
      busNumber,
      travelDate,
      departureTime
    } = req.body;
    const passengerId = (req as any).user.uid;

    if (!tripId || !seatNumbers || seatNumbers.length === 0) {
      return res.status(400).json({ error: 'tripId and seatNumbers are required' });
    }

    // Verify trip exists
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Generate unique QR code payload for ticket validation
    const qrPayload = crypto.randomBytes(16).toString('hex');
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
    const bookingRef = db.collection('bookings').doc(booking.id);
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
    const batch = db.batch();
    for (const seatNum of seatNumbers) {
      const seatRef = db.collection('trips').doc(tripId).collection('seats').doc(seatNum.toString());
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
    const tripRef = db.collection('trips').doc(tripId);
    if (!isCash) {
       batch.update(tripRef, {
         availableSeats: admin.firestore.FieldValue.increment(-seatNumbers.length),
         heldSeats: admin.firestore.FieldValue.increment(-seatNumbers.length),
         updatedAt: new Date(),
       });
    } else {
       batch.update(tripRef, {
         heldSeats: admin.firestore.FieldValue.increment(seatNumbers.length),
         updatedAt: new Date(),
       });
    }
    
    await batch.commit();

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Confirm a pending booking (Manual payment)
export const confirmBooking = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const passengerId = (req as any).user.uid;

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
    const bookingRef = db.collection('bookings').doc(id);
    await bookingRef.update({
      status: 'confirmed',
      paymentStatus: 'paid',
      confirmedAt: new Date(),
      updatedAt: new Date()
    });

    // Update Firestore seats
    const tripRef = db.collection('trips').doc(booking.tripId);
    const batch = db.batch();
    
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
      availableSeats: admin.firestore.FieldValue.increment(-booking.seatNumbers.length),
      heldSeats: admin.firestore.FieldValue.increment(-booking.seatNumbers.length),
      updatedAt: new Date()
    });

    await batch.commit();

    res.json(updatedBooking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get passenger bookings
export const getMyBookings = async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).user.uid;
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
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get booking by ID
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const passengerId = (req as any).user.uid;

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
  } catch (error) {
    console.error('Error fetching booking by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get passenger's current active booking
export const getActiveBooking = async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).user.uid;
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
  } catch (error) {
    console.error('Error fetching active booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Cancel a booking
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const passengerId = (req as any).user.uid;

    const booking = await prisma.booking.findUnique({ where: { id }, include: { trip: true } });
    if (!booking || booking.passengerId !== passengerId) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Reschedule a booking
export const rescheduleBooking = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { newTripId } = req.body;
    const passengerId = (req as any).user.uid;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.passengerId !== passengerId) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await prisma.booking.update({
      where: { id },
      data: { tripId: newTripId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Rate a booking
export const rateBooking = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { rating, review } = req.body;
    const passengerId = (req as any).user.uid;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.passengerId !== passengerId) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // A simple mock for rating since Rating model does not exist yet
    // In real scenario, would create Rating record
    res.json({ success: true });
  } catch (error) {
    console.error('Error rating booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

