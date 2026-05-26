import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Attempt to load from base64 env variable (good for production)
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (serviceAccountBase64) {
  const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Search for the local serviceAccountKey.json file
  const localKeyPaths = [
    path.join(process.cwd(), '..', 'scripts', 'serviceAccountKey.json'),
    path.join(process.cwd(), 'scripts', 'serviceAccountKey.json'),
    path.join(__dirname, '..', '..', 'scripts', 'serviceAccountKey.json'),
    path.join(__dirname, '..', '..', '..', 'scripts', 'serviceAccountKey.json')
  ];

  let loaded = false;
  for (const keyPath of localKeyPaths) {
    if (fs.existsSync(keyPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log(`✅ Loaded Firebase service account key from ${keyPath}`);
        loaded = true;
        break;
      } catch (err) {
        console.error(`Error loading service account key from ${keyPath}:`, err);
      }
    }
  }

  if (!loaded) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_BASE64 not found and local serviceAccountKey.json not found, falling back to default config. Authentication might fail.");
    admin.initializeApp();
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
