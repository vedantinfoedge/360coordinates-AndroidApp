import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {colors} from '../../theme';
import {Text, View} from 'react-native';
import HomeScreen from '../../screens/Landing/HomeScreen';
import SearchNavigator from '../../navigation/SearchNavigator';
import ChatNavigator from '../../navigation/ChatNavigator';
import BuyerProfileScreen from '../../screens/Buyer/BuyerProfileScreen';
import FavoritesScreen from '../../screens/FavoritesScreen';
import SupportScreen from '../../screens/Buyer/SupportScreen';
import RecentlyViewedScreen from '../../screens/Buyer/RecentlyViewedScreen';
import TabBarIcon from './TabBarIcon';

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Chat: undefined;
  Profile: undefined;
  Favorites: undefined;
  Support: undefined;
  RecentlyViewed: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Explore',
          tabBarIcon: ({color, focused}) => (
            <TabBarIcon name="home" color={color} focused={focused} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchNavigator}
        options={{
          title: 'Search',
          tabBarIcon: ({color, focused}) => (
            <TabBarIcon name="search" color={color} focused={focused} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          title: 'Inbox',
          tabBarIcon: ({color, focused}) => (
            <TabBarIcon name="chat" color={color} focused={focused} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={BuyerProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({color, focused}) => (
            <TabBarIcon name="profile" color={color} focused={focused} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
          tabBarButton: () => null, // hide from the bottom bar
          headerShown: false,
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
      <Tab.Screen
        name="RecentlyViewed"
        component={RecentlyViewedScreen}
        options={{
          title: 'Recently Viewed',
          headerShown: false,
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

