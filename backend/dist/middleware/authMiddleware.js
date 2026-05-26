"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApprovedTransporter = exports.requireAuth = void 0;
const client_1 = require("@prisma/client");
const supabase_1 = require("../config/supabase");
const prisma = new client_1.PrismaClient();
const findUserRole = async (userId, email) => {
    const passenger = await prisma.passenger.findFirst({
        where: { OR: [{ id: userId }, ...(email ? [{ email }] : [])] },
        select: { id: true, email: true, isBlocked: true },
    });
    if (passenger)
        return { role: 'passenger', profile: passenger };
    const transporter = await prisma.transporter.findFirst({
        where: { OR: [{ id: userId }, ...(email ? [{ email }] : [])] },
        select: { id: true, email: true, isBlocked: true, isApproved: true },
    });
    if (transporter)
        return { role: 'transporter', profile: transporter };
    const driver = await prisma.driver.findFirst({
        where: { OR: [{ id: userId }, ...(email ? [{ email }] : [])] },
        select: { id: true, email: true, isBlocked: true, transporterId: true },
    });
    if (driver)
        return { role: 'driver', profile: driver };
    const admin = await prisma.admin.findFirst({
        where: { OR: [{ id: userId }, ...(email ? [{ email }] : [])] },
        select: { id: true, email: true },
    });
    if (admin)
        return { role: 'admin', profile: admin };
    return null;
};
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const { data, error } = await supabase_1.supabaseAdmin.auth.getUser(token);
        if (error || !data.user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
        const authUser = data.user;
        const roleFromMetadata = authUser.user_metadata?.role || authUser.app_metadata?.role;
        const profileMatch = await findUserRole(authUser.id, authUser.email);
        if (!profileMatch && !roleFromMetadata) {
            return res.status(403).json({ error: 'User profile not found.' });
        }
        const profile = profileMatch?.profile;
        if (profile?.isBlocked) {
            return res.status(403).json({ error: 'Your account has been suspended' });
        }
        req.user = {
            uid: profile?.id || authUser.id,
            id: profile?.id || authUser.id,
            email: profile?.email || authUser.email,
            role: profileMatch?.role || roleFromMetadata,
            transporterId: profile?.transporterId,
            isApproved: profile?.isApproved,
            supabaseUser: authUser,
        };
        return next();
    }
    catch (error) {
        console.error('Error verifying Supabase token:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
exports.requireAuth = requireAuth;
const requireApprovedTransporter = async (req, res, next) => {
    const userId = req.user?.uid;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: No authenticated user' });
    }
    try {
        const transporter = await prisma.transporter.findUnique({
            where: { id: userId },
        });
        if (!transporter) {
            return res.status(404).json({ error: 'Transporter not found in database' });
        }
        if (!transporter.isApproved) {
            return res.status(403).json({ error: 'Your account is pending admin approval.' });
        }
        return next();
    }
    catch (error) {
        console.error('Error in requireApprovedTransporter middleware:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.requireApprovedTransporter = requireApprovedTransporter;
