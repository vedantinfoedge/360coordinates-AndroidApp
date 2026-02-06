import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/Landing/HomeScreen';
import SearchNavigator from './SearchNavigator';
import ChatNavigator from './ChatNavigator';
import BuyerProfileScreen from '../screens/Buyer/BuyerProfileScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SupportScreen from '../screens/Buyer/SupportScreen';
import RecentlyViewedScreen from '../screens/Buyer/RecentlyViewedScreen';
import AddTabScreen from '../screens/Buyer/AddTabScreen';

export type MainStackParamList = {
  Home: undefined;
  Search: undefined;
  Add: undefined;
  Chat: undefined;
  Profile: undefined;
  Favorites: undefined;
  Support: undefined;
  RecentlyViewed: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchNavigator} />
      <Stack.Screen name="Add" component={AddTabScreen} />
      <Stack.Screen name="Chat" component={ChatNavigator} />
      <Stack.Screen name="Profile" component={BuyerProfileScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="RecentlyViewed" component={RecentlyViewedScreen} />
    </Stack.Navigator>
  );
};

export default MainStackNavigator;
