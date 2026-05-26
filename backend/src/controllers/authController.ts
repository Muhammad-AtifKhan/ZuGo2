import prisma from '../lib/prisma';
import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { savePassengerToFirestore } from '../services/firestoreProfileService';


const normalizeEmail = (email: string) => email.trim().toLowerCase();

const checkEmailExists = async (email: string) => {
  const normalized = normalizeEmail(email);
  const [passenger, transporter, driver, admin] = await Promise.all([
    prisma.passenger.findUnique({ where: { email: normalized }, select: { id: true } }),
    prisma.transporter.findUnique({ where: { email: normalized }, select: { id: true } }),
    prisma.driver.findUnique({ where: { email: normalized }, select: { id: true } }),
    prisma.admin.findUnique({ where: { email: normalized }, select: { id: true } }),
  ]);

  return Boolean(passenger || transporter || driver || admin);
};

export const passengerSignup = async (req: Request, res: Response) => {
  let createdAuthUserId: string | null = null;

  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const normalizedEmail = normalizeEmail(email);

    if (await checkEmailExists(normalizedEmail)) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

    await savePassengerToFirestore({
      id: authData.user.id,
      fullName: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
    }).catch((firestoreErr) => {
      console.error('Firestore passenger dual-write failed:', firestoreErr);
    });

    const { passwordHash: _, ...profile } = passenger;
    return res.status(201).json({
      message: 'Passenger registered successfully',
      user: { ...profile, role: 'passenger' },
    });
  } catch (error) {
    console.error('Error in passengerSignup:', error);
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const transporterSignup = async (req: Request, res: Response) => {
  let createdAuthUserId: string | null = null;

  try {
    const {
      email,
      password,
      companyName,
      contactPerson,
      phone,
      businessAddress,
      taxNumber,
    } = req.body;

    if (!email || !password || !companyName || !contactPerson) {
      return res.status(400).json({ error: 'Email, password, company name, and contact person are required' });
    }

    const normalizedEmail = normalizeEmail(email);

    if (await checkEmailExists(normalizedEmail)) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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
  } catch (error) {
    console.error('Error in transporterSignup:', error);
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const login = async (_req: Request, res: Response) => {
  return res.status(410).json({
    error: 'This endpoint has been replaced by Supabase Auth. Use supabase.auth.signInWithPassword on the client.',
  });
};

