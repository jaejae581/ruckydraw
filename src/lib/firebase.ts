
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfigInput = typeof __firebase_config !== 'undefined' 
  ? __firebase_config 
  : process.env.NEXT_PUBLIC_FIREBASE_CONFIG;

let firebaseConfig;

if (firebaseConfigInput) {
  try {
    firebaseConfig = typeof firebaseConfigInput === 'string'
      ? JSON.parse(firebaseConfigInput)
      : firebaseConfigInput;
  } catch (error) {
    console.error("Failed to parse Firebase config:", error);
  }
} else {
  console.error("Firebase config is missing.");
}

// Initialize Firebase
const app = !getApps().length && firebaseConfig ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';

export { app, auth, db, appId };
