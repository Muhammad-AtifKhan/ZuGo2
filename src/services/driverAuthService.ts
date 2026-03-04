import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import { secondaryFirebaseConfig } from '../config/firebaseSecondaryConfig';

export const createDriverWithSecondaryApp = async (
  email: string,
  password: string,
  displayName?: string
) => {
  let secondaryApp;

  try {
    // 1️⃣ Initialize or reuse secondary app
    const existingApp = firebase.apps.find(
      app => app.name === 'SecondaryApp'
    );

    secondaryApp = existingApp
      ? existingApp
      : await firebase.initializeApp(
          secondaryFirebaseConfig,
          'SecondaryApp'
        );

    const secondaryAuth = auth(secondaryApp);

    // 2️⃣ Create driver account
    const userCredential =
      await secondaryAuth.createUserWithEmailAndPassword(
        email.trim().toLowerCase(),
        password
      );

    const newUser = userCredential.user;

    // 3️⃣ Update display name (optional)
    if (displayName) {
      await newUser.updateProfile({
        displayName,
      });
    }

    // 4️⃣ 🚀 SEND EMAIL VERIFICATION (THIS WAS MISSING)
    await newUser.sendEmailVerification();

    // 5️⃣ Reload user
    await newUser.reload();

    const driverUID = newUser.uid;

    // 6️⃣ Sign out secondary auth
    await secondaryAuth.signOut();

    // 7️⃣ Delete secondary app instance
    await secondaryApp.delete();

    return driverUID;

  } catch (error) {
    console.log('❌ Secondary app error:', error);

    if (secondaryApp) {
      await secondaryApp.delete();
    }

    throw error;
  }
};