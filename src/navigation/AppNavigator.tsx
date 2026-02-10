import React, {useEffect, useRef} from 'react';
import {NavigationContainer, NavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';
import AgentNavigator from './AgentNavigator';
import AdminNavigator from './AdminNavigator';
import SplashScreen from '../screens/Auth/SplashScreen';
import InitialScreen from '../screens/Landing/InitialScreen';
import SellSelectionScreen from '../screens/Landing/SellSelectionScreen';
import MainTabNavigator from '../components/navigation/MainTabNavigator';
import TermsConditionsScreen from '../screens/Landing/TermsConditionsScreen';
import PrivacyPolicyScreen from '../screens/Landing/PrivacyPolicyScreen';
import {colors} from '../theme';

export type RootStackParamList = {
  Splash: undefined;
  Initial: undefined;
  SellSelection: undefined;
  MainTabs: undefined;
  Auth: undefined;
  Buyer: undefined;
  Seller: undefined;
  Agent: undefined;
  Admin: undefined;
  TermsConditions: undefined;
  PrivacyPolicy: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const {isLoading, isAuthenticated, user} = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

      // Handle navigation when auth state changes
      // New workflow: Always start with Initial screen, then navigate based on user actions
      useEffect(() => {
        if (!isLoading && navigationRef.current) {
          // For authenticated users, check for dashboard preference or navigate based on user type
          if (isAuthenticated && user) {
            const accountRole = (
              ((user as any).registered_role || user.user_type || '') as string
            )
              .toString()
              .toLowerCase();
            // First check for immediate targetDashboard (from InitialScreen role selection)
            // Then check for persistent dashboard preference (stored until logout)
            Promise.all([
              AsyncStorage.getItem('@target_dashboard'),
              AsyncStorage.getItem('@user_dashboard_preference'),
            ])
              .then(([targetDashboard, dashboardPreference]) => {
                // Use targetDashboard if available (immediate), otherwise use persistent preference
                const dashboard = targetDashboard || dashboardPreference;
                console.log(
                  '[AppNavigator] Checking dashboard - targetDashboard:',
                  targetDashboard,
                  'preference:',
                  dashboardPreference,
                  'user_type:',
                  user.user_type,
                  'registered_role:',
                  (user as any).registered_role,
                );
                
                if (dashboard) {
                  console.log('[AppNavigator] User authenticated with dashboard:', dashboard);
                  // STRICT: Agent/Builder accounts must always land on Agent dashboard (never Buyer/Seller)
                  if (accountRole === 'agent' || accountRole === 'builder') {
                    console.log('[AppNavigator] 🔒 Restricted account detected; forcing Agent/Builder dashboard');
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'Agent'}],
                    });
                    if (targetDashboard) {
                      AsyncStorage.removeItem('@target_dashboard').catch(err => {
                        console.error('[AppNavigator] Error removing targetDashboard:', err);
                      });
                    }
                    return;
                  }
                  // Navigate to the specified dashboard
                  if (dashboard === 'builder') {
                    // Builder dashboard is not separate; route to Agent dashboard
                    console.log('[AppNavigator] Builder selected; navigating to Agent dashboard');
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'Agent'}],
                    });
                  } else if (dashboard === 'seller') {
                    console.log('[AppNavigator] Navigating to Seller dashboard');
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'Seller'}],
                    });
                  } else if (dashboard === 'agent') {
                    console.log('[AppNavigator] Navigating to Agent dashboard');
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'Agent'}],
                    });
                  } else {
                    // Default to MainTabs for buyer
                    console.log('[AppNavigator] Defaulting to MainTabs');
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'MainTabs'}],
                    });
                  }
                  // Clear the immediate targetDashboard after using it (but keep preference)
                  if (targetDashboard) {
                    AsyncStorage.removeItem('@target_dashboard').catch(err => {
                      console.error('[AppNavigator] Error removing targetDashboard:', err);
                    });
                  }
                } else {
                  // No dashboard preference, navigate based on account role / user type
                  console.log(
                    '[AppNavigator] No dashboard preference found, navigating based on role:',
                    'active user_type:',
                    user.user_type,
                    'registered_role:',
                    (user as any).registered_role,
                  );
                  if (accountRole === 'seller') {
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'Seller'}],
                    });
                  } else if (accountRole === 'agent' || accountRole === 'builder') {
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'Agent'}],
                    });
                  } else if (accountRole === 'admin') {
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'Admin'}],
                    });
                  } else {
                    // Default to MainTabs for buyer
                    navigationRef.current?.reset({
                      index: 0,
                      routes: [{name: 'MainTabs'}],
                    });
                  }
                }
              })
              .catch(err => {
                console.error('[AppNavigator] Error reading dashboard preference:', err);
                // Fallback to role-based navigation
                if (accountRole === 'seller') {
                  navigationRef.current?.reset({
                    index: 0,
                    routes: [{name: 'Seller'}],
                  });
                } else if (accountRole === 'agent' || accountRole === 'builder') {
                  navigationRef.current?.reset({
                    index: 0,
                    routes: [{name: 'Agent'}],
                  });
                } else if (accountRole === 'admin') {
                  navigationRef.current?.reset({
                    index: 0,
                    routes: [{name: 'Admin'}],
                  });
                } else {
                  navigationRef.current?.reset({
                    index: 0,
                    routes: [{name: 'MainTabs'}],
                  });
                }
              });
          } else if (!isAuthenticated) {
            // Guest user: open Buyer screen directly to browse properties
            console.log('[AppNavigator] User not authenticated, navigating to Buyer (guest)');
            navigationRef.current?.reset({
              index: 0,
              routes: [{name: 'Buyer'}],
            });
          }
        }
      }, [isLoading, isAuthenticated, user]);

      // Determine initial route
      let initialRoute: keyof RootStackParamList = 'Splash';
      if (!isLoading) {
        // Guest users go directly to Buyer screen (no Initial screen)
        initialRoute = 'Buyer';
      }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator
        screenOptions={{headerShown: false}}
        initialRouteName={initialRoute}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Initial" component={InitialScreen} />
        <RootStack.Screen name="SellSelection" component={SellSelectionScreen} />
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
        <RootStack.Screen name="Auth" component={AuthNavigator} />
        <RootStack.Screen name="Buyer" component={BuyerNavigator} />
        <RootStack.Screen name="Seller" component={SellerNavigator} />
        <RootStack.Screen name="Agent" component={AgentNavigator} />
        <RootStack.Screen name="Admin" component={AdminNavigator} />
        <RootStack.Screen
          name="TermsConditions"
          component={TermsConditionsScreen}
          options={{
            headerShown: true,
            title: 'Terms & Conditions',
            headerStyle: {backgroundColor: colors.primary},
            headerTintColor: colors.surface,
          }}
        />
        <RootStack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{
            headerShown: true,
            title: 'Privacy Policy',
            headerStyle: {backgroundColor: colors.primary},
            headerTintColor: colors.surface,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
