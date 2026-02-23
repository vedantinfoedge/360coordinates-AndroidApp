import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme';
import HomeScreen from '../../screens/Landing/HomeScreen';
import SearchNavigator from '../../navigation/SearchNavigator';
import ChatNavigator from '../../navigation/ChatNavigator';
import BuyerProfileScreen from '../../screens/Buyer/BuyerProfileScreen';
import FavoritesNavigator from '../../navigation/FavoritesNavigator';
import SupportScreen from '../../screens/Buyer/SupportScreen';
import RecentlyViewedScreen from '../../screens/Buyer/RecentlyViewedScreen';
import AddTabScreen from '../../screens/Buyer/AddTabScreen';
import {ArcFABProvider} from '../../context/ArcFABContext';
import BuyerCustomTabBar from './BuyerCustomTabBar';
import BuyerArcFABMenu from './BuyerArcFABMenu';

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Add: undefined;
  Chats: undefined;
  Profile: undefined;
  Favorites: undefined;
  Support: undefined;
  RecentlyViewed: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_BAR_HEIGHT = 56;

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <ArcFABProvider>
      <View style={{flex: 1}}>
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
            tabBarItemStyle: {
              minHeight: TAB_BAR_HEIGHT,
            },
          }}
          backBehavior="history"
          tabBar={props => <BuyerCustomTabBar {...props} />}>
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{title: 'Home'}}
          />
          <Tab.Screen
            name="Search"
            component={SearchNavigator}
            options={{title: 'Search'}}
          />
          <Tab.Screen
            name="Add"
            component={AddTabScreen}
            options={{title: 'Add'}}
          />
          <Tab.Screen
            name="Chats"
            component={ChatNavigator}
            options={{title: 'Chat'}}
          />
          <Tab.Screen
            name="Profile"
            component={BuyerProfileScreen}
            options={{title: 'Profile'}}
          />
          <Tab.Screen
            name="Favorites"
            component={FavoritesNavigator}
            options={{title: 'Favorites', tabBarButton: () => null}}
          />
          <Tab.Screen
            name="Support"
            component={SupportScreen}
            options={{title: 'Support', tabBarButton: () => null}}
          />
          <Tab.Screen
            name="RecentlyViewed"
            component={RecentlyViewedScreen}
            options={{title: 'Recently Viewed', tabBarButton: () => null}}
          />
        </Tab.Navigator>
        <BuyerArcFABMenu />
      </View>
    </ArcFABProvider>
  );
};

export default MainTabNavigator;
