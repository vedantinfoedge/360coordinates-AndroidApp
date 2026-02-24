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

// Firebase background message handler - required for receiving push when app is in background/quit
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[Notifications] Background message received:', remoteMessage?.messageId);
  });
} catch (e) {
  console.warn('[Notifications] Firebase Messaging background handler:', e?.message || e);
}

AppRegistry.registerComponent(appName, () => App);
