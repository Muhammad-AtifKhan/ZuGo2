"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.transporterSignup = exports.passengerSignup = void 0;
const client_1 = require("@prisma/client");
const supabase_1 = require("../config/supabase");
const prisma = new client_1.PrismaClient();
const normalizeEmail = (email) => email.trim().toLowerCase();
const checkEmailExists = async (email) => {
    const normalized = normalizeEmail(email);
    const [passenger, transporter, driver, admin] = await Promise.all([
        prisma.passenger.findUnique({ where: { email: normalized }, select: { id: true } }),
        prisma.transporter.findUnique({ where: { email: normalized }, select: { id: true } }),
        prisma.driver.findUnique({ where: { email: normalized }, select: { id: true } }),
        prisma.admin.findUnique({ where: { email: normalized }, select: { id: true } }),
    ]);
    return Boolean(passenger || transporter || driver || admin);
};
const passengerSignup = async (req, res) => {
    let createdAuthUserId = null;
    try {
        const { email, password, name, phone } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }
        const normalizedEmail = normalizeEmail(email);
        if (await checkEmailExists(normalizedEmail)) {
            return res.status(400).json({ error: 'Email is already registered' });
        }
        const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: {
                role: 'passenger',
                name: name.trim(),
                phone: phone ? phone.trim() : null,
            },
        });
        if (authError || !authData.user) {
            return res.status(400).json({ error: authError?.message || 'Failed to create auth user' });
        }
        createdAuthUserId = authData.user.id;
        const passenger = await prisma.passenger.create({
            data: {
                id: authData.user.id,
                email: normalizedEmail,
                passwordHash: '',
                name: name.trim(),
                phone: phone ? phone.trim() : null,
            },
        });
        const { passwordHash: _, ...profile } = passenger;
        return res.status(201).json({
            message: 'Passenger registered successfully',
            user: { ...profile, role: 'passenger' },
        });
    }
    catch (error) {
        console.error('Error in passengerSignup:', error);
        if (createdAuthUserId) {
            await supabase_1.supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.passengerSignup = passengerSignup;
const transporterSignup = async (req, res) => {
    let createdAuthUserId = null;
    try {
        const { email, password, companyName, contactPerson, phone, businessAddress, taxNumber, } = req.body;
        if (!email || !password || !companyName || !contactPerson) {
            return res.status(400).json({ error: 'Email, password, company name, and contact person are required' });
        }
        const normalizedEmail = normalizeEmail(email);
        if (await checkEmailExists(normalizedEmail)) {
            return res.status(400).json({ error: 'Email is already registered' });
        }
        const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: {
                role: 'transporter',
                companyName: companyName.trim(),
                contactPerson: contactPerson.trim(),
                phone: phone ? phone.trim() : null,
            },
        });
        if (authError || !authData.user) {
            return res.status(400).json({ error: authError?.message || 'Failed to create auth user' });
        }
        createdAuthUserId = authData.user.id;
        const transporter = await prisma.transporter.create({
            data: {
                id: authData.user.id,
                email: normalizedEmail,
                passwordHash: '',
                companyName: companyName.trim(),
                contactPerson: contactPerson.trim(),
                phone: phone ? phone.trim() : null,
                businessAddress: businessAddress ? businessAddress.trim() : null,
                taxNumber: taxNumber ? taxNumber.trim().toUpperCase() : null,
                isApproved: false,
            },
        });
        const { passwordHash: _, ...profile } = transporter;
        return res.status(201).json({
            message: 'Transporter registered successfully. Pending verification.',
            user: { ...profile, role: 'transporter' },
        });
    }
    catch (error) {
        console.error('Error in transporterSignup:', error);
        if (createdAuthUserId) {
            await supabase_1.supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.transporterSignup = transporterSignup;
const login = async (_req, res) => {
    return res.status(410).json({
        error: 'This endpoint has been replaced by Supabase Auth. Use supabase.auth.signInWithPassword on the client.',
    });
};
exports.login = login;
