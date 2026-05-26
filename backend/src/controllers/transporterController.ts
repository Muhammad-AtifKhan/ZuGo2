import prisma from '../lib/prisma';
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import * as admin from 'firebase-admin';
import { cacheService } from '../services/cacheService';
import { supabaseAdmin } from '../config/supabase';
import { saveDriverToFirestore } from '../services/firestoreProfileService';


// ==========================================
// BUS MANAGEMENT
// ==========================================

export const addBus = async (req: Request, res: Response) => {
  try {
    const { busNumber, registrationNumber, make, model, year, capacity, fuelType, color, busType, status, transporterId } = req.body;

    if (!transporterId || !registrationNumber || !busNumber || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bus = await prisma.bus.create({
      data: {
        busNumber,
        registrationNumber,
        make,
        model,
        year: year ? parseInt(year) : null,
        capacity: parseInt(capacity),
        fuelType: fuelType || 'diesel',
        color,
        busType: busType || 'standard',
        status: status || 'available',
        transporterId,
      },
    });

    cacheService.invalidateTransporter(transporterId);
    res.status(201).json({ message: 'Bus created successfully', bus });
  } catch (error: any) {
    console.error('Error adding bus:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Registration number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBuses = async (req: Request, res: Response) => {
  try {
    const { transporterId } = req.query;

    if (!transporterId) {
      return res.status(400).json({ error: 'Transporter ID is required' });
    }

    const cacheKey = `transporter:${transporterId}:buses`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.status(200).json(cached);
    }

    const buses = await prisma.bus.findMany({
      where: { transporterId: String(transporterId) },
      orderBy: { createdAt: 'desc' },
    });

    cacheService.set(cacheKey, buses, 15 * 1000); // 15 seconds
    res.status(200).json(buses);
  } catch (error) {
    console.error('Error getting buses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBusStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, driverId } = req.body;

    // 1. Update in Postgres
    const bus = await prisma.bus.update({
      where: { id },
      data: { status }
    });

    // 2. Update in Firestore
    const batch = db.batch();
    batch.update(db.collection('buses').doc(id), {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If driver needs to be unassigned
    if (driverId) {
      batch.update(db.collection('drivers').doc(driverId), {
        busAssignedId: null,
        busNumber: null,
        vehicleAssigned: '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    cacheService.invalidateTransporter(bus.transporterId);
    res.status(200).json({ message: 'Bus status updated successfully' });
  } catch (error) {
    console.error('Error updating bus status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logMaintenance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, description, transporterId, busNumber } = req.body;

    // We'll log maintenance in Firestore only for now as there's no maintenance table in schema
    await db.collection('maintenance').add({
      busId: id,
      busNumber,
      date: admin.firestore.FieldValue.serverTimestamp(),
      type: type || 'routine',
      description,
      transporterId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ message: 'Maintenance logged successfully' });
  } catch (error) {
    console.error('Error logging maintenance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMaintenanceHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const snapshot = await db.collection('maintenance')
      .where('busId', '==', id)
      .orderBy('date', 'desc')
      .limit(5)
      .get();

    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date ? data.date.toDate().toISOString() : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    res.status(200).json(history);
  } catch (error) {
    console.error('Error getting maintenance history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// DRIVER MANAGEMENT
// ==========================================

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { transporterId } = req.query;
    if (!transporterId) return res.status(400).json({ error: 'Transporter ID is required' });

    const snapshot = await db.collection('transporter_notifications')
      .where('transporterId', '==', transporterId)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
    }));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('transporter_notifications').doc(id).update({ read: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const { transporterId } = req.body;
    if (!transporterId) return res.status(400).json({ error: 'Transporter ID is required' });

    const snapshot = await db.collection('transporter_notifications')
      .where('transporterId', '==', transporterId)
      .where('read', '==', false)
      .get();

    if (snapshot.empty) return res.json({ success: true });

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkDuplicateDriver = async (req: Request, res: Response) => {
  try {
    const { email, cnic, transporterId } = req.query;

    if (!transporterId) {
      return res.status(400).json({ error: 'Transporter ID is required' });
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase();
      const p = await prisma.passenger.findUnique({ where: { email: normalizedEmail } });
      const t = await prisma.transporter.findUnique({ where: { email: normalizedEmail } });
      const d = await prisma.driver.findUnique({ where: { email: normalizedEmail } });
      const a = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
      if (p || t || d || a) {
        return res.json({ isDuplicate: true, type: 'email' });
      }
    }

    if (cnic) {
      const existingByCNIC = await prisma.driver.findFirst({
        where: { cnic: String(cnic), transporterId: String(transporterId) }
      });
      if (existingByCNIC) {
        return res.json({ isDuplicate: true, type: 'cnic' });
      }
    }

    res.json({ isDuplicate: false });
  } catch (error) {
    console.error('Error checking duplicate driver:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addDriver = async (req: Request, res: Response) => {
  let createdAuthUserId: string | null = null;

  try {
    const { 
      email, password, name, phone, transporterId, status,
      cnic, licenseNumber, licenseType, licenseExpiry,
      address, emergencyContact, joiningDate, salary, employmentType, experienceYears
    } = req.body;

    if (!email || !password || !name || !transporterId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'driver',
        name: trimmedName,
        phone: phone ? phone.trim() : null,
        transporterId,
      },
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Failed to create driver auth user' });
    }

    createdAuthUserId = authData.user.id;

    // 1. Create Driver in PostgreSQL with the same ID as Supabase Auth
    const driver = await prisma.driver.create({
      data: {
        id: authData.user.id,
        email: normalizedEmail,
        passwordHash: '',
        name: trimmedName,
        phone: phone ? phone.trim() : null,
        transporterId,
        cnic: cnic ? cnic.trim() : null,
        licenseNumber: licenseNumber ? licenseNumber.trim() : null,
        licenseType: licenseType || 'heavy',
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        address: address ? address.trim() : null,
        emergencyContact: emergencyContact ? emergencyContact.trim() : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        salary: salary ? parseFloat(salary) : 0,
        employmentType: employmentType || 'fulltime',
        experienceYears: experienceYears ? parseInt(experienceYears) : 0,
        status: status || 'available',
      },
    });

    // 2. Save to both `drivers` and `users` in Firestore
    await saveDriverToFirestore({
      id: driver.id,
      transporterId,
      fullName: trimmedName,
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      cnic: cnic ? cnic.trim() : null,
      licenseNumber: licenseNumber ? licenseNumber.trim() : null,
      licenseType: licenseType || 'heavy',
      licenseExpiry: licenseExpiry || null,
      address: address ? address.trim() : null,
      emergencyContact: emergencyContact ? emergencyContact.trim() : null,
      joiningDate: joiningDate || null,
      salary: salary ? parseFloat(salary) : 0,
      employmentType: employmentType || 'fulltime',
      experienceYears: experienceYears ? parseInt(experienceYears) : 0,
      status: status || 'available',
    });

    cacheService.invalidateTransporter(transporterId);
    res.status(201).json({ message: 'Driver added successfully', driver });
  } catch (error: any) {
    console.error('Error adding driver:', error);
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists in database' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // 1. Delete from PostgreSQL
    const driver = await prisma.driver.delete({
      where: { id }
    });

    // 2. Delete from Firestore (Hybrid sync)
    const batch = db.batch();
    batch.delete(db.collection('drivers').doc(id));
    batch.delete(db.collection('users').doc(id));
    await batch.commit();

    await supabaseAdmin.auth.admin.deleteUser(id).catch((error) => {
      console.warn('Failed to delete driver auth user:', error?.message || error);
    });

    if (driver.transporterId) {
      cacheService.invalidateTransporter(driver.transporterId);
    }
    res.status(200).json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDrivers = async (req: Request, res: Response) => {
  try {
    const { transporterId } = req.query;

    if (!transporterId) {
      return res.status(400).json({ error: 'Transporter ID is required' });
    }

    const cacheKey = `transporter:${transporterId}:drivers`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.status(200).json(cached);
    }

    const drivers = await prisma.driver.findMany({
      where: {
        transporterId: String(transporterId),
      },
      orderBy: { createdAt: 'desc' },
    });

    cacheService.set(cacheKey, drivers, 15 * 1000); // 15 seconds
    res.status(200).json(drivers);
  } catch (error) {
    console.error('Error getting drivers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// TRIP SCHEDULE MANAGEMENT
// ==========================================

// Helper function for Firestore seat generation
const generateTripSeats = (batch: FirebaseFirestore.WriteBatch, tripId: string, totalSeats: number, fare: number) => {
  const seatsRef = db.collection('trips').doc(tripId).collection('seats');
  const rows = Math.ceil(totalSeats / 5);
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= 5; col++) {
      const seatNumber = `${row}${String.fromCharCode(64 + col)}`;
      const isWindow = col === 1 || col === 5;
      const isAisle = col === 3;
      batch.set(seatsRef.doc(seatNumber), {
        seatNumber, row, column: col, isBooked: false, status: 'available',
        price: row <= 2 ? Math.round(fare * 1.25) : fare,
        type: isWindow ? 'window' : isAisle ? 'aisle' : 'middle',
        isWindow, isAisle, isMiddle: !isWindow && !isAisle,
        hasExtraLegroom: row === 1,
        isWheelchairAccessible: row === rows && (col === 1 || col === 2),
        reservedBy: null, reservedUntil: null, bookingId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
};

export const scheduleTrip = async (req: Request, res: Response) => {
  try {
    const { 
      routeId, driverId, busId, departureTime, arrivalTime, 
      price, totalSeats, transporterId, status,
      startDate, endDate, selectedDays
    } = req.body;

    // Check if it's an array of trips
    if (Array.isArray(req.body.trips)) {
      const tripsData = req.body.trips;
      const createdTrips = [];
      const batch = db.batch(); // Firestore batch

      // Process each trip
      for (const t of tripsData) {
        // 1. Create in PostgreSQL
        const pgTrip = await prisma.trip.create({
          data: {
            routeId: t.routeId,
            driverId: t.driverId,
            busId: t.busId,
            departureTime: new Date(t.date + 'T' + t.departureTime),
            arrivalTime: t.arrivalTime ? new Date(t.date + 'T' + t.arrivalTime) : null,
            status: t.status || 'scheduled',
            price: parseFloat(t.fare),
            totalSeats: parseInt(t.totalSeats || '45'),
          }
        });
        createdTrips.push(pgTrip);

        // 2. Create in Firestore (Hybrid)
        const fsTripRef = db.collection('trips').doc(pgTrip.id);
        batch.set(fsTripRef, {
          ...t,
          id: pgTrip.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. Generate seats in Firestore
        generateTripSeats(batch, pgTrip.id, parseInt(t.totalSeats || '45'), parseFloat(t.fare));
      }

      await batch.commit();

      if (createdTrips.length > 0 && createdTrips[0].busId) {
        const bus = await prisma.bus.findUnique({
          where: { id: createdTrips[0].busId }
        });
        if (bus) {
          cacheService.invalidateTransporter(bus.transporterId);
        }
      }

      return res.status(201).json({ message: 'Trips scheduled successfully', count: createdTrips.length });
    }

    // Single trip fallback logic (optional, but handled above mostly)
    res.status(400).json({ error: 'Please provide an array of trips' });
  } catch (error) {
    console.error('Error scheduling trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTripSchedule = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Parse the date strings back into timestamps for Firestore
    const scheduleData = {
      ...data,
      startDate: data.startDate ? admin.firestore.Timestamp.fromDate(new Date(data.startDate + 'T12:00:00Z')) : null,
      endDate: data.endDate ? admin.firestore.Timestamp.fromDate(new Date(data.endDate + 'T12:00:00Z')) : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('tripSchedules').add(scheduleData);
    
    res.status(201).json({ message: 'Schedule created successfully', id: ref.id });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTrips = async (req: Request, res: Response) => {
  try {
    const { transporterId, busId } = req.query;

    if (!transporterId) {
      return res.status(400).json({ error: 'Transporter ID is required' });
    }

    const cacheKey = busId 
      ? `transporter:${transporterId}:trips:${busId}` 
      : `transporter:${transporterId}:trips`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.status(200).json(cached);
    }

    const whereClause: any = {
      bus: { transporterId: String(transporterId) }
    };

    if (busId) {
      whereClause.busId = String(busId);
    }

    const trips = await prisma.trip.findMany({
      where: whereClause,
      include: {
        route: true,
        bus: true,
        driver: true,
        bookings: true,
      },
      orderBy: { departureTime: 'desc' }
    });

    const mappedTrips = trips.map(t => ({
      id: t.id,
      routeId: t.routeId,
      routeCode: t.route.id, // Or code if available
      routeName: `${t.route.sourceCityId} → ${t.route.destCityId}`,
      from: t.route.sourceCityId,
      to: t.route.destCityId,
      busId: t.busId,
      busNumber: t.bus.busNumber,
      driverId: t.driverId,
      driverName: t.driver.name,
      departureTime: t.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      arrivalTime: t.arrivalTime ? t.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      status: t.status,
      totalSeats: t.totalSeats,
      availableSeats: t.totalSeats - t.bookings.length,
      fare: t.price,
      distance: 0,
      estimatedRevenue: t.bookings.length * t.price,
      transporterId: transporterId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      date: t.departureTime.toISOString().split('T')[0],
      dayOfWeek: t.departureTime.toLocaleDateString('en-US', { weekday: 'short' }),
    }));

    cacheService.set(cacheKey, mappedTrips, 10 * 1000); // 10 seconds
    res.status(200).json(mappedTrips);
  } catch (error) {
    console.error('Error getting trips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTripById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        route: true,
        bus: true,
        driver: true,
      }
    });

    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    res.status(200).json({
      id: trip.id,
      busId: trip.busId,
      busNumber: trip.bus.busNumber,
      routeName: `${trip.route.sourceCityId} → ${trip.route.destCityId}`,
      driverName: trip.driver.name,
      driverId: trip.driverId,
      departureTime: trip.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      arrivalTime: trip.arrivalTime ? trip.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
      from: trip.route.sourceCityId,
      to: trip.route.destCityId,
      status: trip.status,
    });
  } catch (error) {
    console.error('Error getting trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRoutes = async (req: Request, res: Response) => {
  try {
    const { transporterId } = req.query;
    if (!transporterId) {
      return res.status(400).json({ error: 'Transporter ID is required' });
    }

    const cacheKey = `transporter:${transporterId}:routes`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.status(200).json(cached);
    }

    // Transporters don't own routes in the new schema, but let's fetch all routes for now
    const routes = await prisma.route.findMany({
      orderBy: { createdAt: 'desc' }
    });

    cacheService.set(cacheKey, routes, 60 * 1000); // 60 seconds
    res.status(200).json(routes);
  } catch (error) {
    console.error('Error getting routes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addRoute = async (req: Request, res: Response) => {
  try {
    const { code, name, from, to, distance, duration, fare, transporterId } = req.body;

    if (!code || !name || !from || !to || !distance || !fare || !transporterId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Create Route in PostgreSQL
    const route = await prisma.route.create({
      data: {
        id: code.toUpperCase(),
        name,
        sourceCityId: from,
        destCityId: to,
        distance: parseInt(distance.replace(/[^0-9]/g, '')) || 0,
        duration: duration || '2h 0m'
      }
    });

    // 2. Sync to Firestore (Legacy support)
    const routeData = {
      code: code.toUpperCase(),
      name,
      from,
      to,
      distance,
      duration: duration || '2h 0m',
      fare: parseInt(fare) || 0,
      transporterId,
      verified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('routes').add(routeData);

    cacheService.invalidateTransporter(transporterId);
    res.status(201).json({ message: 'Route added successfully', id: ref.id, postgresRoute: route });
  } catch (error) {
    console.error('Error adding route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTripStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, driverId, busId } = req.body;

    // Start a transaction in Prisma to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Update Trip
      await tx.trip.update({
        where: { id },
        data: { status }
      });

      // 2. Update Bus Status if provided
      if (busId) {
        let busStatus = 'available';
        if (status === 'in_progress' || status === 'active') busStatus = 'on_trip';
        
        await tx.bus.update({
          where: { id: busId },
          data: { status: busStatus }
        });
      }

      // 3. Driver Status is not supported as a field on the User model in Postgres schema,
      // so we only manage it dynamically or via Firestore.
    });

    // Mirror to Firestore for legacy compatibility
    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const tripRef = db.collection('trips').doc(id);
    batch.update(tripRef, { status, updatedAt: now });

    if (busId) {
      let busStatus = 'available';
      if (status === 'in_progress' || status === 'active') busStatus = 'on_trip';
      batch.update(db.collection('buses').doc(busId), {
        status: busStatus,
        currentTripId: status === 'in_progress' || status === 'active' ? id : null,
        updatedAt: now
      });
    }

    if (driverId) {
      let driverStatus = 'available';
      if (status === 'in_progress' || status === 'active') driverStatus = 'on_trip';
      batch.update(db.collection('drivers').doc(driverId), {
        status: driverStatus,
        currentTripId: status === 'in_progress' || status === 'active' ? id : null,
        updatedAt: now
      });
    }

    // Create Activity Log
    const activityRef = db.collection('trip_activities').doc();
    batch.set(activityRef, {
      tripId: id,
      type: status,
      timestamp: now,
      driverId: driverId || null,
      busId: busId || null,
      createdAt: now,
    });

    await batch.commit();

    if (busId) {
      const bus = await prisma.bus.findUnique({
        where: { id: busId }
      });
      if (bus) {
        cacheService.invalidateTransporter(bus.transporterId);
      }
    } else {
      const trip = await prisma.trip.findUnique({
        where: { id },
        include: { bus: true }
      });
      if (trip && trip.bus) {
        cacheService.invalidateTransporter(trip.bus.transporterId);
      }
    }

    res.status(200).json({ message: 'Trip status updated successfully' });
  } catch (error) {
    console.error('Error updating trip status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const transporterId = req.query.transporterId as string;

    if (!transporterId) {
      return res.status(400).json({ error: 'Transporter ID is required' });
    }

    const cacheKey = `transporter:${transporterId}:dashboard`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.status(200).json(cached);
    }

    // 1. Fetch Buses
    const buses = await prisma.bus.findMany({
      where: { transporterId }
    });

    // 2. Fetch Drivers
    const drivers = await prisma.driver.findMany({
      where: { 
        transporterId
      }
    });

    // 3. Fetch Today's Trips
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const trips = await prisma.trip.findMany({
      where: {
        bus: { transporterId },
        departureTime: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        route: true,
        bus: true,
        driver: true,
        bookings: true
      }
    });

    // Calculate Stats
    const totalRevenue = trips.reduce((sum, trip) => {
      // Basic revenue calculation: (number of confirmed bookings) * price
      const confirmedBookings = trip.bookings.filter(b => b.status === 'confirmed' || b.status === 'boarded').length;
      return sum + (confirmedBookings * trip.price);
    }, 0);

    const scheduledTrips = trips.filter(t => t.status === 'scheduled').length;
    const inProgressTrips = trips.filter(t => t.status === 'active' || t.status === 'in_progress').length;
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    const delayedTrips = trips.filter(t => t.status === 'delayed').length;
    const cancelledTrips = trips.filter(t => t.status === 'cancelled').length;

    const onTimePerformance = trips.length > 0
      ? Math.round(((inProgressTrips + completedTrips) / trips.length) * 100)
      : 0;

    // Map trips for frontend
    const mappedTrips = trips.map(t => ({
      id: t.id,
      time: t.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      route: `${t.route.sourceCityId} to ${t.route.destCityId}`, // Need city names in real app
      routeId: t.routeId,
      bus: t.bus.busNumber,
      busId: t.busId,
      driver: t.driver.name || 'Unknown',
      driverId: t.driverId,
      status: t.status,
      passengers: t.bookings.length,
      revenue: t.bookings.length * t.price,
      departureTime: t.departureTime.toISOString(),
      arrivalTime: t.arrivalTime ? t.arrivalTime.toISOString() : null,
    }));

    const responseData = {
      stats: {
        totalBuses: buses.length,
        availableBuses: buses.filter(b => b.status === 'available').length,
        onTripBuses: buses.filter(b => b.status === 'on_trip').length,
        maintenanceBuses: buses.filter(b => b.status === 'maintenance').length,
        inactiveBuses: buses.filter(b => b.status === 'inactive').length,
        
        totalDrivers: drivers.length,
        availableDrivers: drivers.filter(d => !d.isBlocked).length,
        onTripDrivers: 0,
        offlineDrivers: 0,
        onLeaveDrivers: 0,
        suspendedDrivers: drivers.filter(d => d.isBlocked).length,
        averageRating: 4.5, // Mocked for now, need ratings table
        
        todayRevenue: totalRevenue,
        todayTrips: trips.length,
        onTimePerformance,
        scheduledTrips,
        inProgressTrips,
        completedTrips,
        delayedTrips,
        cancelledTrips,
      },
      buses,
      drivers,
      trips: mappedTrips
    };

    cacheService.set(cacheKey, responseData, 10 * 1000); // 10 seconds
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const transporterId = req.query.transporterId as string;
    if (!transporterId) return res.status(400).json({ error: 'Transporter ID is required' });

    const cacheKey = `transporter:${transporterId}:analytics`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.json(cached);
    }

    // In a real scenario, we would compute everything in PostgreSQL using Prisma aggregations.
    // Since we are doing a hybrid approach and the frontend already calculates this, 
    // we'll fetch raw data from Postgres and some from Firestore to maintain the logic.

    const [buses, drivers, trips, routes] = await Promise.all([
      prisma.bus.findMany({ where: { transporterId } }),
      prisma.driver.findMany({ where: { transporterId } }),
      prisma.trip.findMany({ where: { bus: { transporterId } }, include: { bookings: true } }),
      prisma.route.findMany()
    ]);

    // Fetch ratings from Firestore (Legacy)
    const ratingsSnapshot = await db.collection('ratings').where('transporterId', '==', transporterId).get();
    const ratings = ratingsSnapshot.docs.map(doc => doc.data());

    // Fetch searches from Firestore (Legacy)
    const searchesSnapshot = await db.collection('searches').get();
    const searches = searchesSnapshot.docs.map(doc => doc.data());

    // Compute stats
    const activeBuses = buses.filter(b => b.status === 'available').length;
    const activeDrivers = drivers.filter(d => !d.isBlocked).length;
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    const cancelledTrips = trips.filter(t => t.status === 'cancelled').length;

    let totalRevenue = 0;
    trips.forEach(trip => {
      const confirmedBookings = trip.bookings.filter(b => b.status === 'confirmed' || b.status === 'boarded').length;
      totalRevenue += confirmedBookings * trip.price;
    });

    let totalRating = 0;
    ratings.forEach(r => totalRating += (r.rating || 0));
    const avgRating = ratings.length > 0 ? totalRating / ratings.length : 0;

    const stats = {
      totalRevenue,
      avgDailyRevenue: Math.round(totalRevenue / 30),
      totalTrips: trips.length,
      avgRating: parseFloat(avgRating.toFixed(1)),
      activeBuses,
      activeDrivers,
      completedTrips,
      cancelledTrips,
    };

    // Calculate Daily Revenue (last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayTrips = trips.filter(t => new Date(t.departureTime).toDateString() === date.toDateString());
      const dayRev = dayTrips.reduce((sum, t) => sum + (t.bookings.filter(b => b.status === 'confirmed' || b.status === 'boarded').length * t.price), 0);
      dailyRevenue.push({ day: days[date.getDay()], revenue: dayRev });
    }

    // Calculate Monthly Revenue (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthTrips = trips.filter(t => new Date(t.departureTime).getMonth() === date.getMonth() && new Date(t.departureTime).getFullYear() === date.getFullYear());
      const monthRev = monthTrips.reduce((sum, t) => sum + (t.bookings.filter(b => b.status === 'confirmed' || b.status === 'boarded').length * t.price), 0);
      monthlyRevenue.push({ month: months[date.getMonth()], revenue: monthRev });
    }

    // Bus Performance
    const busPerformance = buses.map(bus => {
      const busTrips = trips.filter(t => t.busId === bus.id);
      const busRev = busTrips.reduce((sum, t) => sum + (t.bookings.filter(b => b.status === 'confirmed' || b.status === 'boarded').length * t.price), 0);
      const busRatings = ratings.filter(r => r.busId === bus.id);
      const bRating = busRatings.length > 0 ? busRatings.reduce((s, r) => s + (r.rating || 0), 0) / busRatings.length : 0;
      return { busNumber: bus.busNumber, trips: busTrips.length, revenue: busRev, rating: bRating };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Driver Performance
    const driverPerformance = drivers.map(driver => {
      const driverTrips = trips.filter(t => t.driverId === driver.id);
      const driverRev = driverTrips.reduce((sum, t) => sum + (t.bookings.filter(b => b.status === 'confirmed' || b.status === 'boarded').length * t.price), 0);
      const driverRatings = ratings.filter(r => r.driverId === driver.id);
      const dRating = driverRatings.length > 0 ? driverRatings.reduce((s, r) => s + (r.rating || 0), 0) / driverRatings.length : 0;
      return { driverName: driver.name || 'Unknown', trips: driverTrips.length, revenue: driverRev, rating: dRating };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Lost Opportunities
    const searchCounts: Record<string, any> = {};
    searches.forEach(data => {
      if (data.fromCityId && data.toCityId) {
        const key = `${data.fromCityId}-${data.toCityId}`;
        if (!searchCounts[key]) {
          searchCounts[key] = { fromId: data.fromCityId, toId: data.toCityId, fromName: data.fromCityName || 'Unknown', toName: data.toCityName || 'Unknown', count: 0 };
        }
        searchCounts[key].count += 1;
      }
    });

    const missedOps: any[] = [];
    const AVG_TICKET_PRICE = 1500;
    Object.values(searchCounts).forEach(searchData => {
      const routeExists = routes.some(r => r.sourceCityId === searchData.fromId && r.destCityId === searchData.toId);
      if (!routeExists && searchData.count > 0) {
        missedOps.push({
          id: `${searchData.fromId}-${searchData.toId}`,
          fromCityId: searchData.fromId,
          toCityId: searchData.toId,
          fromCityName: searchData.fromName,
          toCityName: searchData.toName,
          searches: searchData.count,
          estimatedLostRevenue: searchData.count * AVG_TICKET_PRICE
        });
      }
    });

    missedOps.sort((a, b) => b.searches - a.searches);
    const lostOpportunities = missedOps.slice(0, 10);

    const responseData = {
      stats,
      dailyRevenue,
      monthlyRevenue,
      busPerformance,
      driverPerformance,
      lostOpportunities
    };

    cacheService.set(cacheKey, responseData, 10 * 1000); // 10 seconds
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const { transporterId } = req.query;
    if (!transporterId) return res.status(400).json({ error: 'Transporter ID is required' });

    const cacheKey = `transporter:${transporterId}:settings`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.json(cached);
    }

    const doc = await db.collection('settings').doc(String(transporterId)).get();
    let responseData;
    if (doc.exists) {
      responseData = doc.data();
    } else {
      responseData = {
        notifications: true,
        emailReports: true,
        lowBusAlert: true,
        maintenanceReminders: true,
        autoGenerateReports: false,
      };
    }

    cacheService.set(cacheKey, responseData, 60 * 1000); // 60 seconds
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { transporterId } = req.body;
    if (!transporterId) return res.status(400).json({ error: 'Transporter ID is required' });

    await db.collection('settings').doc(String(transporterId)).set(req.body.settings, { merge: true });
    cacheService.invalidateTransporter(transporterId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

