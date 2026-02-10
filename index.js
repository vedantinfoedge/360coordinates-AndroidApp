/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
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

// Register background message handler (must be called before AppRegistry)
// This handles notifications when app is in background or quit state
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[Notifications] Message handled in background:', remoteMessage);
  // Background messages are handled here - no UI updates needed
});

AppRegistry.registerComponent(appName, () => App);
