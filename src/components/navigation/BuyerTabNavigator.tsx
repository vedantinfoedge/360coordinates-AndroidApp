import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text} from 'react-native';
import BuyerDashboardScreen from '../../screens/Buyer/BuyerDashboardScreen';
import ChatNavigator from '../../navigation/ChatNavigator';
import BuyerProfileScreen from '../../screens/Buyer/BuyerProfileScreen';
import SearchResultsScreen from '../../screens/Buyer/SearchResultsScreen';
import AllPropertiesScreen from '../../screens/Buyer/AllPropertiesScreen';
import PropertyDetailsScreen from '../../screens/Buyer/PropertyDetailsScreen';
import PropertyMapScreen from '../../screens/Buyer/PropertyMapScreen';
import SupportScreen from '../../screens/Buyer/SupportScreen';
import FavoritesScreen from '../../screens/FavoritesScreen';
import {colors, spacing} from '../../theme';
import {useUnreadChatCount} from '../../hooks/useUnreadChatCount';

export type BuyerTabParamList = {
  Home: undefined;
  Search: undefined;
  Chats: undefined;
  Profile: undefined;
  Chat: undefined;
  Favorites: undefined;
  PropertyList: {searchQuery?: string} | undefined;
  SearchResults: {searchQuery?: string; location?: string; listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'} | undefined;
  AllProperties: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'} | undefined;
  PropertyDetails: {propertyId: string};
  PropertyMap: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'; propertyId?: string | number} | undefined;
  Support: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();

const BuyerTabNavigator = () => {
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
        name="Home"
        component={BuyerDashboardScreen}
        options={{
          title: 'Home',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchResultsScreen}
        options={{
          title: 'Search',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>🔍</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatNavigator}
        options={{
          title: 'Chats',
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
        component={BuyerProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
          headerShown: false, // Hide default header for custom header
          tabBarButton: () => null, // Hide from tab bar
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
        name="SearchResults"
        component={SearchResultsScreen}
        options={{
          title: 'Search Results',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="AllProperties"
        component={AllPropertiesScreen}
        options={{
          title: 'All Properties',
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
        name="PropertyMap"
        component={PropertyMapScreen}
        options={{
          title: 'Map',
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

