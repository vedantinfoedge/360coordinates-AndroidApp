import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import SellerDashboardScreen from '../../screens/Seller/SellerDashboardScreen';
import SellerPropertiesScreen from '../../screens/Seller/SellerPropertiesScreen';
import ChatNavigator from '../../navigation/ChatNavigator';
import SellerProfileScreen from '../../screens/Seller/SellerProfileScreen';
import SellerPropertyDetailsScreen from '../../screens/Seller/SellerPropertyDetailsScreen';
import AddPropertyScreen from '../../screens/Seller/AddPropertyScreen';
import SellerInquiriesScreen from '../../screens/Seller/SellerInquiriesScreen';
import SellerSupportScreen from '../../screens/Seller/SellerSupportScreen';
import {colors} from '../../theme';
import {Text} from 'react-native';

export type SellerTabParamList = {
  Dashboard: undefined;
  MyProperties: undefined;
  Chat: undefined;
  Profile: undefined;
  PropertyDetails: {propertyId: string};
  AddProperty: undefined;
  Inquiries: undefined;
  Support: undefined;
};

const Tab = createBottomTabNavigator<SellerTabParamList>();

const SellerTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.surface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 6,
          height: 58,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          marginTop: 2,
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 0,
          textAlign: 'center',
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={SellerDashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="MyProperties"
        component={SellerPropertiesScreen}
        options={{
          title: 'My Properties',
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>🏘️</Text>,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SellerProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="PropertyDetails"
        component={SellerPropertyDetailsScreen}
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
        name="Inquiries"
        component={SellerInquiriesScreen}
        options={{
          title: 'Inquiries',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="Support"
        component={SellerSupportScreen}
        options={{
          title: 'Support',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
};

export default SellerTabNavigator;

