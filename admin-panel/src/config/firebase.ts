import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA3AgzNoHpce8xqgT2bpgsV6pTlrMS430w",
  authDomain: "zugo2-2d31a.firebaseapp.com",
  projectId: "zugo2-2d31a",
  storageBucket: "zugo2-2d31a.firebasestorage.app",
  messagingSenderId: "419013259294",
  appId: "1:419013259294:android:338ca803b9f6332bbe3e0f",
  databaseURL: "https://zugo2-2d31a-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
