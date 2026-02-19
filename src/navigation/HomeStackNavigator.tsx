import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BuyerDashboardScreen from '../screens/Buyer/BuyerDashboardScreen';
import PropertyDetailsScreen from '../screens/Buyer/PropertyDetailsScreen';
import UpcomingProjectDetailsScreen from '../screens/Agent/UpcomingProjectDetailsScreen';
import PropertyMapScreen from '../screens/Buyer/PropertyMapScreen';
import AllPropertiesScreen from '../screens/Buyer/AllPropertiesScreen';
import SupportScreen from '../screens/Buyer/SupportScreen';

export type HomeStackParamList = {
  Home: undefined;
  PropertyDetails: {propertyId: string};
  UpcomingProjectDetails: {propertyId: string};
  PropertyMap: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'; propertyId?: string | number} | undefined;
  AllProperties: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'} | undefined;
  Support: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Home" component={BuyerDashboardScreen} />
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <Stack.Screen name="UpcomingProjectDetails" component={UpcomingProjectDetailsScreen} />
      <Stack.Screen name="PropertyMap" component={PropertyMapScreen} />
      <Stack.Screen name="AllProperties" component={AllPropertiesScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
