import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AdminTabNavigator from '../components/navigation/AdminTabNavigator';

export type AdminStackParamList = {
  AdminTabs: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;

