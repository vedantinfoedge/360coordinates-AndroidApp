import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SearchResultsScreen from '../screens/Buyer/SearchResultsScreen';
import PropertyDetailsScreen from '../screens/Buyer/PropertyDetailsScreen';
import AllPropertiesScreen from '../screens/Buyer/AllPropertiesScreen';
import PropertyMapScreen from '../screens/Buyer/PropertyMapScreen';
import FavoritesScreen from '../screens/FavoritesScreen';

export type SearchStackParamList = {
  SearchResults: {
    query?: string;
    searchQuery?: string;
    location?: string;
    city?: string;
    propertyType?: string;
    budget?: string;
    bedrooms?: string;
    area?: string;
    status?: 'sale' | 'rent';
    listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
  } | undefined;
  PropertyDetails: {propertyId: string; returnFromLogin?: boolean};
  AllProperties: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'} | undefined;
  PropertyMap: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'; propertyId?: string | number} | undefined;
  Favorites: undefined;
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

const SearchNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{headerShown: false}}
      initialRouteName="SearchResults">
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <Stack.Screen name="AllProperties" component={AllPropertiesScreen} />
      <Stack.Screen name="PropertyMap" component={PropertyMapScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
    </Stack.Navigator>
  );
};

export default SearchNavigator;

