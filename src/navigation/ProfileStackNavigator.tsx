import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BuyerProfileScreen from '../screens/Buyer/BuyerProfileScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import RecentlyViewedScreen from '../screens/Buyer/RecentlyViewedScreen';
import SupportScreen from '../screens/Buyer/SupportScreen';
import PropertyDetailsScreen from '../screens/Buyer/PropertyDetailsScreen';
import UpcomingProjectDetailsScreen from '../screens/Agent/UpcomingProjectDetailsScreen';
import PropertyMapScreen from '../screens/Buyer/PropertyMapScreen';

export type ProfileStackParamList = {
  Profile: undefined;
  Favorites: undefined;
  RecentlyViewed: undefined;
  Support: undefined;
  PropertyDetails: {propertyId: string};
  UpcomingProjectDetails: {propertyId: string};
  PropertyMap: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'; propertyId?: string | number} | undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Profile"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Profile" component={BuyerProfileScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="RecentlyViewed" component={RecentlyViewedScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <Stack.Screen name="UpcomingProjectDetails" component={UpcomingProjectDetailsScreen} />
      <Stack.Screen name="PropertyMap" component={PropertyMapScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
