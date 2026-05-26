"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.auth = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// Attempt to load from base64 env variable (good for production)
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (serviceAccountBase64) {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount)
    });
}
else {
    // Search for the local serviceAccountKey.json file
    const localKeyPaths = [
        path_1.default.join(process.cwd(), '..', 'scripts', 'serviceAccountKey.json'),
        path_1.default.join(process.cwd(), 'scripts', 'serviceAccountKey.json'),
        path_1.default.join(__dirname, '..', '..', 'scripts', 'serviceAccountKey.json'),
        path_1.default.join(__dirname, '..', '..', '..', 'scripts', 'serviceAccountKey.json')
    ];
    let loaded = false;
    for (const keyPath of localKeyPaths) {
        if (fs_1.default.existsSync(keyPath)) {
            try {
                const serviceAccount = JSON.parse(fs_1.default.readFileSync(keyPath, 'utf8'));
                firebase_admin_1.default.initializeApp({
                    credential: firebase_admin_1.default.credential.cert(serviceAccount)
                });
                console.log(`✅ Loaded Firebase service account key from ${keyPath}`);
                loaded = true;
                break;
            }
            catch (err) {
                console.error(`Error loading service account key from ${keyPath}:`, err);
            }
        }
    }
    if (!loaded) {
        console.warn("FIREBASE_SERVICE_ACCOUNT_BASE64 not found and local serviceAccountKey.json not found, falling back to default config. Authentication might fail.");
        firebase_admin_1.default.initializeApp();
    }
}
exports.auth = firebase_admin_1.default.auth();
exports.db = firebase_admin_1.default.firestore();
