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
            console.log('Navigating user with type:', user.user_type);
            // Navigate to role-based dashboard
            if (user.user_type === 'buyer') {
              console.log('Navigating to Buyer dashboard');
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Buyer'}],
              });
            } else if (user.user_type === 'seller') {
              console.log('Navigating to Seller dashboard');
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Seller'}],
              });
            } else if (user.user_type === 'agent') {
              console.log('Navigating to Agent dashboard');
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Agent'}],
              });
            } else if (user.user_type === 'admin') {
              console.log('Navigating to Admin dashboard');
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Admin'}],
              });
            } else {
              console.log('Unknown user type, defaulting to Buyer:', user.user_type);
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: 'Buyer'}],
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
          if (user.user_type === 'buyer') {
            initialRoute = 'Buyer';
          } else if (user.user_type === 'seller') {
            initialRoute = 'Seller';
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
