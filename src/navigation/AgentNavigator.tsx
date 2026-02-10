import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AgentTabNavigator from '../components/navigation/AgentTabNavigator';
import AgentInquiriesScreen from '../screens/Agent/AgentInquiriesScreen';
import AgentPropertyDetailsScreen from '../screens/Agent/AgentPropertyDetailsScreen';
import UpcomingProjectDetailsScreen from '../screens/Agent/UpcomingProjectDetailsScreen';
import AddPropertyScreen from '../screens/Agent/AddPropertyScreen';
import AddProjectScreen from '../screens/Agent/AddProjectScreen';
import EditPropertyScreen from '../screens/Agent/EditPropertyScreen';
import AgentSupportScreen from '../screens/Agent/AgentSupportScreen';
import SubscriptionScreen from '../screens/Agent/SubscriptionScreen';

export type AgentStackParamList = {
  AgentTabs: undefined;
  Inquiries: undefined;
  PropertyDetails: {propertyId: string};
  UpcomingProjectDetails: {propertyId: string};
  Subscription: undefined;
  AddProperty: undefined;
  AddProject: undefined;
  EditProperty: {propertyId: string | number};
  Support: undefined;
};

const Stack = createNativeStackNavigator<AgentStackParamList>();

const AgentNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="AgentTabs">
      <Stack.Screen name="AgentTabs" component={AgentTabNavigator} />
      <Stack.Screen name="Inquiries" component={AgentInquiriesScreen} />
      <Stack.Screen name="PropertyDetails" component={AgentPropertyDetailsScreen} />
      <Stack.Screen name="UpcomingProjectDetails" component={UpcomingProjectDetailsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
      <Stack.Screen name="AddProject" component={AddProjectScreen} />
      <Stack.Screen name="EditProperty" component={EditPropertyScreen} />
      <Stack.Screen name="Support" component={AgentSupportScreen} />
    </Stack.Navigator>
  );
};

export default AgentNavigator;
