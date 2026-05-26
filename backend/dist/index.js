"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("./middleware/authMiddleware");
const cityRoutes_1 = __importDefault(require("./routes/cityRoutes"));
const tripRoutes_1 = __importDefault(require("./routes/tripRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const routeRoutes_1 = __importDefault(require("./routes/routeRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const transporterRoutes_1 = __importDefault(require("./routes/transporterRoutes"));
const driverRoutes_1 = __importDefault(require("./routes/driverRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes")); // ✅ Added
const tourRoutes_1 = __importDefault(require("./routes/tourRoutes")); // ✅ Added
const authRoutes_1 = __importDefault(require("./routes/authRoutes")); // ✅ Custom Auth
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socketHandler_1 = require("./sockets/socketHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize WebSockets
(0, socketHandler_1.setupSockets)(io);
// Register API Routes
app.use('/api/auth', authRoutes_1.default); // ✅ Custom Auth
app.use('/api/cities', cityRoutes_1.default);
app.use('/api/routes', routeRoutes_1.default);
app.use('/api/trips', tripRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/transporter', transporterRoutes_1.default);
app.use('/api/driver', driverRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default); // ✅ Added
app.use('/api/tours', tourRoutes_1.default); // ✅ Added
// Public Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ZuGo2 Backend API is running' });
});
// Example Protected Route
app.get('/api/me', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.uid;
        const role = req.user.role;
        let user = null;
        if (role === 'passenger') {
            user = await prisma.passenger.findUnique({ where: { id: userId } });
        }
        else if (role === 'transporter') {
            user = await prisma.transporter.findUnique({ where: { id: userId } });
        }
        else if (role === 'driver') {
            user = await prisma.driver.findUnique({ where: { id: userId } });
        }
        else if (role === 'admin') {
            user = await prisma.admin.findUnique({ where: { id: userId } });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found in database' });
        }
        const { passwordHash: _, ...profile } = user;
        res.json({ user: { ...profile, role } });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
