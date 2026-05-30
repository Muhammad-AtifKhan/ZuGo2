import firestore from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type UserType = 'passenger' | 'transporter' | 'driver' | 'admin';

export type AppUserProfile = {
  id: string;
  uid: string;
  email: string;
  role: string;
  userType: string;
  name: string;
  fullName?: string;
  phone?: string;
  transporterId?: string;
  isApproved?: boolean;
  isBlocked?: boolean;
  verified?: boolean;
  status?: string;
  [key: string]: any;
};

const normalizeUserType = (value: unknown): UserType | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'passenger' ||
    normalized === 'transporter' ||
    normalized === 'driver' ||
    normalized === 'admin'
  ) {
    return normalized;
  }
  return null;
};

/** Load login profile from users + role collection (drivers / passengers / transporters). */
export const loadUserProfileFromFirestore = async (
  firebaseUser: FirebaseAuthTypes.User,
): Promise<AppUserProfile | null> => {
  const uid = firebaseUser.uid;
  const userSnap = await firestore().collection('users').doc(uid).get();

  if (!(userSnap as any).exists) {
    return null;
  }

  const userData = userSnap.data() || {};
  const userType =
    normalizeUserType(userData.userType) ||
    normalizeUserType(userData.role) ||
    'passenger';

  const base: AppUserProfile = {
    id: uid,
    uid,
    email: (userData.email as string) || firebaseUser.email || '',
    role: userType,
    userType,
    name:
      (userData.fullName as string) ||
      (userData.name as string) ||
      firebaseUser.email ||
      'User',
    fullName: userData.fullName as string | undefined,
    phone: userData.phone as string | undefined,
    status: userData.status as string | undefined,
    verified: userData.verified as boolean | undefined,
    transporterId: userData.transporterId as string | undefined,
    isDeleted: userData.isDeleted as boolean | undefined,
    isBlocked: userData.isDeleted === true,
  };

  if (userType === 'driver') {
    const driverSnap = await firestore().collection('drivers').doc(uid).get();
    const driverData = (driverSnap as any).exists ? driverSnap.data() || {} : {};

    return {
      ...base,
      ...driverData,
      role: 'driver',
      userType: 'driver',
      name: (driverData.fullName as string) || base.name,
      fullName: (driverData.fullName as string) || base.fullName,
      email: (driverData.email as string) || base.email,
      transporterId:
        (driverData.transporterId as string) || base.transporterId,
      status: (driverData.status as string) || base.status,
      isBlocked:
        driverData.isDeleted === true || userData.isDeleted === true,
    };
  }

  if (userType === 'transporter') {
    const transporterSnap = await firestore()
      .collection('transporters')
      .doc(uid)
      .get();
    const transporterData = (transporterSnap as any).exists
      ? transporterSnap.data() || {}
      : {};

    return {
      ...base,
      ...transporterData,
      role: 'transporter',
      userType: 'transporter',
      name:
        (transporterData.companyName as string) ||
        (transporterData.contactPerson as string) ||
        base.name,
      fullName: transporterData.contactPerson as string | undefined,
      isApproved:
        transporterData.isApproved === true ||
        transporterData.verified === true,
      isBlocked: transporterData.isDeleted === true,
    };
  }

  if (userType === 'passenger') {
    const passengerSnap = await firestore()
      .collection('passengers')
      .doc(uid)
      .get();
    const passengerData = (passengerSnap as any).exists
      ? passengerSnap.data() || {}
      : {};

    return {
      ...base,
      ...passengerData,
      role: 'passenger',
      userType: 'passenger',
      name: (passengerData.fullName as string) || (passengerData.name as string) || base.name,
      fullName: (passengerData.fullName as string) || base.fullName,
      phone: (passengerData.phone as string) || base.phone,
      isBlocked: passengerData.isDeleted === true,
    };
  }

  return base;
};
