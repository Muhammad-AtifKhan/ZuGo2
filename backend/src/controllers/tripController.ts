import prisma from '../lib/prisma';
import { Request, Response } from 'express';


// Get all trips with source and destination details
export const getAllTrips = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create a new trip
export const createTrip = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Search trips by route and date
export const searchTrips = async (req: Request, res: Response) => {
  try {
    const { fromCityId, toCityId, date } = req.query;

    if (!fromCityId || !toCityId || !date) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const startDate = new Date(date as string);
    const endDate = new Date(date as string);
    endDate.setDate(endDate.getDate() + 1);

    const trips = await prisma.trip.findMany({
      where: {
        route: {
          sourceCityId: fromCityId as string,
          destCityId: toCityId as string
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
  } catch (error) {
    console.error('Error searching trips:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get reschedule options for a specific route
export const getRescheduleOptions = async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    const now = new Date();

    const trips = await prisma.trip.findMany({
      where: {
        routeId: routeId as string,
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
  } catch (error) {
    console.error('Error fetching reschedule options:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// --- In-Memory Seat Holds (For temporary reservation before payment) ---
// Key: `${tripId}_${seatNum}`, Value: { userId, expiresAt }
const seatHolds: Record<string, { userId: string, expiresAt: Date }> = {};

// Get seats for a trip
export const getTripSeats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({
      where: { id: id as string },
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
    const bookedSeatNumbers = new Set<number>();
    
    (trip as any).bookings.forEach((b: any) => {
      if (b.status === 'confirmed' || b.status === 'boarded' || b.status === 'pending_payment') {
        b.seatNumbers.forEach((s: any) => bookedSeatNumbers.add(s));
      }
    });

    for (let i = 1; i <= trip.totalSeats; i++) {
      const holdKey = `${id}_${i}`;
      let status = 'available';
      let reservedBy = null;

      if (bookedSeatNumbers.has(i)) {
        status = 'booked';
      } else if (seatHolds[holdKey]) {
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
  } catch (error) {
    console.error('Error getting trip seats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Reserve seats temporarily
export const reserveSeats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seatNumbers } = req.body;
    const userId = (req as any).user.uid;

    if (!seatNumbers || !Array.isArray(seatNumbers)) {
      return res.status(400).json({ error: 'Invalid seat numbers' });
    }

    // Check if any seat is already held or booked
    const trip = await prisma.trip.findUnique({ where: { id: id as string }, include: { bookings: true } });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
 
    const bookedSeatNumbers = new Set<number>();
    (trip as any).bookings.forEach((b: any) => {
      if (b.status === 'confirmed' || b.status === 'boarded' || b.status === 'pending_payment') {
        b.seatNumbers.forEach((s: any) => bookedSeatNumbers.add(s));
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
  } catch (error) {
    console.error('Error reserving seats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Release held seats
export const releaseSeats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seatNumbers } = req.body;
    const userId = (req as any).user.uid;

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
  } catch (error) {
    console.error('Error releasing seats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

