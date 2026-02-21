import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : undefined;

const app = initializeApp(
  serviceAccount
    ? { credential: cert(serviceAccount as ServiceAccount) }
    : { projectId: process.env.FIREBASE_PROJECT_ID }
);

export const adminAuth = getAuth(app);
export const db = getFirestore(app);

// Collection references
export const SESSIONS_COLLECTION = "forge_sessions";
export const USERS_COLLECTION = "forge_users";
export const CONNECTED_MCPS_COLLECTION = "forge_connected_mcps";
