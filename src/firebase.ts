import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Universal env helper safe for both Vite and Node/SSR
const getEnvVar = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process?.env?.[key]) {
      return process.env[key]!;
    }
  } catch (e) {}
  return fallback;
};

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY", "AIzaSyD2Me6IJ6qgB8A0ekcU9RZZESzQH_a0Tnk"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN", "keepr-68451.firebaseapp.com"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID", "keepr-68451"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET", "keepr-68451.firebasestorage.app"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID", "634305282435"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID", "1:634305282435:web:4c6ea0f750a35a3b4f76b6"),
  measurementId: getEnvVar("VITE_FIREBASE_MEASUREMENT_ID", "G-986N65Y7JV")
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Analytics optional initialization (safe for SSR / environments without window)
export let analytics: ReturnType<typeof getAnalytics> | null = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((err) => {
    console.warn("Firebase Analytics not supported in this environment:", err);
  });
}
