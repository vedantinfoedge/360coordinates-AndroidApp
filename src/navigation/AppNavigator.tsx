import React, {useEffect, useRef} from 'react';
import {NavigationContainer, NavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';
import AgentNavigator from './AgentNavigator';
import AdminNavigator from './AdminNavigator';
import SplashScreen from '../screens/Auth/SplashScreen';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Buyer: undefined;
  Seller: undefined;
  Agent: undefined;
  Admin: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const {isLoading, isAuthenticated, user} = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

      // Handle navigation when auth state changes
      useEffect(() => {
        if (!isLoading && navigationRef.current) {
          if (isAuthenticated && user) {
            // Navigate to role-based dashboard
            // Allow buyer and seller to access each other's dashboards
            if (user.user_type === 'buyer' || user.user_type === 'seller') {
              // Default to Buyer dashboard, but they can switch
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Buyer'}],
              });
            } else if (user.user_type === 'agent') {
              // Agents can only access agent dashboard
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Agent'}],
              });
            } else if (user.user_type === 'admin') {
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Admin'}],
              });
            }
          } else if (!isAuthenticated) {
            // Navigate to Auth if not authenticated
            navigationRef.current?.reset({
              index: 0,
              routes: [{name: 'Auth'}],
            });
          }
        }
      }, [isLoading, isAuthenticated, user]);

      // Determine initial route based on authentication
      let initialRoute: keyof RootStackParamList = 'Splash';
      if (!isLoading) {
        if (isAuthenticated && user) {
          if (user.user_type === 'buyer' || user.user_type === 'seller') {
            initialRoute = 'Buyer'; // Default to Buyer dashboard
          } else if (user.user_type === 'agent') {
            initialRoute = 'Agent';
          } else if (user.user_type === 'admin') {
            initialRoute = 'Admin';
          } else {
            initialRoute = 'Auth';
          }
        } else {
          initialRoute = 'Auth';
        }
      }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator
        screenOptions={{headerShown: false}}
        initialRouteName={initialRoute}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Auth" component={AuthNavigator} />
        <RootStack.Screen name="Buyer" component={BuyerNavigator} />
        <RootStack.Screen name="Seller" component={SellerNavigator} />
        <RootStack.Screen name="Agent" component={AgentNavigator} />
        <RootStack.Screen name="Admin" component={AdminNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
