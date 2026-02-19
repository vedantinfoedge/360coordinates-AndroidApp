import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SearchResultsScreen from '../screens/Buyer/SearchResultsScreen';
import PropertyDetailsScreen from '../screens/Buyer/PropertyDetailsScreen';
import UpcomingProjectDetailsScreen from '../screens/Agent/UpcomingProjectDetailsScreen';
import PropertyMapScreen from '../screens/Buyer/PropertyMapScreen';
import AllPropertiesScreen from '../screens/Buyer/AllPropertiesScreen';

export type SearchStackParamList = {
  SearchResults:
    | {
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
        project_type?: 'upcoming' | null;
      }
    | undefined;
  PropertyDetails: {propertyId: string};
  UpcomingProjectDetails: {propertyId: string};
  PropertyMap:
    | {
        listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
        propertyId?: string | number;
        location?: string;
        city?: string;
        propertyType?: string;
        budget?: string;
        bedrooms?: string;
        area?: string;
      }
    | undefined;
  AllProperties: {listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel'} | undefined;
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

const SearchStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="SearchResults"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <Stack.Screen name="UpcomingProjectDetails" component={UpcomingProjectDetailsScreen} />
      <Stack.Screen name="PropertyMap" component={PropertyMapScreen} />
      <Stack.Screen name="AllProperties" component={AllPropertiesScreen} />
    </Stack.Navigator>
  );
};

export default SearchStackNavigator;
