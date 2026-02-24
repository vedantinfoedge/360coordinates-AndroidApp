import React, {useState, useEffect, useMemo} from 'react';
import {View, StyleSheet, Text, TouchableOpacity, Platform, PermissionsAndroid} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerStackParamList} from '../../navigation/BuyerNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {TabIcon} from '../../components/navigation/TabIcons';
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
      hideControls?: boolean;
      searchMode?: 'projects' | 'properties';
      project_type?: 'upcoming' | null;
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
  const searchMode = params.searchMode || 'properties';
  const projectTypeFilter = params.project_type || null;

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
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | undefined>(undefined);

  // Fetch current location when opened without a location (e.g. from "Search on Map" button)
  useEffect(() => {
    if (initialLocation) return; // Already have a location, skip
    const fetchCurrentLocation = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
        } catch {
          return;
        }
      }
      Geolocation.getCurrentPosition(
        (position) => {
          const {latitude, longitude} = position.coords;
          setUserLocation({latitude, longitude});
        },
        () => {
          // Silent fail - map will use default center and fetch without nearby filter
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    };
    fetchCurrentLocation();
  }, [initialLocation]);

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

  const [searchCoordinates, setSearchCoordinates] = useState<[number, number] | undefined>(undefined);

  const searchParams: MapSearchParams = {
    location,
    city: location || undefined,
    listingType: listingTypeForMap,
    propertyType: selectedPropertyType,
    budget,
    minBudget,
    maxBudget,
    bedrooms,
    area,
    searchCoordinates,
    searchMode,
    project_type: projectTypeFilter || undefined,
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
    setSearchCoordinates(p.coordinates);
  };

  const handleListingTypeChange = (type: ListingType) => {
    setListingType(type);
    // Reset budget to "Any" when listing type changes - budget ranges use different units
    // (lakhs for buy vs thousands/month for rent), so we must not carry over values
    const propType = type === 'pg-hostel' ? pgHostelType.label : selectedPropertyType;
    setBudget('');
    setMinBudget(0);
    setMaxBudget(getInitialMaxBudget(type, propType));
  };

  const handleBudgetChange = (min: number, max: number, label: string) => {
    setMinBudget(min);
    setMaxBudget(max);
    setBudget(label);
  };

  const isProjectMode = searchMode === 'projects';

  const fullscreenSearchBar = isProjectMode ? undefined : (
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
  const hideControls = params.hideControls === true;

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
    const currentParams: any = {
      listingType,
      location: location || undefined,
      propertyType: selectedPropertyType !== 'all' ? selectedPropertyType : undefined,
      budget: budget || undefined,
      bedrooms: bedrooms || undefined,
      area: area || undefined,
      searchMode,
      project_type: projectTypeFilter || undefined,
    };
    try {
      (navigation as any).navigate('SearchResults', currentParams);
    } catch {
      try {
        const tabNav = navigation.getParent?.()?.getParent?.();
        if (tabNav) {
          (tabNav as any).navigate('Search', { screen: 'SearchResults', params: currentParams });
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        }
      } catch {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      <PropertyMapView
        onPropertyPress={handlePropertyPress}
        showListToggle={false}
        listingType={listingTypeForMap}
        selectedPropertyId={propertyId ? String(propertyId) : undefined}
        fullscreenSearchBar={hideControls ? undefined : fullscreenSearchBar}
        searchParams={searchParams}
        userLocation={userLocation}
        singlePropertyOnly={hideControls}
      />

      {!hideControls && (
        <View style={styles.floatingListButtonWrapper} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.floatingListButton}
            activeOpacity={0.8}
            onPress={handleGoBackToList}>
            <TabIcon name="list" color={colors.text} size={20} />
            <Text style={styles.floatingListButtonText}>{isProjectMode ? 'Go back to projects' : 'Go back to list'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  floatingListButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 30,
    zIndex: 9999,
    elevation: 9999,
  },
  floatingListButton: {
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
    elevation: 9999,
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
