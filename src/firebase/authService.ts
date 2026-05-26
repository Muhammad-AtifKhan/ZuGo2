// src/firebase/authService.ts

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export const loginUser = async (email: string, password: string) => {
  return await auth().signInWithEmailAndPassword(email, password);
};

export const registerUser = async (email: string, password: string) => {
  return await auth().createUserWithEmailAndPassword(email, password);
};

export const logoutUser = async () => {
  return await auth().signOut();
};

export const getCurrentUser = () => {
  return auth().currentUser;
};

// ✅ Send email verification
export const sendEmailVerification = async () => {
  const user = auth().currentUser;
  if (user) {
    await user.sendEmailVerification();
    return true;
  }
  return false;
};

// ✅ Reload user to get latest email verification status
export const reloadUser = async () => {
  const user = auth().currentUser;
  if (user) {
    await user.reload();
    return user;
  }
  return null;
};

// ✅ Check if email is verified
export const isEmailVerified = () => {
  const user = auth().currentUser;
  return user ? user.emailVerified : false;
};

// ✅ Send password reset email
export const sendPasswordResetEmail = async (email: string) => {
  return await auth().sendPasswordResetEmail(email);
};

// ✅ Check transporter admin verification status
export const getTransporterVerificationStatus = async (userId: string) => {
  try {
    const transporterDoc = await firestore()
      .collection('transporters')
      .doc(userId)
      .get();

    if (transporterDoc.exists) {
      return {
        isVerified: transporterDoc.data()?.isVerified === true,
        status: transporterDoc.data()?.status || 'pending',
      };
    }
    return { isVerified: false, status: 'not_found' };
  } catch (error) {
    console.error('Error fetching transporter status:', error);
    return { isVerified: false, status: 'error' };
  }
};

// ✅ Check if user can access app (based on role and verifications)
export const canAccessApp = async (userId: string, userType: string) => {
  const user = auth().currentUser;
  if (!user) return false;

  await user.reload();
  const emailVerified = user.emailVerified;

  if (!emailVerified) return false;

  if (userType === 'transporter') {
    const { isVerified } = await getTransporterVerificationStatus(userId);
    return isVerified;
  }

  return true;
};