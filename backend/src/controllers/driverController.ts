import prisma from '../lib/prisma';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Get Driver Dashboard Data
export const getDashboardData = async (req: Request, res: Response) => {
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
      driverStatus: (driver as any).status || 'offline',
      currentTripId: (driver as any).status === 'on_trip' ? (trips.find(t => t.status === 'in_progress')?.id || null) : null,
      duties: formattedTrips,
      stats: driverStats
    });
  } catch (error) {
    console.error('Error fetching driver dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDriverStatus = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTripBookings = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const bookings = await prisma.booking.findMany({
      where: { tripId: id }
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error getting trip bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const openBoarding = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    await prisma.trip.update({
      where: { id },
      data: { status: 'boarding' } // or whatever status we use for open boarding
    });

    await db.collection('trips').doc(id).update({
      boardingOpen: true,
      boardingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: 'Boarding opened' });
  } catch (error) {
    console.error('Error opening boarding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const boardPassenger = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string; // passengerId
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
  } catch (error) {
    console.error('Error boarding passenger:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDriverEarnings = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.query;
    console.log('[Earnings] ===== START =====');
    console.log('[Earnings] driverId received:', driverId);
    
    if (!driverId) {
      console.log('[Earnings] No driverId provided');
      return res.status(400).json({ error: 'Driver ID required' });
    }

    console.log('[Earnings] Fetching trips for driver:', driverId);
    
    const trips = await prisma.trip.findMany({
      where: { driverId: String(driverId) },
      include: { 
        bookings: true,
        route: true,
        bus: true
      },
      orderBy: {
        departureTime: 'desc'
      }
    });
    
    console.log('[Earnings] Trips found:', trips.length);
    
    // Transform trips for frontend
    const tripsWithDetails = trips.map(trip => {
      const revenue = (trip.bookings?.length || 0) * (trip.price || 0);
      return {
        id: trip.id,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        status: trip.status,
        price: trip.price,
        revenue: revenue,
        passengerCount: trip.bookings?.length || 0,
        route: trip.route ? {
          id: trip.route.id,
          name: trip.route.sourceCityId + ' → ' + trip.route.destCityId,
          fromCity: trip.route.sourceCityId,
          toCity: trip.route.destCityId,
          distance: trip.route.distance
        } : null,
        bus: trip.bus ? {
          id: trip.bus.id,
          busNumber: trip.bus.busNumber,
          capacity: trip.bus.capacity
        } : null,
        bookings: trip.bookings.map(b => ({
          id: b.id,
          price: b.totalAmount,
          status: b.status
        }))
      };
    });
    
    const totalEarnings = tripsWithDetails.reduce((sum, t) => sum + t.revenue, 0);
    
    console.log('[Earnings] Total earnings:', totalEarnings);
    console.log('[Earnings] ===== END =====');
    
    res.status(200).json({ 
      totalEarnings, 
      trips: tripsWithDetails,
      count: tripsWithDetails.length
    });
  } catch (error: any) {
    console.error('[Earnings] ERROR:', error.message);
    console.error('[Earnings] Stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const reportDelay = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error reporting delay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reportEmergency = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error reporting emergency:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Bus by ID
export const getBusById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const bus = await prisma.bus.findUnique({
      where: { id }
    });
    
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    res.status(200).json(bus);
  } catch (error) {
    console.error('Error fetching bus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Driver Vehicle Checks
export const getVehicleChecks = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.query;
    if (!driverId) return res.status(400).json({ error: 'Missing driverId' });

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
  } catch (error) {
    console.error('Error fetching vehicle checks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Driver Schedule (All trips)
export const getDriverSchedule = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error fetching driver schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit Vehicle Check
export const submitVehicleCheck = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error submitting vehicle check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit Vehicle Issue
export const submitVehicleIssue = async (req: Request, res: Response) => {
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
      } else {
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
  } catch (error) {
    console.error('Error submitting vehicle issue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

