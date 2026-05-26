import prisma from './lib/prisma';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth } from './middleware/authMiddleware';

import cityRoutes from './routes/cityRoutes';
import tripRoutes from './routes/tripRoutes';
import bookingRoutes from './routes/bookingRoutes';
import userRoutes from './routes/userRoutes';
import routeRoutes from './routes/routeRoutes';
import adminRoutes from './routes/adminRoutes';
import transporterRoutes from './routes/transporterRoutes';
import driverRoutes from './routes/driverRoutes';
import notificationRoutes from './routes/notificationRoutes'; // ✅ Added
import tourRoutes from './routes/tourRoutes'; // ✅ Added
import authRoutes from './routes/authRoutes'; // ✅ Custom Auth
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSockets } from './sockets/socketHandler';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ ADD REQUEST LOGGING MIDDLEWARE HERE (after cors, before routes)
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path}`);
  console.log(`[REQ] Headers:`, req.headers.authorization ? 'Token present' : 'No token');
  console.log(`[REQ] Body:`, req.body);
  next();
});

// Initialize WebSockets
setupSockets(io);

// Register API Routes
app.use('/api/auth', authRoutes); // ✅ Custom Auth
app.use('/api/cities', cityRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transporter', transporterRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/notifications', notificationRoutes); // ✅ Added
app.use('/api/tours', tourRoutes); // ✅ Added

// Public Route
app.get('/api/health', (req: Request, res: Response) => {
  console.log('[HEALTH] Health check called');
  res.json({ status: 'ok', message: 'ZuGo2 Backend API is running' });
});

// Example Protected Route
app.get('/api/me', requireAuth, async (req: Request, res: Response) => {
  console.log('[ME] Protected route called');
  try {
    const userId = (req as any).user.uid;
    const role = (req as any).user.role;
    let user: any = null;

    if (role === 'passenger') {
      user = await prisma.passenger.findUnique({ where: { id: userId } });
    } else if (role === 'transporter') {
      user = await prisma.transporter.findUnique({ where: { id: userId } });
    } else if (role === 'driver') {
      user = await prisma.driver.findUnique({ where: { id: userId } });
    } else if (role === 'admin') {
      user = await prisma.admin.findUnique({ where: { id: userId } });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const { passwordHash: _, ...profile } = user;
    res.json({ user: { ...profile, role } });
  } catch (error) {
    console.error('[ME] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});