import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth } from "firebase/auth";
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
      display: 'popup'
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
  };
}

export const signInWithGoogle = async () => {
  // Web (and any non-native context) uses the Firebase JS popup. Native
  // platforms must use the Capacitor plugin via signInWithGoogleNative.
  if (isNative) {
    throw new Error('Use signInWithGoogleNative on native platforms');
  }
  if (!auth || !googleProvider) {
    throw new Error('Firebase not properly configured');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  }
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
