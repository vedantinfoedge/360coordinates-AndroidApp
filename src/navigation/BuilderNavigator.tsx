import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BuilderTabNavigator from '../components/navigation/BuilderTabNavigator';
import BuilderInquiriesScreen from '../screens/Builder/BuilderInquiriesScreen';
import BuilderPropertyDetailsScreen from '../screens/Builder/BuilderPropertyDetailsScreen';
import AddPropertyScreen from '../screens/Builder/AddPropertyScreen';
import AddProjectScreen from '../screens/Builder/AddProjectScreen';
import EditPropertyScreen from '../screens/Builder/EditPropertyScreen';
import BuilderSupportScreen from '../screens/Builder/BuilderSupportScreen';
import SubscriptionScreen from '../screens/Builder/SubscriptionScreen';

export type BuilderStackParamList = {
  BuilderTabs: undefined;
  Inquiries: undefined;
  PropertyDetails: {propertyId: string};
  Subscription: undefined;
  AddProperty: undefined;
  AddProject: undefined;
  EditProperty: {propertyId: string | number};
  Support: undefined;
};

const Stack = createNativeStackNavigator<BuilderStackParamList>();

const BuilderNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="BuilderTabs">
      <Stack.Screen name="BuilderTabs" component={BuilderTabNavigator} />
      <Stack.Screen name="Inquiries" component={BuilderInquiriesScreen} />
      <Stack.Screen name="PropertyDetails" component={BuilderPropertyDetailsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
      <Stack.Screen name="AddProject" component={AddProjectScreen} />
      <Stack.Screen name="EditProperty" component={EditPropertyScreen} />
      <Stack.Screen name="Support" component={BuilderSupportScreen} />
    </Stack.Navigator>
  );
};

export default BuilderNavigator;
