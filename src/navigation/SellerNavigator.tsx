import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SellerTabNavigator from '../components/navigation/SellerTabNavigator';
import SellerInquiriesScreen from '../screens/Seller/SellerInquiriesScreen';
import SellerPropertiesScreen from '../screens/Seller/SellerPropertiesScreen';
import SellerPropertyDetailsScreen from '../screens/Seller/SellerPropertyDetailsScreen';
import AddPropertyScreen from '../screens/Seller/AddPropertyScreen';
import SellerSupportScreen from '../screens/Seller/SellerSupportScreen';
import SubscriptionScreen from '../screens/Seller/SubscriptionScreen';

export type SellerStackParamList = {
  SellerTabs: undefined;
  Dashboard: undefined;
  MyProperties: undefined;
  Chat: undefined;
  Profile: undefined;
  PropertyDetails: {propertyId: string};
  AddProperty: undefined;
  Inquiries: undefined;
  Support: undefined;
  Subscription: undefined;
};

const Stack = createNativeStackNavigator<SellerStackParamList>();

const SellerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="SellerTabs">
      <Stack.Screen name="SellerTabs" component={SellerTabNavigator} />
      <Stack.Screen name="MyProperties" component={SellerPropertiesScreen} />
      <Stack.Screen name="Inquiries" component={SellerInquiriesScreen} />
      <Stack.Screen name="PropertyDetails" component={SellerPropertyDetailsScreen} />
      <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
      <Stack.Screen name="Support" component={SellerSupportScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
};

export default SellerNavigator;
