import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import AdminDashboardScreen from '../../screens/Admin/AdminDashboardScreen';
import AdminUsersScreen from '../../screens/Admin/AdminUsersScreen';
import AdminPropertiesScreen from '../../screens/Admin/AdminPropertiesScreen';

const Tab = createBottomTabNavigator();

const AdminTabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Users"
        component={AdminUsersScreen}
        options={{
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Properties"
        component={AdminPropertiesScreen}
        options={{
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>🏠</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;

