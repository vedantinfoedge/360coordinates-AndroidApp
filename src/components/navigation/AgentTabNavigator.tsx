import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme';
import AgentDashboardScreen from '../../screens/Agent/AgentDashboardScreen';
import AgentPropertiesScreen from '../../screens/Agent/AgentPropertiesScreen';
import AgentProfileScreen from '../../screens/Agent/AgentProfileScreen';
import ChatNavigator from '../../navigation/ChatNavigator';
import AgentCustomTabBar from './AgentCustomTabBar';

export type AgentTabParamList = {
  Home: undefined;
  Listings: undefined;
  Add: undefined;
  Chat: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AgentTabParamList>();

const TAB_BAR_HEIGHT = 56;

function PlaceholderScreen() {
  return <View style={{flex: 1}} />;
}

const AgentTabNavigator = () => {
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
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarItemStyle: {minHeight: TAB_BAR_HEIGHT},
      }}
      tabBar={props => <AgentCustomTabBar {...props} />}>
      <Tab.Screen name="Home" component={AgentDashboardScreen} options={{title: 'Home'}} />
      <Tab.Screen name="Listings" component={AgentPropertiesScreen} options={{title: 'All Listings'}} />
      <Tab.Screen name="Add" component={PlaceholderScreen} options={{title: ''}} />
      <Tab.Screen name="Chat" component={ChatNavigator} options={{title: 'Chat'}} />
      <Tab.Screen name="Profile" component={AgentProfileScreen} options={{title: 'Profile'}} />
    </Tab.Navigator>
  );
};

export default AgentTabNavigator;
