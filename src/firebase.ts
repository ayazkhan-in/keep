import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD2Me6IJ6qgB8A0ekcU9RZZESzQH_a0Tnk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "keepr-68451.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "keepr-68451",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "keepr-68451.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "634305282435",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:634305282435:web:4c6ea0f750a35a3b4f76b6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-986N65Y7JV"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
