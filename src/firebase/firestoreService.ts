// src/firebase/firestoreService.ts

import firestore from '@react-native-firebase/firestore';

export const createUserProfile = async (
  uid: string,
  data: any
) => {
  return await firestore()
    .collection('users')
    .doc(uid)
    .set(data);
};

export const getUserProfile = async (uid: string) => {
  const doc = await firestore()
    .collection('users')
    .doc(uid)
    .get();

  return doc.exists ? doc.data() : null;
};