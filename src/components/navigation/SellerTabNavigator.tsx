import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text} from 'react-native';
import SellerDashboardScreen from '../../screens/Seller/SellerDashboardScreen';
import SellerPropertiesScreen from '../../screens/Seller/SellerPropertiesScreen';
import ChatNavigator from '../../navigation/ChatNavigator';
import SellerProfileScreen from '../../screens/Seller/SellerProfileScreen';
import SellerPropertyDetailsScreen from '../../screens/Seller/SellerPropertyDetailsScreen';
import AddPropertyScreen from '../../screens/Seller/AddPropertyScreen';
import SellerInquiriesScreen from '../../screens/Seller/SellerInquiriesScreen';
import SellerSupportScreen from '../../screens/Seller/SellerSupportScreen';
import {colors, spacing} from '../../theme';
import {useUnreadChatCount} from '../../hooks/useUnreadChatCount';

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
  const unreadCount = useUnreadChatCount();

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
        component={SellerDashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="MyProperties"
        component={SellerPropertiesScreen}
        options={{
          title: 'My Properties',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <View style={{position: 'relative', alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{color, fontSize: 20, textAlign: 'center'}}>💬</Text>
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: '#FF3B30',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SellerProfileScreen}
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

