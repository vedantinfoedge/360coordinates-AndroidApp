import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import BuyerDashboardScreen from '../../screens/Buyer/BuyerDashboardScreen';
import ChatNavigator from '../../navigation/ChatNavigator';
import BuyerProfileScreen from '../../screens/Buyer/BuyerProfileScreen';
import SearchResultsScreen from '../../screens/Buyer/SearchResultsScreen';
import AllPropertiesScreen from '../../screens/Buyer/AllPropertiesScreen';
import PropertyDetailsScreen from '../../screens/Buyer/PropertyDetailsScreen';
import PropertyMapScreen from '../../screens/Buyer/PropertyMapScreen';
import SupportScreen from '../../screens/Buyer/SupportScreen';
import UpcomingProjectDetailsScreen from '../../screens/Agent/UpcomingProjectDetailsScreen';
import FavoritesScreen from '../../screens/FavoritesScreen';
import RecentlyViewedScreen from '../../screens/Buyer/RecentlyViewedScreen';
import AddTabScreen from '../../screens/Buyer/AddTabScreen';
import {ArcFABProvider} from '../../context/ArcFABContext';
import BuyerCustomTabBar from './BuyerCustomTabBar';
import BuyerArcFABMenu from './BuyerArcFABMenu';
import {colors} from '../../theme';

const tabIcon = (char: string, color: string) => (
  <Text style={{fontSize: 20, fontWeight: '600', color}}>{char}</Text>
);

export type SearchParams = {
  query?: string;
  searchQuery?: string;
  location?: string;
  city?: string;
  propertyType?: string;
  budget?: string;
  bedrooms?: string;
  area?: string;
  status?: 'sale' | 'rent';
  listingType?: 'buy' | 'rent' | 'pg-hostel';
  project_type?: 'upcoming' | null;
  searchMode?: 'projects' | 'properties';
};

export type BuyerTabParamList = {
  Home: undefined;
  Search: SearchParams | undefined;
  Add: undefined;
  Chats: undefined;
  Profile: undefined;
  Chat: undefined;
  Favorites: undefined;
  RecentlyViewed: undefined;
  PropertyList: {searchQuery?: string} | undefined;
  SearchResults: {searchQuery?: string; location?: string; listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'} | undefined;
  AllProperties: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'} | undefined;
  PropertyDetails: {propertyId: string};
  UpcomingProjectDetails: {propertyId: string};
  PropertyMap: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'; propertyId?: string | number} | undefined;
  Support: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();

// Report styling: 56pt bar, safe area bottom, #e0e0e0 top border, focused #1976d2 / unfocused #757575
const TAB_BAR_HEIGHT = 56;
const FOCUSED_COLOR = '#1976d2';
const UNFOCUSED_COLOR = '#757575';

const BuyerTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <ArcFABProvider>
      <View style={{flex: 1}}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: true,
            tabBarActiveTintColor: FOCUSED_COLOR,
            tabBarInactiveTintColor: UNFOCUSED_COLOR,
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
          tabBar={props => <BuyerCustomTabBar {...props} />}>
      <Tab.Screen
        name="Home"
        component={BuyerDashboardScreen}
        options={{
          title: 'Explore',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => tabIcon('H', color),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchResultsScreen}
        initialParams={{
          query: '',
          location: '',
          searchQuery: '',
          city: '',
          propertyType: '',
          budget: '',
          bedrooms: '',
          area: '',
          status: '',
          listingType: 'all', // Show all properties by default
        } as any}
        options={{
          title: 'Search',
          headerShown: false,
          tabBarIcon: ({color}) => tabIcon('S', color),
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddTabScreen}
        options={{
          title: 'Add',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 24, fontWeight: '600', color}}>+</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatNavigator}
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({color}) => tabIcon('C', color),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={BuyerProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => tabIcon('P', color),
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
        name="RecentlyViewed"
        component={RecentlyViewedScreen}
        options={{
          title: 'Recently Viewed',
          headerShown: false,
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
        name="UpcomingProjectDetails"
        component={UpcomingProjectDetailsScreen}
        options={{
          title: 'Upcoming Project Details',
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
        <BuyerArcFABMenu />
      </View>
    </ArcFABProvider>
  );
};

export default BuyerTabNavigator;
