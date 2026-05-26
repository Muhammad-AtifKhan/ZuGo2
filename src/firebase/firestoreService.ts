// src/firebase/firestoreService.ts

import firestore from '@react-native-firebase/firestore';

/** @deprecated Prefer profileCollectionsService for role-specific dual writes */
export const createUserProfile = async (uid: string, data: any) => {
  return await firestore().collection('users').doc(uid).set(data);
};

export {
  createPassengerInBothCollections,
  createDriverInBothCollections,
  addPassengerToBatch,
  addDriverToBatch,
} from '../services/profileCollectionsService';

export const getUserProfile = async (uid: string) => {
  const doc = await firestore()
    .collection('users')
    .doc(uid)
    .get();

  return doc.exists ? doc.data() : null;
};