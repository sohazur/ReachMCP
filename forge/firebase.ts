import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  increment,
} from "firebase/firestore";

// ── Firebase Web SDK config (no service account needed) ────────
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Re-export Firestore helpers for use in index.ts
export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  firestoreLimit,
  serverTimestamp,
  increment,
};

// Collection names
export const SESSIONS_COLLECTION = "forge_sessions";
export const USERS_COLLECTION = "forge_users";
export const CONNECTED_MCPS_COLLECTION = "forge_connected_mcps";
