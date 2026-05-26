import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
const db = getFirestore(app);

async function createAdmin() {
  const uid = 'zT8Tbs7RmghP2AZVYwvEjvBL7Zt1';
  const docRef = doc(db, 'admins', uid);
  
  const adminData = {
    email: 'atifkhanniazi181@gmail.com',
    permissions: ['all'],
    role: 'super_admin',
    status: 'active',
    AddedAt: serverTimestamp()
  };

  try {
    await setDoc(docRef, adminData);
    console.log(`Successfully created admin document for UID: ${uid}`);
  } catch (err) {
    console.error('Error creating admin document:', err);
  }
}

createAdmin().catch(console.error);
