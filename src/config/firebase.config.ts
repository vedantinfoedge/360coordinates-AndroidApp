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
 * and GoogleService-Info.plist for iOS. This function just logs initialization status.
 */
export const initializeFirebase = (): void => {
  try {
    // Firebase is initialized via google-services.json for Android
    // and GoogleService-Info.plist for iOS
    // No manual initialization needed if native modules are linked
    
    // The actual initialization happens via native modules
    // This function just logs that we're checking for Firebase
    console.log('Firebase initialization check - native modules will handle initialization');
  } catch (error) {
    // Firebase not installed or not configured - app will continue without it
    console.warn('Firebase not available (app will continue without Firebase):', error);
  }
};

