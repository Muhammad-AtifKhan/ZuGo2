import prisma from '../lib/prisma';
import { Request, Response } from 'express';
import { db } from '../config/firebase';


const resolveFcmCollection = (
  role: string | undefined,
  collection?: string,
): string => {
  if (collection === 'drivers' || collection === 'users') {
    return collection;
  }
  return role === 'driver' ? 'drivers' : 'users';
};

// Save push token via Admin SDK (Supabase auth — no client Firestore write)
export const saveFcmToken = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const role = (req as any).user.role;
    const { token, collection } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    const collectionName = resolveFcmCollection(role, collection);
    await db
      .collection(collectionName)
      .doc(userId)
      .set({ fcmToken: token }, { merge: true });

    res.json({ success: true, collection: collectionName });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
};

// Sync user fallback stub
export const syncUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const role = (req as any).user.role;
    const { email, phone, name } = req.body;

    let user: any = null;
    if (role === 'passenger') {
      user = await prisma.passenger.upsert({
        where: { id: userId },
        update: { email, phone, name },
        create: { id: userId, email, passwordHash: '', name, phone }
      });
    } else if (role === 'transporter') {
      user = await prisma.transporter.upsert({
        where: { id: userId },
        update: { phone, companyName: name, contactPerson: name },
        create: { id: userId, email, passwordHash: '', companyName: name, contactPerson: name, phone }
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const role = (req as any).user.role;

    let user: any = null;
    if (role === 'passenger') {
      user = await prisma.passenger.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: { bookings: true }
          }
        }
      });
    } else if (role === 'transporter') {
      user = await prisma.transporter.findUnique({
        where: { id: userId }
      });
    } else if (role === 'driver') {
      user = await prisma.driver.findUnique({
        where: { id: userId }
      });
    } else if (role === 'admin') {
      user = await prisma.admin.findUnique({
        where: { id: userId }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    const { passwordHash: _, ...profile } = user;
    res.json({ ...profile, role });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const role = (req as any).user.role;
    const {
      name,
      phone,
      dateOfBirth,
      profileImage,
      cnic,
      address,
      city,
      emergencyContact,
      specialNeeds,
      // Transporter fields
      companyName,
      contactPerson,
      businessAddress,
      taxNumber
    } = req.body;

    let updatedUser: any = null;

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
    } else if (role === 'transporter') {
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
    } else if (role === 'driver') {
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
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete user account
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const role = (req as any).user.role;

    if (role === 'passenger') {
      await prisma.passenger.delete({ where: { id: userId } });
    } else if (role === 'transporter') {
      await prisma.transporter.delete({ where: { id: userId } });
    } else if (role === 'driver') {
      await prisma.driver.delete({ where: { id: userId } });
    }

    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

