/**
 * Firebase Configuration
 * 
 * IMPORTANT: These are web app credentials from the backend report.
 * For Android app, you MUST:
 * 1. Create an Android app in Firebase Console
 * 2. Download google-services.json
 * 3. Place it in android/app/ directory
 * 4. The config below will be used for React Native Firebase initialization
 * 
 * Current config is from web frontend:
 * Project: my-chat-box-ec5b0
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBjD9KHuVjUNSvPpa6y-pElD7lIElCiXmE',
  authDomain: 'my-chat-box-ec5b0.firebaseapp.com',
  projectId: 'my-chat-box-ec5b0',
  storageBucket: 'my-chat-box-ec5b0.firebasestorage.app',
  messagingSenderId: '387721645160',
  appId: '1:387721645160:web:64f6ec464447b49ea6bfdd',
  measurementId: 'G-CLCBRJYNMN',
};

/**
 * Initialize Firebase (for React Native Firebase)
 * This should be called in App.tsx or index.js
 * 
 * Note: Firebase is initialized automatically via google-services.json for Android
 * and GoogleService-Info.plist for iOS. 
 * 
 * IMPORTANT: React Native Firebase auto-initializes from native config files.
 * No manual initialization is needed. This function is a no-op that exists for
 * compatibility. Firebase will be available when native modules are properly linked.
 */
export const initializeFirebase = (): void => {
  // React Native Firebase auto-initializes from google-services.json
  // No manual initialization needed - just verify the module can be imported
  // We don't actually call firestore() here to avoid triggering native module checks
  // that would cause errors if Firebase isn't properly linked yet
  
  // Silent initialization - Firebase will work when properly configured
  // The actual Firebase operations in firebase.service.ts will handle errors gracefully
  if (__DEV__) {
    console.log('[Firebase] Firebase will auto-initialize from native config files');
    console.log('[Firebase] Ensure google-services.json is in android/app/ for Android');
    console.log('[Firebase] Ensure GoogleService-Info.plist is in ios/ for iOS');
  }
};

