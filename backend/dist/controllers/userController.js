"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProfile = exports.updateProfile = exports.getProfile = exports.syncUser = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Sync user fallback stub
const syncUser = async (req, res) => {
    try {
        const userId = req.user.uid;
        const role = req.user.role;
        const { email, phone, name } = req.body;
        let user = null;
        if (role === 'passenger') {
            user = await prisma.passenger.upsert({
                where: { id: userId },
                update: { email, phone, name },
                create: { id: userId, email, passwordHash: '', name, phone }
            });
        }
        else if (role === 'transporter') {
            user = await prisma.transporter.upsert({
                where: { id: userId },
                update: { phone, companyName: name, contactPerson: name },
                create: { id: userId, email, passwordHash: '', companyName: name, contactPerson: name, phone }
            });
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error('Error syncing user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.syncUser = syncUser;
// Get current user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.uid;
        const role = req.user.role;
        let user = null;
        if (role === 'passenger') {
            user = await prisma.passenger.findUnique({
                where: { id: userId },
                include: {
                    _count: {
                        select: { bookings: true }
                    }
                }
            });
        }
        else if (role === 'transporter') {
            user = await prisma.transporter.findUnique({
                where: { id: userId }
            });
        }
        else if (role === 'driver') {
            user = await prisma.driver.findUnique({
                where: { id: userId }
            });
        }
        else if (role === 'admin') {
            user = await prisma.admin.findUnique({
                where: { id: userId }
            });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found in database.' });
        }
        const { passwordHash: _, ...profile } = user;
        res.json({ ...profile, role });
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getProfile = getProfile;
// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.uid;
        const role = req.user.role;
        const { name, phone, dateOfBirth, profileImage, cnic, address, city, emergencyContact, specialNeeds, 
        // Transporter fields
        companyName, contactPerson, businessAddress, taxNumber } = req.body;
        let updatedUser = null;
        if (role === 'passenger') {
            updatedUser = await prisma.passenger.update({
                where: { id: userId },
                data: {
                    name,
                    phone,
                    dateOfBirth,
                    profileImage,
                    cnic,
                    address,
                    city,
                    emergencyContact,
                    specialNeeds
                }
            });
        }
        else if (role === 'transporter') {
            updatedUser = await prisma.transporter.update({
                where: { id: userId },
                data: {
                    companyName,
                    contactPerson,
                    phone,
                    businessAddress,
                    taxNumber
                }
            });
        }
        else if (role === 'driver') {
            updatedUser = await prisma.driver.update({
                where: { id: userId },
                data: {
                    name,
                    phone,
                    cnic,
                    address,
                    emergencyContact
                }
            });
        }
        if (!updatedUser) {
            return res.status(400).json({ error: 'Failed to update profile' });
        }
        const { passwordHash: _, ...profile } = updatedUser;
        res.json({ ...profile, role });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.updateProfile = updateProfile;
// Delete user account
const deleteProfile = async (req, res) => {
    try {
        const userId = req.user.uid;
        const role = req.user.role;
        if (role === 'passenger') {
            await prisma.passenger.delete({ where: { id: userId } });
        }
        else if (role === 'transporter') {
            await prisma.transporter.delete({ where: { id: userId } });
        }
        else if (role === 'driver') {
            await prisma.driver.delete({ where: { id: userId } });
        }
        res.json({ success: true, message: 'Account deleted' });
    }
    catch (error) {
        console.error('Error deleting profile:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.deleteProfile = deleteProfile;
