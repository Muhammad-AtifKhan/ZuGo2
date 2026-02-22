// src/firebase/authService.ts

import auth from '@react-native-firebase/auth';

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