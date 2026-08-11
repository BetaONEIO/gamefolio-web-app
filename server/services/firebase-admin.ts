import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  if (adminApp) return adminApp;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('VITE_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID is required for Firebase Admin');
  }

  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  // If a service account JSON is provided, use it. Otherwise fall back to
  // Application Default Credentials (works on GCP / Cloud Run) or the
  // projectId-only mode that can verify tokens without write access.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  } else {
    adminApp = admin.initializeApp({ projectId });
  }

  return adminApp;
}

export interface FirebaseTokenClaims {
  uid: string;
  email: string | undefined;
  email_verified: boolean;
  name: string | undefined;
  picture: string | undefined;
}

/**
 * Verify a Firebase ID token and return the decoded claims.
 * Throws if the token is invalid, expired, or the project ID doesn't match.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseTokenClaims> {
  const app = getAdminApp();
  const decoded = await app.auth().verifyIdToken(idToken, true);
  return {
    uid: decoded.uid,
    email: decoded.email,
    email_verified: decoded.email_verified ?? false,
    name: decoded.name as string | undefined,
    picture: decoded.picture as string | undefined,
  };
}
