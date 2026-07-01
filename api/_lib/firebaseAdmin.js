import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY env var is not set');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: ${err.message}`,
    );
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

let db;

// Lazily initialized so a missing/invalid env var surfaces as a normal
// caught error inside a request handler, instead of crashing the whole
// serverless function at module-load time (Vercel FUNCTION_INVOCATION_FAILED).
export function getAdminDb() {
  if (!db) db = getFirestore(getAdminApp());
  return db;
}
