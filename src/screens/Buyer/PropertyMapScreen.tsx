import React, {useState, useEffect, useMemo} from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerStackParamList} from '../../navigation/BuyerNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import PropertyMapView, {MapSearchParams} from '../../components/map/PropertyMapView';
import FullscreenMapSearch, {CompactSearchBarSearchParams} from '../../components/search/FullscreenMapSearch';
import {ListingType} from '../../data/propertyTypes';
import {pgHostelType} from '../../data/propertyTypes';
import {
  getBudgetSetFor,
  getMaxSliderForSet,
  type BudgetSetType,
} from '../../data/priceRanges';

function getInitialMaxBudget(listingType: ListingType, propertyType: string): number {
  const setType = getBudgetSetFor(listingType, propertyType === 'all' ? '' : propertyType);
  return getMaxSliderForSet(setType);
}

type PropertyMapScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: PropertyMapScreenNavigationProp;
  route?: {
    params?: {
      listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
      propertyId?: string | number;
      location?: string;
      city?: string;
      propertyType?: string;
      budget?: string;
      bedrooms?: string;
      area?: string;
    };
  };
};

const PropertyMapScreen: React.FC<Props> = ({navigation, route}) => {
  const params = route?.params || {};

  const initialLocation = (params.location || params.city || '').trim();
  const initialListingType = (params.listingType === 'buy' || params.listingType === 'rent' || params.listingType === 'pg-hostel'
    ? params.listingType
    : 'buy') as ListingType;
  const initialPropertyType = params.propertyType || 'all';
  const initialBudget = params.budget || '';
  const initialBedrooms = params.bedrooms || '';
  const initialArea = params.area || '';

  const [searchText, setSearchText] = useState(initialLocation);
  const [location, setLocation] = useState(initialLocation);
  const [listingType, setListingType] = useState<ListingType>(initialListingType);
  const [selectedPropertyType, setSelectedPropertyType] = useState(
    initialListingType === 'pg-hostel' ? pgHostelType.label : initialPropertyType,
  );
  const [budget, setBudget] = useState(initialBudget);
  const [minBudget, setMinBudget] = useState(0);
  const [maxBudget, setMaxBudget] = useState(() =>
    getInitialMaxBudget(
      initialListingType,
      initialListingType === 'pg-hostel' ? pgHostelType.label : initialPropertyType,
    ),
  );
  const [bedrooms, setBedrooms] = useState(initialBedrooms);
  const [area, setArea] = useState(initialArea);

  const activeBudgetSet = useMemo(
    (): BudgetSetType =>
      getBudgetSetFor(listingType, selectedPropertyType === 'all' ? '' : selectedPropertyType),
    [listingType, selectedPropertyType],
  );
  const maxBudgetForType = useMemo(
    () => getMaxSliderForSet(activeBudgetSet),
    [activeBudgetSet],
  );

  useEffect(() => {
    setMaxBudget(prev => (prev > maxBudgetForType ? maxBudgetForType : prev));
  }, [maxBudgetForType]);

  // Sync from route params when they change (e.g. navigating from SearchResults)
  useEffect(() => {
    const loc = (params.location || params.city || '').trim();
    if (loc) {
      setSearchText(loc);
      setLocation(loc);
    }
    const lt = params.listingType;
    if (lt === 'buy' || lt === 'rent' || lt === 'pg-hostel') {
      setListingType(lt);
    }
    // For pg-hostel, property type is always PG/Hostel; don't overwrite from params
    if (params.propertyType && lt !== 'pg-hostel') {
      setSelectedPropertyType(params.propertyType);
    }
    if (params.budget) setBudget(params.budget);
    if (params.bedrooms) setBedrooms(params.bedrooms);
    if (params.area) setArea(params.area);
  }, [params.location, params.city, params.listingType, params.propertyType, params.budget, params.bedrooms, params.area]);

  // PG/Hostel: auto-select property type
  useEffect(() => {
    if (listingType === 'pg-hostel') {
      setSelectedPropertyType(pgHostelType.label);
    }
  }, [listingType]);

  const listingTypeForMap = listingType;

  const searchParams: MapSearchParams = {
    location,
    listingType: listingTypeForMap,
    propertyType: selectedPropertyType,
    budget,
    minBudget,
    maxBudget,
    bedrooms,
    area,
  };

  const handleSearch = (p: CompactSearchBarSearchParams) => {
    setSearchText(p.location);
    setLocation(p.location);
    setListingType(p.listingType);
    setSelectedPropertyType(p.propertyType);
    setBudget(p.budget);
    setMinBudget(p.minBudget);
    setMaxBudget(p.maxBudget);
    setBedrooms(p.bedrooms);
    setArea(p.area);
  };

  const handleListingTypeChange = (type: ListingType) => {
    setListingType(type);
  };

  const handleBudgetChange = (min: number, max: number, label: string) => {
    setMinBudget(min);
    setMaxBudget(max);
    setBudget(label);
  };

  const fullscreenSearchBar = (
    <FullscreenMapSearch
      searchText={searchText}
      location={location}
      listingType={listingType}
      selectedPropertyType={selectedPropertyType}
      budget={budget}
      minBudget={minBudget}
      maxBudget={maxBudget}
      bedrooms={bedrooms}
      area={area}
      onSearchTextChange={setSearchText}
      onLocationChange={setLocation}
      onListingTypeChange={handleListingTypeChange}
      onPropertyTypeChange={setSelectedPropertyType}
      onBudgetChange={handleBudgetChange}
      onBedroomsChange={setBedrooms}
      onAreaChange={setArea}
      onSearch={handleSearch}
    />
  );

  const propertyId = params.propertyId;

  const handlePropertyPress = (property: any) => {
    try {
      navigation.navigate(
        property.project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails',
        {propertyId: String(property.id)},
      );
    } catch (error: any) {
      console.error('Error navigating to property details:', error);
    }
  };

  const handleGoBackToList = () => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('SearchResults', {
          listingType: listingType,
          location,
          propertyType: selectedPropertyType !== 'all' ? selectedPropertyType : undefined,
          budget: budget || undefined,
          bedrooms: bedrooms || undefined,
          area: area || undefined,
        } as never);
      }
    } catch (error: any) {
      console.error('Error navigating back to list:', error);
      navigation.navigate('SearchResults', {
        listingType: listingType,
        location,
      } as never);
    }
  };

  return (
    <View style={styles.container}>
      <PropertyMapView
        onPropertyPress={handlePropertyPress}
        showListToggle={false}
        listingType={listingTypeForMap}
        selectedPropertyId={propertyId ? String(propertyId) : undefined}
        fullscreenSearchBar={fullscreenSearchBar}
        searchParams={searchParams}
      />

      <TouchableOpacity
        style={styles.floatingListButton}
        onPress={handleGoBackToList}>
        <Text style={styles.floatingListButtonIcon}>📋</Text>
        <Text style={styles.floatingListButtonText}>Go back to list</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  floatingListButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: spacing.sm,
  },
  floatingListButtonIcon: {
    fontSize: 20,
  },
  floatingListButtonText: {
    ...typography.body,
    color: colors.textblack,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default PropertyMapScreen;
