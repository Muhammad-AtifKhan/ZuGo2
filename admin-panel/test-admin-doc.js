import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function checkDoc() {
  const docRef = doc(db, 'admins', 'zT8Tbs7RmghP2AZVYwvEjvBL7Zt1');
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log('Document data:', snap.data());
    } else {
      console.log('Document does not exist!');
    }
  } catch (err) {
    console.error('Error fetching document:', err);
  }
}

checkDoc().catch(console.error);
