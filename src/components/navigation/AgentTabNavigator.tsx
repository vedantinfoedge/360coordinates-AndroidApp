import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import AgentDashboardScreen from '../../screens/Agent/AgentDashboardScreen';
import AgentPropertiesScreen from '../../screens/Agent/AgentPropertiesScreen';
import AgentInquiriesScreen from '../../screens/Agent/AgentInquiriesScreen';
import AgentProfileScreen from '../../screens/Agent/AgentProfileScreen';
import AgentPropertyDetailsScreen from '../../screens/Agent/AgentPropertyDetailsScreen';
import AddPropertyScreen from '../../screens/Agent/AddPropertyScreen';
import EditPropertyScreen from '../../screens/Agent/EditPropertyScreen';
import AgentSupportScreen from '../../screens/Agent/AgentSupportScreen';
import {colors} from '../../theme';
import {Text} from 'react-native';

export type AgentTabParamList = {
  Dashboard: undefined;
  Listings: undefined;
  Inquiries: undefined;
  Profile: undefined;
  PropertyDetails: {propertyId: string};
  AddProperty: {isUpcomingProject?: boolean} | undefined;
  EditProperty: {propertyId: string | number};
  Support: undefined;
};

const Tab = createBottomTabNavigator<AgentTabParamList>();

const AgentTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Hide default header bar
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.surface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: 20,
          paddingHorizontal: 30,
          height: 65,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: 2,
          paddingHorizontal: 40,
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 56,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 0,
          marginBottom: 0,
          textAlign: 'center',
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={AgentDashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Listings"
        component={AgentPropertiesScreen}
        options={{
          title: 'Listings',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Inquiries"
        component={AgentInquiriesScreen}
        options={{
          title: 'Inquiries',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AgentProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PropertyDetails"
        component={AgentPropertyDetailsScreen}
        options={{
          title: 'Property Details',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{
          title: 'Add Property',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="EditProperty"
        component={EditPropertyScreen}
        options={{
          title: 'Edit Property',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="Support"
        component={AgentSupportScreen}
        options={{
          title: 'Support',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
};

export default AgentTabNavigator;

