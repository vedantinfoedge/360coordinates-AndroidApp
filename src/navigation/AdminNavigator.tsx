import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/Admin/AdminUsersScreen';
import AdminPropertiesScreen from '../screens/Admin/AdminPropertiesScreen';

const Stack = createNativeStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Dashboard">
      <Stack.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="Users" component={AdminUsersScreen} />
      <Stack.Screen name="Properties" component={AdminPropertiesScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
