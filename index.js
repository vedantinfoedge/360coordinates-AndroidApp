/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background message handler (must be called before AppRegistry)
// This handles notifications when app is in background or quit state
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[Notifications] Message handled in background:', remoteMessage);
  // Background messages are handled here - no UI updates needed
});

AppRegistry.registerComponent(appName, () => App);
