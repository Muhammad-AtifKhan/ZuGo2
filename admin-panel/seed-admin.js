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

// ========================================================
// CHANGE THESE VALUES IF YOU WANT TO ADD ANOTHER ADMIN
// ========================================================
const ADMIN_UID = 'zT8Tbs7RmghP2AZVYwvEjvBL7Zt1';
const ADMIN_EMAIL = 'atifkhanniazi181@gmail.com';

async function seedAdmin() {
  console.log(`Starting admin seeding for UID: ${ADMIN_UID}`);
  const docRef = doc(db, 'admins', ADMIN_UID);
  
  const adminData = {
    email: ADMIN_EMAIL,
    permissions: ['all'],
    role: 'super_admin',
    status: 'active',
    AddedAt: serverTimestamp()
  };

  try {
    // Note: This requires the Firestore rules to allow writes, 
    // OR it requires running with Firebase Admin SDK credentials.
    // Since this is a client SDK script, make sure your firestore.rules
    // temporarily allow writes, or run this once and revert rules.
    await setDoc(docRef, adminData);
    console.log(`\n✅ Success! Super admin document created perfectly for ${ADMIN_EMAIL}.`);
    console.log(`You can now log into the Admin Panel.\n`);
  } catch (err) {
    console.error('\n❌ Error creating admin document:', err);
    console.log('If you see "Missing or insufficient permissions", please temporarily change your firestore.rules to `allow write: if true;` for the admins collection, run this script, and then change it back to `allow write: if false;`.\n');
  }
}

seedAdmin().catch(console.error);
