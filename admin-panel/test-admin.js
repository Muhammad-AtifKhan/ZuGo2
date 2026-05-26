import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';

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

async function checkAdmin() {
  const email = "atifkhanniazi181@gmail.com";
  console.log('Querying for email:', email);
  
  const adminsRef = collection(db, 'admins');
  const q = query(adminsRef, where('email', '==', email));
  
  const snapshot = await getDocs(q);
  console.log('Found documents by query:', snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });

  const docRef = doc(db, 'admins', '3tBTVGaP4VYURi2rLgiE');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log('Document by ID 3tBTVGaP4VYURi2rLgiE exists:', docSnap.data());
  } else {
    console.log('Document by ID 3tBTVGaP4VYURi2rLgiE does not exist!');
  }
}

checkAdmin().catch(console.error);
