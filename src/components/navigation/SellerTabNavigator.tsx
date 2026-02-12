import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import SellerDashboardScreen from '../../screens/Seller/SellerDashboardScreen';
import SellerPropertiesScreen from '../../screens/Seller/SellerPropertiesScreen';
import SellerProfileScreen from '../../screens/Seller/SellerProfileScreen';
import ChatNavigator from '../../navigation/ChatNavigator';
import LeadsScreen from '../../screens/Seller/LeadsScreen';
import SellerSupportScreen from '../../screens/Seller/SellerSupportScreen';
import SubscriptionScreen from '../../screens/Seller/SubscriptionScreen';
import SellerCustomTabBar from './SellerCustomTabBar';

export type SellerTabParamList = {
  Home: undefined;
  AllListings: undefined;
  Search: undefined;
  Chat: undefined;
  Profile: undefined;
  Leads: undefined;
  Support: undefined;
  Subscription: undefined;
};

const Tab = createBottomTabNavigator<SellerTabParamList>();

const TAB_BAR_HEIGHT = 56;

function PlaceholderScreen() {
  return <View style={{ flex: 1 }} />;
}

const SellerTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: insets.bottom,
          paddingHorizontal: 8,
          height: TAB_BAR_HEIGHT + insets.bottom,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarItemStyle: { minHeight: TAB_BAR_HEIGHT },
      }}
      tabBar={props => <SellerCustomTabBar {...props} />}>
      <Tab.Screen name="Home" component={SellerDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="AllListings" component={SellerPropertiesScreen} options={{ title: 'All Listings' }} />
      <Tab.Screen name="Search" component={PlaceholderScreen} options={{ title: '' }} />
      <Tab.Screen name="Chat" component={ChatNavigator} options={{ title: 'Chat' }} />
      <Tab.Screen name="Profile" component={SellerProfileScreen} options={{ title: 'Profile' }} />

      {/* Hidden Tabs (to keep bottom bar visible) */}
      <Tab.Screen
        name="Leads"
        component={LeadsScreen}
        options={{
          title: 'Leads',
          tabBarButton: () => null,
        }}
      />

      <Tab.Screen
        name="Support"
        component={SellerSupportScreen}
        options={{
          title: 'Support',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          title: 'Subscription',
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

export default SellerTabNavigator;
