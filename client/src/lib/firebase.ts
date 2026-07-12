import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, Auth } from "firebase/auth";
import { isNative } from "./platform";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "123456789", // This can be a placeholder for web apps
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const isFirebaseConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

if (!isFirebaseConfigValid) {
  console.warn('Firebase configuration is incomplete. Google authentication will not work.');
  console.warn('Missing values:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    hasAppId: !!firebaseConfig.appId
  });
}

// Initialize Firebase app only if it hasn't been initialized and config is valid
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

    // Configure Google provider
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    });

    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export { auth, googleProvider };

export type NativeGoogleAuthResult = {
  email: string;
  displayName: string;
  photoURL: string | null;
  uid: string;
  idToken: string | null;
};

/**
 * Native Google sign-in. Uses @capacitor-firebase/authentication so the user
 * sees the system Google account picker (App Store policy compliant). The
 * caller is expected to forward the returned profile to /api/auth/mobile/google
 * to obtain JWT tokens, since Capacitor WebView cookies are unreliable.
 *
 * The plugin is loaded lazily so the web bundle never tries to import the
 * native bridge code.
 */
export async function signInWithGoogleNative(): Promise<NativeGoogleAuthResult> {
  if (!isNative) {
    throw new Error('signInWithGoogleNative called on non-native platform');
  }
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  const result = await FirebaseAuthentication.signInWithGoogle();
  const user = result.user;
  if (!user || !user.email) {
    throw new Error('Google sign-in did not return an email address');
  }
  return {
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoUrl ?? null,
    uid: user.uid,
    idToken: result.credential?.idToken ?? null,
  };
}

/**
 * Web Google sign-in via a full-page redirect (not a popup). Popup-based
 * signInWithPopup was silently failing in production: Chrome's
 * Cross-Origin-Opener-Policy handling breaks the popup-completion signal
 * Firebase relies on (window.closed polling + the postMessage handshake
 * with the google.com popup both stopped getting through), so
 * onAuthStateChanged never fired and /api/auth/google was never called —
 * no error, no toast, just a dead end back on the login page. Redirect
 * sidesteps the popup/COOP interaction entirely.
 *
 * This navigates the browser away, so this function does not "return" in
 * the normal sense. On the way back, use-auth.tsx calls
 * getGoogleRedirectResult() (a thin wrapper over Firebase's
 * getRedirectResult) to pick up the completed sign-in.
 */
export const signInWithGoogle = async (): Promise<void> => {
  if (isNative) {
    throw new Error('Use signInWithGoogleNative on native platforms');
  }
  if (!auth || !googleProvider) {
    throw new Error('Firebase not properly configured');
  }
  await signInWithRedirect(auth, googleProvider);
};

/**
 * Call once on app init to pick up a just-completed signInWithRedirect.
 * Resolves to null on every normal page load that isn't returning from a
 * redirect sign-in.
 */
export const getGoogleRedirectResult = async () => {
  if (!auth) return null;
  return getRedirectResult(auth);
};

export const signOutUser = async () => {
  if (isNative) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut();
    } catch (e) {
      console.warn('Native Firebase signOut failed (continuing):', e);
    }
  }
  if (!auth) {
    return;
  }
  return signOut(auth);
};
