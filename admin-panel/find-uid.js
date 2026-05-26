import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

async function findUserUID() {
  const email = "atifkhanniazi181@gmail.com";
  console.log('Querying users collection for email:', email);
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log('No user found in "users" collection with this email.');
    } else {
      snapshot.forEach(doc => {
        console.log('Found UID:', doc.id);
        console.log('User Data:', doc.data());
      });
    }
  } catch (err) {
    console.error('Error querying users collection:', err);
  }
}

findUserUID().catch(console.error);
