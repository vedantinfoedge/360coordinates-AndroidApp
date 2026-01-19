/**
 * PropertyApp - Real Estate Listing App
 * React Native Android Application
 *
 * @format
 */

import React, {useEffect} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {AuthProvider} from './src/context/AuthContext';
import {NotificationProvider, useNotification} from './src/contexts/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import {initializeMapbox} from './src/config/mapbox.config';
import {initializeFirebase} from './src/config/firebase.config';
import {initializeMSG91} from './src/config/msg91.config';
import {notificationService} from './src/services/notification.service';

// Inner component to access notification context
const AppContent: React.FC = () => {
  const {showNotification} = useNotification();

  useEffect(() => {
    // Connect notification service to custom notification system
    notificationService.setShowNotificationCallback(showNotification);

    // Initialize Mapbox on app start (will fail gracefully if not linked)
    try {
      initializeMapbox();
    } catch (error) {
      console.warn('Mapbox initialization failed (app will continue without maps):', error);
    }

    // Initialize Firebase on app start (will fail gracefully if not configured)
    try {
      initializeFirebase();
    } catch (error) {
      console.warn('Firebase initialization failed (app will continue without Firebase):', error);
    }

    // Initialize MSG91 OTP Widget on app start (will fail gracefully if not configured)
    try {
      initializeMSG91();
    } catch (error) {
      console.warn('MSG91 initialization failed (app will continue without MSG91):', error);
    }

    // Initialize push notifications (will fail gracefully if not configured)
    try {
      notificationService.initialize();
      notificationService.createNotificationChannel();
      // Request permission and get FCM token
      notificationService.requestPermission().then(token => {
        if (token) {
          console.log('[App] Push notifications initialized with token:', token);
        }
      });
    } catch (error) {
      console.warn('Push notification initialization failed (app will continue without notifications):', error);
    }
  }, [showNotification]);

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={true}
      />
      <AppNavigator />
    </>
  );
};

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <NotificationProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </NotificationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
