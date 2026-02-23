import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import FavoritesScreen from '../screens/FavoritesScreen';
import PropertyDetailsScreen from '../screens/Buyer/PropertyDetailsScreen';
import UpcomingProjectDetailsScreen from '../screens/Agent/UpcomingProjectDetailsScreen';
import PropertyMapScreen from '../screens/Buyer/PropertyMapScreen';

export type FavoritesStackParamList = {
  FavoritesList: undefined;
  PropertyDetails: {propertyId: string};
  UpcomingProjectDetails: {propertyId: string};
  PropertyMap:
    | {
        listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
        propertyId?: string | number;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<FavoritesStackParamList>();

const FavoritesNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="FavoritesList"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="FavoritesList" component={FavoritesScreen} />
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <Stack.Screen
        name="UpcomingProjectDetails"
        component={UpcomingProjectDetailsScreen}
      />
      <Stack.Screen name="PropertyMap" component={PropertyMapScreen} />
    </Stack.Navigator>
  );
};

export default FavoritesNavigator;
