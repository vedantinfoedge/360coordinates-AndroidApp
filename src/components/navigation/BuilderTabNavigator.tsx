import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import BuilderDashboardScreen from '../../screens/Builder/BuilderDashboardScreen';
import BuilderPropertiesScreen from '../../screens/Builder/BuilderPropertiesScreen';
import BuilderInquiriesScreen from '../../screens/Builder/BuilderInquiriesScreen';
import BuilderProfileScreen from '../../screens/Builder/BuilderProfileScreen';
import BuilderPropertyDetailsScreen from '../../screens/Builder/BuilderPropertyDetailsScreen';
import AddPropertyScreen from '../../screens/Builder/AddPropertyScreen';
import EditPropertyScreen from '../../screens/Builder/EditPropertyScreen';
import BuilderSupportScreen from '../../screens/Builder/BuilderSupportScreen';
import {colors} from '../../theme';
import {Text} from 'react-native';

export type BuilderTabParamList = {
  Dashboard: undefined;
  Projects: undefined;
  Inquiries: undefined;
  Profile: undefined;
  PropertyDetails: {propertyId: string};
  AddProperty: undefined;
  EditProperty: {propertyId: string | number};
  Support: undefined;
};

const Tab = createBottomTabNavigator<BuilderTabParamList>();

const BuilderTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
        component={BuilderDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Projects"
        component={BuilderPropertiesScreen}
        options={{
          title: 'Projects',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Inquiries"
        component={BuilderInquiriesScreen}
        options={{
          title: 'Inquiries',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={BuilderProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PropertyDetails"
        component={BuilderPropertyDetailsScreen}
        options={{
          title: 'Property Details',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{
          title: 'Add Project',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="EditProperty"
        component={EditPropertyScreen}
        options={{
          title: 'Edit Project',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Support"
        component={BuilderSupportScreen}
        options={{
          title: 'Support',
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

export default BuilderTabNavigator;

