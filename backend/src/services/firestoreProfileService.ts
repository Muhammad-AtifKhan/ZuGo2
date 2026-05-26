import admin from 'firebase-admin';
import { db } from '../config/firebase';

const ts = () => admin.firestore.FieldValue.serverTimestamp();

export type DriverFirestoreInput = {
  id: string;
  transporterId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  cnic?: string | null;
  licenseNumber?: string | null;
  licenseType?: string;
  licenseExpiry?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  joiningDate?: string | null;
  salary?: number;
  employmentType?: string;
  experienceYears?: number;
  status?: string;
};

/** Save driver profile to both `drivers` and `users` collections. */
export async function saveDriverToFirestore(input: DriverFirestoreInput): Promise<void> {
  const batch = db.batch();
  const status = input.status || 'available';

  batch.set(db.collection('drivers').doc(input.id), {
    uid: input.id,
    fullName: input.fullName,
    contactNumber: input.phone ?? '',
    email: input.email,
    cnic: input.cnic ?? '',
    licenseNumber: input.licenseNumber ?? '',
    licenseType: input.licenseType ?? 'heavy',
    licenseExpiry: input.licenseExpiry ?? null,
    address: input.address ?? '',
    emergencyContact: input.emergencyContact ?? '',
    joiningDate: input.joiningDate ?? new Date().toISOString().split('T')[0],
    salary: input.salary ?? 0,
    employmentType: input.employmentType ?? 'fulltime',
    experienceYears: input.experienceYears ?? 0,
    status,
    currentTripId: null,
    transporterId: input.transporterId,
    role: 'driver',
    isDeleted: false,
    verified: true,
    createdAt: ts(),
    updatedAt: ts(),
  });

  batch.set(db.collection('users').doc(input.id), {
    uid: input.id,
    id: input.id,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? '',
    userType: 'driver',
    role: 'driver',
    transporterId: input.transporterId,
    status,
    isDeleted: false,
    verified: true,
    profileComplete: true,
    createdAt: ts(),
    updatedAt: ts(),
  });

  await batch.commit();
}

export type PassengerFirestoreInput = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
};

/** Save passenger profile to both `passengers` and `users` collections. */
export async function savePassengerToFirestore(input: PassengerFirestoreInput): Promise<void> {
  const batch = db.batch();
  const phone = input.phone?.trim() ?? '';

  const common = {
    uid: input.id,
    id: input.id,
    fullName: input.fullName.trim(),
    email: input.email,
    phone,
    createdAt: ts(),
    updatedAt: ts(),
  };

  batch.set(db.collection('users').doc(input.id), {
    ...common,
    userType: 'passenger',
    role: 'passenger',
    emailVerified: false,
    profileComplete: true,
    status: 'pending_email_verification',
    isActive: true,
  });

  batch.set(db.collection('passengers').doc(input.id), {
    ...common,
    passengerId: input.id,
    userType: 'passenger',
    totalBookings: 0,
    totalSpent: 0,
    rating: 0,
    totalRatings: 0,
    savedAddresses: [],
    preferences: { notifications: true, language: 'en' },
    isEmailVerified: false,
    isActive: true,
    status: 'pending',
  });

  await batch.commit();
}
