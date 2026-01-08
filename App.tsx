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
import AppNavigator from './src/navigation/AppNavigator';
import {initializeMapbox} from './src/config/mapbox.config';
import {initializeFirebase} from './src/config/firebase.config';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
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
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#FFFFFF"
            translucent={true}
          />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
