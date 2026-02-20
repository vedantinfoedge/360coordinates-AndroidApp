/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// DEBUG: Log any JS exception before it propagates (helps isolate Buyer→Seller crash)
try {
  const ErrorUtils = global.ErrorUtils;
  if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function' && __DEV__) {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error('[DEBUG CRASH] JS exception:', isFatal ? 'FATAL' : 'non-fatal', error?.message, error?.stack);
      originalHandler(error, isFatal);
    });
  }
} catch (e) {
  // ignore if ErrorUtils not available
}

// Firebase background message handler disabled to prevent startup crash.
// Re-enable after verifying Firebase config (google-services.json package_name matches applicationId).
// try {
//   const messaging = require('@react-native-firebase/messaging').default;
//   messaging().setBackgroundMessageHandler(async remoteMessage => {});
// } catch (e) { console.warn('[Notifications] Firebase Messaging:', e?.message); }

AppRegistry.registerComponent(appName, () => App);
