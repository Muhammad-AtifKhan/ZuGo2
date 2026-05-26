/**
 * Dual-write helpers: keep role-specific collections in sync with `users`.
 * - Driver: `drivers` + `users`
 * - Passenger: `passengers` + `users`
 */
import firestore from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { DriverStatus } from '../types/driver.types';

export type DriverProfileInput = {
  fullName: string;
  contactNumber: string;
  email: string;
  cnic: string;
  cnicFormatted?: string;
  licenseNumber: string;
  licenseType: 'light' | 'heavy' | 'both';
  licenseExpiry: string | null;
  isLicenseExpired: boolean;
  address: string;
  emergencyContact: string;
  joiningDate: string;
  salary: number;
  employmentType: 'fulltime' | 'parttime' | 'contract';
  experienceYears: number;
  status: DriverStatus | string;
  searchKeywords?: string[];
};

export type PassengerProfileInput = {
  fullName: string;
  email: string;
  phone: string;
};

/** Write new driver to `drivers` and `users` in the same batch. */
export function addDriverToBatch(
  batch: FirebaseFirestoreTypes.WriteBatch,
  driverUID: string,
  transporterId: string,
  data: DriverProfileInput
): void {
  const ts = firestore.FieldValue.serverTimestamp();

  batch.set(firestore().collection('drivers').doc(driverUID), {
    fullName: data.fullName,
    contactNumber: data.contactNumber,
    email: data.email,
    cnic: data.cnic,
    cnicFormatted: data.cnicFormatted ?? data.cnic,
    licenseNumber: data.licenseNumber,
    licenseType: data.licenseType,
    licenseExpiry: data.licenseExpiry,
    isLicenseExpired: data.isLicenseExpired,
    address: data.address,
    emergencyContact: data.emergencyContact,
    joiningDate: data.joiningDate,
    salary: data.salary,
    employmentType: data.employmentType,
    experienceYears: data.experienceYears,
    status: data.status,
    currentTripId: null,
    uid: driverUID,
    transporterId,
    role: 'driver',
    isDeleted: false,
    verified: true,
    searchKeywords: data.searchKeywords ?? [],
    createdAt: ts,
    updatedAt: ts,
  });

  batch.set(firestore().collection('users').doc(driverUID), {
    uid: driverUID,
    id: driverUID,
    fullName: data.fullName,
    email: data.email,
    phone: data.contactNumber,
    userType: 'driver',
    role: 'driver',
    transporterId,
    status: data.status,
    isDeleted: false,
    verified: true,
    profileComplete: true,
    createdAt: ts,
    updatedAt: ts,
  });
}

/** Update existing driver in both `drivers` and `users`. */
export function updateDriverInBatch(
  batch: FirebaseFirestoreTypes.WriteBatch,
  driverId: string,
  transporterId: string,
  data: DriverProfileInput
): void {
  const ts = firestore.FieldValue.serverTimestamp();

  batch.update(firestore().collection('drivers').doc(driverId), {
    fullName: data.fullName,
    contactNumber: data.contactNumber,
    email: data.email,
    cnic: data.cnic,
    cnicFormatted: data.cnicFormatted ?? data.cnic,
    licenseNumber: data.licenseNumber,
    licenseType: data.licenseType,
    licenseExpiry: data.licenseExpiry,
    isLicenseExpired: data.isLicenseExpired,
    address: data.address,
    emergencyContact: data.emergencyContact,
    joiningDate: data.joiningDate,
    salary: data.salary,
    employmentType: data.employmentType,
    experienceYears: data.experienceYears,
    status: data.status,
    searchKeywords: data.searchKeywords ?? [],
    updatedAt: ts,
  });

  batch.set(
    firestore().collection('users').doc(driverId),
    {
      uid: driverId,
      id: driverId,
      fullName: data.fullName,
      email: data.email,
      phone: data.contactNumber,
      userType: 'driver',
      role: 'driver',
      transporterId,
      status: data.status,
      isDeleted: false,
      updatedAt: ts,
    },
    { merge: true }
  );
}

/** Write new passenger to `passengers` and `users` in the same batch. */
export function addPassengerToBatch(
  batch: FirebaseFirestoreTypes.WriteBatch,
  userId: string,
  data: PassengerProfileInput
): void {
  const ts = firestore.FieldValue.serverTimestamp();
  const common = {
    uid: userId,
    id: userId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    createdAt: ts,
    updatedAt: ts,
  };

  batch.set(firestore().collection('users').doc(userId), {
    ...common,
    userType: 'passenger',
    role: 'passenger',
    emailVerified: false,
    profileComplete: true,
    status: 'pending_email_verification',
    isActive: true,
  });

  batch.set(firestore().collection('passengers').doc(userId), {
    ...common,
    passengerId: userId,
    userType: 'passenger',
    totalBookings: 0,
    totalSpent: 0,
    rating: 0,
    totalRatings: 0,
    savedAddresses: [],
    preferences: {
      notifications: true,
      language: 'en',
    },
    isEmailVerified: false,
    isActive: true,
    status: 'pending',
  });
}

/** Commit dual-write for a new driver (optional extra batch ops e.g. credentials). */
export async function createDriverInBothCollections(
  driverUID: string,
  transporterId: string,
  data: DriverProfileInput,
  extraBatch?: (batch: FirebaseFirestoreTypes.WriteBatch) => void
): Promise<void> {
  const batch = firestore().batch();
  addDriverToBatch(batch, driverUID, transporterId, data);
  extraBatch?.(batch);
  await batch.commit();
}

/** Commit dual-write for a new passenger. */
export async function createPassengerInBothCollections(
  userId: string,
  data: PassengerProfileInput
): Promise<void> {
  const batch = firestore().batch();
  addPassengerToBatch(batch, userId, data);
  await batch.commit();
}
