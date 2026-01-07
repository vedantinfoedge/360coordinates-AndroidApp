import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import BuyerDashboardScreen from '../../screens/Buyer/BuyerDashboardScreen';
import ChatNavigator from '../../navigation/ChatNavigator';
import BuyerProfileScreen from '../../screens/Buyer/BuyerProfileScreen';
import FavoritesScreen from '../../screens/FavoritesScreen';
import SearchResultsScreen from '../../screens/Buyer/SearchResultsScreen';
import PropertyDetailsScreen from '../../screens/Buyer/PropertyDetailsScreen';
import SupportScreen from '../../screens/Buyer/SupportScreen';
import {colors} from '../../theme';
import {Text} from 'react-native';

export type BuyerTabParamList = {
  Home: undefined;
  Chat: undefined;
  Favorites: undefined;
  Profile: undefined;
  PropertyList: {searchQuery?: string} | undefined;
  PropertyDetails: {propertyId: string};
  Support: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();

const BuyerTabNavigator = () => {
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
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 6,
          paddingHorizontal: 0,
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
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
          textAlign: 'center',
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={BuyerDashboardScreen}
        options={{
          title: 'Home',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>🏠</Text>,
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
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>❤️</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={BuyerProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="PropertyList"
        component={SearchResultsScreen}
        options={{
          title: 'Properties',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="PropertyDetails"
        component={PropertyDetailsScreen}
        options={{
          title: 'Property Details',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          title: 'Support',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
};

export default BuyerTabNavigator;

