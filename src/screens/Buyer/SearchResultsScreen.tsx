import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  Dimensions,
  Share,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SearchStackParamList } from '../../navigation/SearchNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import PropertyCard from '../../components/PropertyCard';
import BuyerHeader from '../../components/BuyerHeader';
import { useAuth } from '../../context/AuthContext';
import { propertyTypes, pgHostelType, ListingType, PropertyType } from '../../data/propertyTypes';
import {
  getBudgetSetFor,
  getBudgetOptions,
  getMaxSliderForSet,
  getBudgetUnitsForSelection,
  findBudgetLabelForRange,
  findBudgetRangeByLabel,
  type BudgetSetType,
} from '../../data/priceRanges';
import { propertyService } from '../../services/property.service';
import { propertySearchService } from '../../services/propertySearch.service';
import { fixImageUrl } from '../../utils/imageHelper';
import { formatters } from '../../utils/formatters';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import { buildPGHostelFetchParams, PG_HOSTEL_PROPERTY_TYPE } from '../../utils/propertySearchParams';

type SearchResultsScreenNavigationProp = NativeStackNavigationProp<SearchStackParamList, 'SearchResults'>;

type Props = {
  navigation: SearchResultsScreenNavigationProp;
  route?: {
    params?: {
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
  };
};

// Local Property type for this screen (price is formatted as string)
interface Property {
  id: string;
  name: string;
  location: string;
  price: string; // Formatted price string (e.g., "₹50L", "₹5Cr", "₹10K/month")
  type: 'buy' | 'rent' | 'pg-hostel';
  bedrooms: number;
  bathrooms: number;
  area: string;
  propertyType: string;
  city: string;
  state: string;
  bhk: number;
  cover_image: string;
  images?: string[];
  is_favorite: boolean;
  availableForBachelors?: boolean;
  availabilityStatus?: string;
  project_type?: string;
}

const SearchResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { logout, user, isAuthenticated } = useAuth();
  const routeParams = route?.params || {};

  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;

  // PART B: Safely read location from route params with trimming
  // Handle null/undefined/empty/spaces safely - empty location is valid
  // Priority: query > location > searchQuery
  const routeLocation = (routeParams?.query || routeParams?.location || routeParams?.searchQuery || '').trim();

  // Initialize from route params (website-style search)
  const initialLocation = routeLocation || '';
  const initialCity = routeParams.city || '';
  const initialPropertyType = routeParams.propertyType || '';
  const initialBudget = routeParams.budget || '';
  const initialBedrooms = routeParams.bedrooms || '';
  const initialArea = routeParams.area || '';
  const initialStatus = routeParams.status || (routeParams.listingType === 'buy' ? 'sale' : routeParams.listingType === 'rent' ? 'rent' : '');
  const initialListingType = routeParams.listingType || 'buy';
  const projectTypeFilter = routeParams.project_type || null;
  const initialSearchMode = routeParams.searchMode || 'properties';

  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState(initialLocation);
  const [loading, setLoading] = useState(true);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'listing' | 'property' | 'budget' | 'projectStatus' | 'possessionDate' | null>(null);

  // Search Mode
  const [searchMode, setSearchMode] = useState<'projects' | 'properties'>(initialSearchMode);

  // Filters - initialize with route params (Buy, Rent, PG/Hostel)
  const [listingType, setListingType] = useState<ListingType>(
    (initialListingType === 'buy' || initialListingType === 'rent' || initialListingType === 'pg-hostel')
      ? initialListingType
      : 'buy'
  );

  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(initialPropertyType || 'all');
  const [location, setLocation] = useState<string>(initialLocation);
  const [budget, setBudget] = useState<string>(initialBudget);
  // Budget range values (from dropdown/chip selection; Lakhs for buy, thousands for rent)
  const [minBudget, setMinBudget] = useState<number>(0);
  const [maxBudget, setMaxBudget] = useState<number>(1000); // Set when user picks a preset
  // Bedrooms: '' = Any, '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK' (PG also has '1RK')
  const [bedrooms, setBedrooms] = useState<string>(initialBedrooms && /^(1RK|1 BHK|2 BHK|3 BHK|4 BHK|5\+ BHK)$/.test(initialBedrooms) ? initialBedrooms : '');
  const [area, setArea] = useState<string>(initialArea);
  const [status, setStatus] = useState<'sale' | 'rent' | ''>(initialStatus);

  // Project Search Filters
  const [projectStatus, setProjectStatus] = useState<string>('');
  const [possessionDate, setPossessionDate] = useState<string>('');

  // When navigating to this screen multiple times (e.g. from Buyer dashboard / Home screen),
  // React Navigation may reuse the mounted screen. Sync state from latest route params so
  // listingType/location updates actually apply.
  const lastRouteSyncKeyRef = useRef<string>('');
  const routeSyncKey = useMemo(() => {
    const p: any = routeParams ?? {};
    return JSON.stringify({
      query: p.query ?? '',
      searchQuery: p.searchQuery ?? '',
      location: p.location ?? '',
      city: p.city ?? '',
      propertyType: p.propertyType ?? '',
      budget: p.budget ?? '',
      bedrooms: p.bedrooms ?? '',
      area: p.area ?? '',
      status: p.status ?? '',
      listingType: p.listingType ?? '',
      project_type: p.project_type ?? '',
      searchMode: p.searchMode ?? '',
    });
  }, [
    (routeParams as any)?.query,
    (routeParams as any)?.searchQuery,
    (routeParams as any)?.location,
    (routeParams as any)?.city,
    (routeParams as any)?.propertyType,
    (routeParams as any)?.budget,
    (routeParams as any)?.bedrooms,
    (routeParams as any)?.area,
    (routeParams as any)?.status,
    (routeParams as any)?.listingType,
    (routeParams as any)?.listingType,
    (routeParams as any)?.project_type,
    (routeParams as any)?.searchMode,
  ]);

  useEffect(() => {
    if (lastRouteSyncKeyRef.current === routeSyncKey) return;
    lastRouteSyncKeyRef.current = routeSyncKey;

    const p: any = routeParams ?? {};

    // Location/query
    const nextLocation = (p.query || p.location || p.searchQuery || '').trim();
    setSearchText(nextLocation);
    setLocation(nextLocation);

    // Listing type + status
    const nextListingType = p.listingType;
    if (nextListingType === 'buy' || nextListingType === 'rent' || nextListingType === 'pg-hostel') {
      setListingType(nextListingType);
    }

    const nextStatus = p.status;
    if (nextStatus === 'sale' || nextStatus === 'rent' || nextStatus === '') {
      setStatus(nextStatus);
    }

    // Optional filters (only apply if explicitly provided and non-empty)
    if (typeof p.propertyType === 'string' && p.propertyType.trim()) {
      setSelectedPropertyType(p.propertyType);
    }
    if (typeof p.budget === 'string' && p.budget.trim()) {
      setBudget(p.budget);
    }
    if (typeof p.bedrooms === 'string' && p.bedrooms.trim()) {
      setBedrooms(p.bedrooms);
    }
    if (typeof p.area === 'string' && p.area.trim()) {
      setArea(p.area);
    }
    if (typeof p.area === 'string' && p.area.trim()) {
      setArea(p.area);
    }

    // Search Mode
    if (p.searchMode) {
      setSearchMode(p.searchMode);
    }
  }, [routeSyncKey]);

  const hasInitializedBudgetContext = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchBarHeight = 175; // Search bar + dropdown row + results header

  // Search bar: visible at top, hides on scroll down
  const searchBarAnimatedStyle = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, searchBarHeight],
          outputRange: [0, -searchBarHeight],
          extrapolate: 'clamp',
        }),
      },
    ],
    opacity: scrollY.interpolate({
      inputRange: [0, searchBarHeight / 2],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
  };

  // Property type classification (bedroom filter shown for these types only)
  const bedroomBasedTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa',
    'Row House',
    'Independent House',
    'Bungalow',
    'Farm House',
    'Penthouse',
    'PG / Hostel',
  ];

  const areaBasedTypes = [
    'Plot / Land',
    'Commercial Office',
    'Commercial Shop',
    'Co-working Space',
    'Warehouse / Godown',
    'Industrial Property',
  ];

  // Check if property type is bedroom-based or area-based
  const isBedroomBased = useMemo(() => {
    if (selectedPropertyType === 'all') return false;
    return bedroomBasedTypes.some(type =>
      selectedPropertyType.includes(type) || type.includes(selectedPropertyType)
    );
  }, [selectedPropertyType]);

  const isAreaBased = useMemo(() => {
    if (selectedPropertyType === 'all') return false;
    return areaBasedTypes.some(type =>
      selectedPropertyType.includes(type) || type.includes(selectedPropertyType)
    );
  }, [selectedPropertyType]);

  // Check if property type is land/plot
  const isLandProperty = useMemo(() => {
    if (selectedPropertyType === 'all') return false;
    return selectedPropertyType.includes('Plot') ||
      selectedPropertyType.includes('Land') ||
      selectedPropertyType.includes('Industrial Property');
  }, [selectedPropertyType]);

  // Active budget set from price-range-by-property-and-listing-type.md
  const activeBudgetSet = useMemo(
    (): BudgetSetType => getBudgetSetFor(listingType, selectedPropertyType),
    [listingType, selectedPropertyType],
  );

  // Get appropriate max budget from active budget set
  const maxBudgetForType = useMemo(
    () => getMaxSliderForSet(activeBudgetSet),
    [activeBudgetSet],
  );

  // Budget units for display formatting
  const budgetUnits = useMemo(
    () => getBudgetUnitsForSelection(listingType, selectedPropertyType === 'all' ? '' : selectedPropertyType),
    [listingType, selectedPropertyType],
  );

  // Update status when listingType changes - ensure rent filter is applied
  useEffect(() => {
    if (listingType === 'buy') {
      setStatus('sale');
    } else if (listingType === 'rent') {
      setStatus('rent'); // Ensure rent status is set for rent filter
    } else if (listingType === 'pg-hostel') {
      setStatus('rent'); // PG uses rent status
    }
  }, [listingType]);

  // PG/Hostel listing type: auto-select property type and prevent manual change
  useEffect(() => {
    if (listingType === 'pg-hostel') {
      setSelectedPropertyType(pgHostelType.label);
    }
  }, [listingType]);

  // Clear dependent fields when property type or listing type changes
  useEffect(() => {
    // Update max budget when property type or listing type changes
    setMaxBudget(prev => (prev > maxBudgetForType ? maxBudgetForType : prev));

    // Reset min budget if it exceeds new max
    if (minBudget > maxBudgetForType) {
      setMinBudget(0);
    }

    // Invalidate stale bucket label only after initial setup
    if (hasInitializedBudgetContext.current) {
      setBudget('');
    } else {
      hasInitializedBudgetContext.current = true;
    }

    if (selectedPropertyType === 'all') {
      // When category is ALL, budget range is driven by listing type only - ensure it updates
      setBedrooms('');
      setArea('');
      setBudget('');
      setMinBudget(0);
      setMaxBudget(maxBudgetForType);
    } else {
      // Clear bedrooms if switching to area-based type
      if (isAreaBased) {
        setBedrooms('');
      }
      // Clear area if switching to bedroom-based type
      if (isBedroomBased) {
        setArea('');
      }
    }
  }, [selectedPropertyType, isBedroomBased, isAreaBased, listingType, maxBudgetForType, minBudget]);

  // Get all property types for filter
  const allPropertyTypes = useMemo(() => {
    const types = ['all', ...propertyTypes.map(t => t.label), pgHostelType.label];
    return types;
  }, []);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      // Clear previous results immediately when starting new search
      setProperties([]);
      setFilteredProperties([]);

      // Build search filters according to website API specification
      const searchParams: any = {
        limit: 100, // Website uses limit=100
      };

      // Status (sale or rent) - required for filtering
      if (status) {
        searchParams.status = status;
      } else {
        if (listingType === 'buy') {
          searchParams.status = 'sale';
        } else if (listingType === 'rent') {
          searchParams.status = 'rent';
        } else if (listingType === 'pg-hostel') {
          searchParams.status = 'rent'; // PG uses rent status
        }
      }

      // Upcoming projects only (from Upcoming Projects "See All")
      if (projectTypeFilter === 'upcoming') {
        searchParams.project_type = 'upcoming';
      }

      // PG/Hostel listing type OR Rent + PG/Hostel property type: two calls then merge (PG type + available for bachelors)
      // Buy + PG/Hostel: single call, property_type only (no bachelors merge), filter by availability
      const isPGHostelListingType = listingType === 'pg-hostel';
      const isPGHostelPropertyType = selectedPropertyType === PG_HOSTEL_PROPERTY_TYPE;
      const usePGHostelMerge = isPGHostelListingType || (listingType === 'rent' && isPGHostelPropertyType);

      if (listingType === 'buy' && isPGHostelPropertyType) {
        // Buy + PG/Hostel: only property_type, no bachelors (exclude bachelor-only apartments)
        searchParams.property_type = PG_HOSTEL_PROPERTY_TYPE;
      }

      // PART B: Safely get location with trim() - handle null/empty/spaces
      // Priority: location state > searchText > initialLocation from route params
      const currentLocation = (location && location.trim()) ||
        (searchText && searchText.trim()) ||
        (initialLocation && initialLocation.trim()) ||
        '';

      // Get city from route params (for top cities search)
      const cityFromRoute = (routeParams.city || '').trim();

      // PART B: Implement correct fetch logic
      if (currentLocation) {
        // CASE B: Location has value - fetch properties filtered by location
        searchParams.location = currentLocation;
        console.log('[SearchResultsScreen] Fetching properties filtered by location:', currentLocation);
      }

      // Also add city param if available (for better filtering when clicking on top cities)
      if (cityFromRoute) {
        searchParams.city = cityFromRoute;
        // If location is empty but city is provided, use city as location
        if (!currentLocation) {
          searchParams.location = cityFromRoute;
        }
        console.log('[SearchResultsScreen] Adding city filter:', cityFromRoute);
      }

      if (!currentLocation && !cityFromRoute) {
        // CASE A: Location is empty - fetch ALL properties (unfiltered)
        // Don't add location param - API will return all properties
        console.log('[SearchResultsScreen] Location is empty - fetching ALL properties (unfiltered)');
      }


      // Property type (supports compound types like "Villa / Row House")
      // Backend list.php: property_type uses LIKE (e.g. 'PG / Hostel'); do not override when listingType is pg-hostel
      if (selectedPropertyType && selectedPropertyType !== 'all' && listingType !== 'pg-hostel' && !(listingType === 'buy' && isPGHostelPropertyType)) {
        // PG / Hostel for pg-hostel listing type and Buy+PG/Hostel is already set above
        const categoryMap: { [key: string]: string } = {
          'Apartment': 'Residential',
          'Villa': 'Residential',
          'Independent House': 'Residential',
          'Bungalow': 'Residential',
          'Studio Apartment': 'Residential',
          'Penthouse': 'Residential',
          'Farm House': 'Residential',
          'Plot / Land': 'Land',
          'Commercial Office': 'Commercial',
          'Commercial Shop': 'Commercial',
          'Retail Space': 'Commercial',
          'Co-working Space': 'Commercial',
          'Warehouse / Godown': 'Commercial',
          'Industrial Property': 'Industrial',
          'PG / Hostel': PG_HOSTEL_PROPERTY_TYPE,
        };

        const category = categoryMap[selectedPropertyType];
        if (category) {
          searchParams.property_type = category;
          console.log('[SearchResultsScreen] Using property_type:', category, 'for:', selectedPropertyType);
        } else {
          const fallbackType = selectedPropertyType.toLowerCase().replace(/ /g, '-');
          searchParams.property_type = fallbackType;
          console.log('[SearchResultsScreen] Using fallback property_type:', fallbackType);
        }
      }

      // Budget range from central mapping (exact label + numeric min/max)
      const selectedBudgetLabel =
        budget ||
        findBudgetLabelForRange({
          listingType,
          propertyType: selectedPropertyType === 'all' ? undefined : selectedPropertyType,
          min: minBudget,
          max: maxBudget,
          excludeLowestRentOption: listingType === 'rent',
        });
      const hasBudgetFilter = !(minBudget === 0 && maxBudget === maxBudgetForType);
      if (hasBudgetFilter) {
        const budgetUnits = getBudgetUnitsForSelection(
          listingType,
          selectedPropertyType === 'all' ? undefined : selectedPropertyType,
        );
        const multiplier = budgetUnits === 'lakhs' ? 100000 : 1000;
        searchParams.min_price = String(Math.round(minBudget * multiplier));
        searchParams.max_price = String(Math.round(maxBudget * multiplier));
        if (selectedBudgetLabel) {
          searchParams.budget = selectedBudgetLabel;
        }
        searchParams.sort_by = 'price_asc';
      } else {
        searchParams.sort_by = 'newest';
      }

      // Bedrooms (format: "2 BHK", "5+ BHK", etc.) - only for bedroom-based types
      if (bedrooms && isBedroomBased) {
        searchParams.bedrooms = bedrooms;
      }

      // Area range (format: "1000-2000 sq ft", "10000+ sq ft", etc.) - only for area-based types
      if (area && isAreaBased) {
        searchParams.area = area;
      }

      // Project Filters
      if (searchMode === 'projects') {
        if (projectStatus) searchParams.project_status = projectStatus;
        if (possessionDate) searchParams.possession_date = possessionDate;
      }

      // Call API with website-style parameters
      console.log('[SearchResultsScreen] API params:', searchParams);

      let results: any[] = [];
      try {
        // Buy + PG/Hostel: single call, only explicit PG/Hostel, filter by availabilityStatus
        if (listingType === 'buy' && isPGHostelPropertyType) {
          const buyPGParams: any = {
            ...searchParams,
            status: 'sale',
            property_type: PG_HOSTEL_PROPERTY_TYPE,
            limit: 1000,
          };
          delete buyPGParams.available_for_bachelors; // No bachelors merge for Buy
          const response = await propertyService.getProperties(buyPGParams) as any;
          if (response?.success) {
            const raw = response.data?.properties || response.data || [];
            // Only explicit PG/Hostel type; exclude bachelor-only apartments
            // Filter by availabilityStatus = AVAILABLE if present (sale listings)
            results = raw.filter((p: any) => {
              const pt = (p.property_type || p.type || '').toLowerCase();
              const isPGHostel = pt.includes('pg') || pt.includes('hostel') || p.status === 'pg';
              if (!isPGHostel) return false;
              const avail = (p.availability_status || p.availabilityStatus || p.property_status || '').toString().toLowerCase();
              const isAvailable = !avail || avail === 'available' || avail === 'sale';
              return isAvailable;
            });
            console.log('[SearchResultsScreen] Buy+PG/Hostel: raw', raw.length, 'showing', results.length);
          }
        } else if (usePGHostelMerge) {
          // PG/Hostel listing type OR Rent + PG/Hostel: two API calls then merge (same as AllPropertiesScreen)
          // Website behavior: apply budget/min/max filters to both calls, then merge + dedupe.
          const { pgParams, bachelorsParams } = buildPGHostelFetchParams({
            page: 1,
            limit: 1000,
            location: searchParams.location,
            city: searchParams.city,
            min_price: searchParams.min_price,
            max_price: searchParams.max_price,
            budget: searchParams.budget,
            sort_by: searchParams.sort_by,
          });
          const [resPG, resBachelors] = await Promise.all([
            propertyService.getProperties(pgParams) as Promise<any>,
            propertyService.getProperties(bachelorsParams) as Promise<any>,
          ]);
          const byId = new Map<string, any>();
          const add = (list: any[]) => {
            (list || []).forEach((p: any) => {
              const id = String(p.id ?? p.property_id ?? '');
              if (id && !byId.has(id)) byId.set(id, p);
            });
          };
          add(resPG?.success ? (resPG.data?.properties ?? resPG.data ?? []) : []);
          add(resBachelors?.success ? (resBachelors.data?.properties ?? resBachelors.data ?? []) : []);
          // Display: PG/Hostel type OR available for bachelors
          results = Array.from(byId.values()).filter((p: any) => {
            const pt = (p.property_type || p.type || '').toLowerCase();
            const isPGHostel = pt.includes('pg') || pt.includes('hostel') || p.status === 'pg';
            const isAvailableForBachelors = p.available_for_bachelors === true || p.available_for_bachelors === 'true' || p.available_for_bachelors === 1 || p.available_for_bachelors === '1';
            return isPGHostel || isAvailableForBachelors;
          });
          console.log('[SearchResultsScreen] PG/Hostel merge: merged', byId.size, 'unique, showing', results.length);
        } else {
          const response = await propertyService.getProperties(searchParams) as any;
          console.log('[SearchResultsScreen] API response:', response);
          if (response && response.success) {
            results = response.data?.properties || response.data || [];
            console.log('[SearchResultsScreen] Found', results.length, 'properties');
            if (results.length === 0 && searchParams.property_type && selectedPropertyType && selectedPropertyType !== 'all') {
              const specificTypeMap: { [key: string]: string } = {
                'Apartment': 'apartment', 'Villa': 'villa', 'Independent House': 'independent-house',
                'Bungalow': 'bungalow', 'Studio Apartment': 'studio-apartment', 'Penthouse': 'penthouse',
                'Farm House': 'farm-house', 'Plot / Land': 'plot-land', 'Commercial Office': 'commercial-office',
                'Commercial Shop': 'commercial-shop', 'Retail Space': 'retail-space', 'Co-working Space': 'coworking-space',
                'Warehouse / Godown': 'warehouse-godown', 'Industrial Property': 'industrial-property',
                'PG / Hostel': 'pg-hostel',
              };
              const specificType = specificTypeMap[selectedPropertyType];
              if (specificType && searchParams.property_type !== specificType) {
                try {
                  const typeResponse = await propertyService.getProperties({ ...searchParams, property_type: specificType }) as any;
                  if (typeResponse?.success) {
                    const typeResults = typeResponse.data?.properties || typeResponse.data || [];
                    if (typeResults.length > 0) results = typeResults;
                  }
                } catch (e) { /* ignore */ }
              }
            }
          }
        }
      } catch (error) {
        console.error('[SearchResultsScreen] API error:', error);
        try {
          const fallbackParams: any = { limit: 100 };
          if (searchParams.location) fallbackParams.location = searchParams.location;
          if (searchParams.city) fallbackParams.city = searchParams.city;
          if (usePGHostelMerge) {
            const { pgParams, bachelorsParams } = buildPGHostelFetchParams({
              page: 1, limit: 100,
              location: fallbackParams.location, city: fallbackParams.city,
              min_price: searchParams.min_price,
              max_price: searchParams.max_price,
              budget: searchParams.budget,
              sort_by: searchParams.sort_by,
            });
            const [fp1, fp2] = await Promise.all([
              propertyService.getProperties(pgParams) as Promise<any>,
              propertyService.getProperties(bachelorsParams) as Promise<any>,
            ]);
            const byId = new Map<string, any>();
            const add = (list: any[]) => (list || []).forEach((p: any) => {
              const id = String(p.id ?? p.property_id ?? '');
              if (id && !byId.has(id)) byId.set(id, p);
            });
            add(fp1?.success ? (fp1.data?.properties ?? fp1.data ?? []) : []);
            add(fp2?.success ? (fp2.data?.properties ?? fp2.data ?? []) : []);
            results = Array.from(byId.values()).filter((p: any) => {
              const pt = (p.property_type || p.type || '').toLowerCase();
              const isPG = pt.includes('pg') || pt.includes('hostel') || p.status === 'pg';
              const forBachelors = p.available_for_bachelors === true || p.available_for_bachelors === 'true' || p.available_for_bachelors === 1 || p.available_for_bachelors === '1';
              return isPG || forBachelors;
            });
          } else {
            if (listingType === 'buy' && isPGHostelPropertyType) {
              fallbackParams.status = 'sale';
              fallbackParams.property_type = PG_HOSTEL_PROPERTY_TYPE;
            } else {
              fallbackParams.status = status || (listingType === 'buy' ? 'sale' : 'rent');
            }
            const fallbackResponse = await propertyService.getProperties(fallbackParams) as any;
            if (fallbackResponse?.success) {
              results = fallbackResponse.data?.properties || fallbackResponse.data || [];
              if (listingType === 'buy' && isPGHostelPropertyType) {
                results = results.filter((p: any) => {
                  const pt = (p.property_type || '').toLowerCase();
                  return pt.includes('pg') || pt.includes('hostel') || p.status === 'pg';
                });
              }
            }
          }
        } catch (fallbackError) {
          console.error('[SearchResultsScreen] Fallback error:', fallbackError);
        }
      }

      if (projectTypeFilter === 'upcoming') {
        results = results.filter((p: any) => (p.project_type || '') === 'upcoming');
      }

      // Format properties
      const formattedProperties = results.map((prop: any) => {
        const propStatus = prop.status || prop.property_status || 'sale';
        const isRent = propStatus === 'rent';
        const isPG = propStatus === 'pg' || (prop.property_type || '').toLowerCase().includes('pg') || (prop.property_type || '').toLowerCase().includes('hostel');

        const coverUrl = fixImageUrl(prop.cover_image || prop.image || prop.images?.[0] || '') || '';
        const imagesList =
          prop.images && Array.isArray(prop.images)
            ? prop.images.map((url: string) => fixImageUrl(url)).filter(Boolean)
            : undefined;
        const availableForBachelors = prop.available_for_bachelors === true || prop.available_for_bachelors === 'true' || prop.available_for_bachelors === 1 || prop.available_for_bachelors === '1';
        const availabilityStatus = (prop.availability_status || prop.availabilityStatus || '').toString();
        return {
          id: prop.id?.toString() || prop.property_id?.toString() || '',
          name: prop.title || prop.property_title || prop.name || 'Untitled Property',
          location: prop.location || prop.city || prop.address || 'Location not specified',
          price: formatters.price(prop.price || 0, isRent),
          type: (isPG ? 'pg-hostel' : isRent ? 'rent' : 'buy') as 'buy' | 'rent' | 'pg-hostel',
          bedrooms: parseInt(prop.bedrooms || '0'),
          bathrooms: parseInt(prop.bathrooms || '0'),
          area: prop.area || prop.carpet_area || '',
          propertyType: prop.property_type || 'apartment',
          city: prop.city || '',
          state: prop.state || '',
          bhk: prop.bedrooms || 0,
          project_type: prop.project_type,
          cover_image: coverUrl,
          images: imagesList,
          is_favorite: prop.is_favorite || false,
          availableForBachelors,
          availabilityStatus: availabilityStatus || undefined,
        };
      });

      setProperties(formattedProperties);
      setFilteredProperties(formattedProperties);
    } catch (error) {
      console.error('Error loading properties:', error);
      setProperties([]);
      setFilteredProperties([]);
    } finally {
      setLoading(false);
    }
  }, [location, searchText, listingType, selectedPropertyType, budget, bedrooms, area, status, initialLocation, minBudget, maxBudget, maxBudgetForType, isBedroomBased, isAreaBased, isLandProperty, projectTypeFilter, searchMode, projectStatus, possessionDate]);

  // Track if this is the first render to skip initial search trigger
  const isFirstRender = React.useRef(true);

  // Trigger search when location or filters change (debounced)
  // Note: minBudget and maxBudget are excluded to avoid search during rapid filter changes
  // Note: searchText is excluded to prevent searches while typing (only location triggers searches)
  useEffect(() => {
    // Skip initial mount - it's handled by the mount useEffect
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let isMounted = true;

    const searchTimeout = setTimeout(() => {
      if (isMounted) {
        console.log('[SearchResultsScreen] Triggering search - location:', location, 'searchText:', searchText);
        loadProperties();
      }
    }, 500); // Wait 500ms after user stops typing

    return () => {
      isMounted = false;
      clearTimeout(searchTimeout);
    };
  }, [location, listingType, selectedPropertyType, budget, bedrooms, area, loadProperties, searchMode, projectStatus, possessionDate]);

  // Reload when budget preset changes
  useEffect(() => {
    if (isFirstRender.current) return;
    const t = setTimeout(() => loadProperties(), 300);
    return () => clearTimeout(t);
  }, [minBudget, maxBudget, loadProperties]);

  // Sync min/max from route/query budget label when available.
  useEffect(() => {
    if (!budget) return;
    const matchedRange = findBudgetRangeByLabel({
      listingType,
      propertyType: selectedPropertyType === 'all' ? undefined : selectedPropertyType,
      label: budget,
      excludeLowestRentOption: listingType === 'rent',
    });
    if (!matchedRange) return;

    setMinBudget(matchedRange.min);
    setMaxBudget(matchedRange.max);
  }, [budget, listingType, selectedPropertyType]);

  // Load initial properties on mount
  useEffect(() => {
    // PART B: Initialize search text and location from route params (safely handles empty location)
    if (routeLocation) {
      setSearchText(routeLocation);
      setLocation(routeLocation);
    } else {
      // PART B: Empty location - clear search fields, will load ALL properties
      setSearchText('');
      setLocation('');
    }
    // PART B: Always load properties on mount - if location is empty, will load ALL properties
    const timer = setTimeout(() => {
      loadProperties();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh properties when screen is focused (e.g., when Search tab is clicked)
  useFocusEffect(
    useCallback(() => {
      // When Search tab is clicked from bottom navigation, ensure it shows SearchResults with all properties
      // Check if we're in the default state (no location)
      const currentRouteLocation = (routeParams?.query || routeParams?.location || routeParams?.searchQuery || '').trim();

      // If opened from tab bar with no specific params, ensure we load (default listing type is buy)
      if (!currentRouteLocation && !status && properties.length === 0) {
        // Reset search fields and load all properties
        setSearchText('');
        setLocation('');
        setTimeout(() => {
          loadProperties();
        }, 100);
      }
    }, [routeParams, listingType, status, properties.length, loadProperties])
  );

  const applyFilters = () => {
    let filtered = [...properties];

    // Note: Search text filtering is now done server-side via loadProperties
    // This function only handles client-side filters (price, bedrooms, etc.)

    // Listing type (buy/rent/pg-hostel)
    // PG/Hostel mode: merged list already contains PG/Hostel type OR available_for_bachelors.
    if (listingType !== 'pg-hostel') {
      filtered = filtered.filter(p => p.type === listingType);
    }

    // Property category filter - skip when results already merged (PG/Hostel OR bachelors)
    const skipPropertyTypeFilter = listingType === 'pg-hostel' || (listingType === 'rent' && selectedPropertyType === 'PG / Hostel');
    if (selectedPropertyType !== 'all' && !skipPropertyTypeFilter) {
      // Map display labels to property type IDs
      const propTypeMap: { [key: string]: PropertyType } = {
        'Apartment': 'apartment',
        'Villa': 'villa',
        'Independent House': 'independent-house',
        'Bungalow': 'bungalow',
        'Studio Apartment': 'studio-apartment',
        'Penthouse': 'penthouse',
        'Farm House': 'farm-house',
        'Plot / Land': 'plot-land',
        'Commercial Office': 'commercial-office',
        'Commercial Shop': 'commercial-shop',
        'Retail Space': 'retail-space',
        'Co-working Space': 'coworking-space',
        'Warehouse / Godown': 'warehouse-godown',
        'Industrial Property': 'industrial-property',
        'PG / Hostel': 'pg-hostel',
      };
      const propTypeId = propTypeMap[selectedPropertyType];
      if (propTypeId) {
        filtered = filtered.filter(p => {
          // Check if property type matches (handle both old and new formats)
          return p.propertyType === propTypeId ||
            p.propertyType === selectedPropertyType.toLowerCase().replace(/ /g, '-');
        });
      }
    }

    // Bedrooms filter: parse "2 BHK" (exact) or "5+ BHK" (>= 5)
    if (bedrooms && isBedroomBased) {
      const match = bedrooms.match(/^(\d+)\+\s*BHK$/); // 5+ BHK
      const isPlus = Boolean(match);
      const bedroomCount = isPlus ? parseInt(match![1], 10) : parseInt(bedrooms, 10) || (bedrooms === '1RK' ? 1 : 0);
      filtered = filtered.filter(p => {
        const propBedrooms = typeof p.bedrooms === 'number' ? p.bedrooms : parseInt(String(p.bedrooms || '0'), 10) || 0;
        if (isPlus) return propBedrooms >= bedroomCount;
        if (bedrooms === '1RK') return propBedrooms === 1; // 1RK treated as 1 bedroom
        return propBedrooms === bedroomCount;
      });
    }

    // Note: Price filtering is now done server-side via budget parameter
    // No client-side price filtering needed

    setFilteredProperties(filtered);
  };

  // Memoize formatBudgetValue to ensure stable reference
  const formatBudgetValueMemo = useCallback((
    value: number,
    units: 'lakhs' | 'thousands',
  ): string => {
    if (units === 'lakhs') {
      if (value >= 100) {
        return `₹${(value / 100).toFixed(1)} Cr`;
      }
      return `₹${value}L`;
    } else {
      // Rent or PG
      if (value >= 100) {
        return `₹${(value / 100).toFixed(1)} Lakh`;
      }
      return `₹${value}K`;
    }
  }, []);

  // Format budget value for display (keep for backward compatibility)
  const formatBudgetValue = formatBudgetValueMemo;

  const clearFilters = () => {
    setListingType('buy');
    setStatus('sale');
    setSelectedPropertyType('all');
    setBudget('');
    setMinBudget(0);
    setMaxBudget(maxBudgetForType);
    setBedrooms('');
    setArea('');
    setProjectStatus('');
    setPossessionDate('');
    setSearchText('');
    setLocation('');
    setTimeout(() => loadProperties(), 100);
  };

  const handleApplyFilters = () => {
    setShowFilters(false);

    // Update status based on listingType before searching
    if (listingType === 'buy') {
      setStatus('sale');
    } else if (listingType === 'rent') {
      setStatus('rent');
    } else if (listingType === 'pg-hostel') {
      setStatus('rent'); // PG uses rent status
    }

    // Reload properties with new filters after a brief delay to ensure state is updated
    setTimeout(() => {
      console.log('[SearchResultsScreen] Applying filters:', {
        listingType,
        selectedPropertyType,
        budget,
        bedrooms,
        area,
        status,
        location,
      });
      loadProperties();
    }, 100);
  };

  const handleToggleFavorite = async (propertyId: string | number) => {
    try {
      const { buyerService } = await import('../../services/buyer.service');
      const response = await buyerService.toggleFavorite(propertyId) as any;
      if (response && response.success) {
        // Update property in list
        setProperties(prev =>
          prev.map(p =>
            String(p.id) === String(propertyId)
              ? { ...p, is_favorite: response.data?.is_favorite ?? !p.is_favorite }
              : p,
          ),
        );
        setFilteredProperties(prev =>
          prev.map(p =>
            String(p.id) === String(propertyId)
              ? { ...p, is_favorite: response.data?.is_favorite ?? !p.is_favorite }
              : p,
          ),
        );
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleShareProperty = async (property: Property) => {
    try {
      const shareMessage = `Check out this property: ${property.name}\nLocation: ${property.location}\nPrice: ${property.price}\n\nVisit us: https://360coordinates.com`;

      await Share.share({
        message: shareMessage,
        title: property.name,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing property:', error);
      }
    }
  };

  // Format budget for display when no preset label matches
  const formatBudgetDisplay = useCallback((value: number) => {
    return formatBudgetValue(value, budgetUnits);
  }, [budgetUnits, formatBudgetValue]);

  const renderProperty = ({ item }: { item: Property }) => {
    // Determine property type for PropertyCard
    const propertyType = item.type === 'buy' ? 'buy' : item.type === 'rent' ? 'rent' : 'pg-hostel';
    return (
      <PropertyCard
        image={item.cover_image}
        images={item.images}
        name={item.name}
        location={item.location}
        price={item.price}
        type={propertyType}
        isFavorite={item.is_favorite || false}
        onPress={() =>
          navigation.navigate(
            (item as any).project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails',
            { propertyId: String(item.id) },
          )
        }
        onFavoritePress={() => handleToggleFavorite(item.id)}
        onSharePress={() => handleShareProperty(item)}
        property={item}
        style={styles.propertyCardStyle}
      />
    );
  };

  const renderSeparator = () => <View style={styles.propertySeparator} />;

  // Calculate header height: insets.top + header minHeight (60) + padding (spacing.md * 2 = 16 * 2 = 32)
  // More accurate calculation based on actual header structure
  const headerHeight = insets.top + 60 + (spacing.md * 2); // insets.top + minHeight + padding

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => {
          (navigation as any).getParent()?.navigate('Profile');
        }}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={isLoggedIn ? logout : undefined}
        onSignInPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', { screen: 'Login' })
            : undefined
        }
        onSignUpPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', { screen: 'Register' })
            : undefined
        }
        showLogout={isLoggedIn}
        showProfile={isLoggedIn}
        showSignIn={isGuest}
        showSignUp={isGuest}
        scrollY={scrollY}
        headerHeight={headerHeight}
      />

      {/* Search Bar - hides on scroll down, shows at top */}
      <Animated.View style={[styles.searchSectionAnimated, { top: insets.top }, searchBarAnimatedStyle]}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>📍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by city, locality, project"
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={(text: string) => {
                setSearchText(text);
                setShowLocationSuggestions(text.length >= 2);
              }}
              onSubmitEditing={() => {
                const loc = (searchText || '').trim();
                setLocation(loc);
                setSearchText(loc);
                setShowLocationSuggestions(false);
                setTimeout(() => loadProperties(), 100);
              }}
              onBlur={() => {
                // Sync location from search text when leaving the field so filters use it
                const loc = (searchText || '').trim();
                if (loc !== location) setLocation(loc);
              }}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.searchBarSearchButton}
              onPress={() => {
                const loc = (searchText || '').trim();
                setLocation(loc);
                setSearchText(loc);
                setShowLocationSuggestions(false);
                setTimeout(() => loadProperties(), 100);
              }}>
              <Text style={styles.searchBarSearchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
          {showLocationSuggestions && searchText.length >= 2 && (
            <View style={styles.locationSuggestionsContainer}>
              <LocationAutoSuggest
                query={searchText}
                onSelect={(locationData) => {
                  const locationName = locationData.name || locationData.placeName || '';
                  setSearchText(locationName);
                  setLocation(locationName);
                  setShowLocationSuggestions(false);
                  setTimeout(() => {
                    loadProperties();
                  }, 150);
                }}
                visible={showLocationSuggestions}
              />
            </View>
          )}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}>
            <Text style={styles.filterIcon}>🔽</Text>
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>
        </View>
        {/* Quick filters - dropdown theme: Listing type, Property type, Budget */}
        {/* Quick filters - dropdown theme: Listing type, Property type, Budget */}
        <View style={styles.quickFiltersDropdownRow}>
          {searchMode === 'projects' ? (
            <>
              {/* Project Status */}
              <TouchableOpacity
                style={[styles.dropdownTrigger, { flex: 1.2 }]}
                onPress={() => setOpenDropdown(openDropdown === 'projectStatus' ? null : 'projectStatus')}>
                <Text style={styles.dropdownLabel}>Status</Text>
                <Text style={styles.dropdownValue} numberOfLines={1}>
                  {projectStatus || 'Any'}
                </Text>
                <Text style={styles.dropdownChevron}>{openDropdown === 'projectStatus' ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {/* Possession Date */}
              <TouchableOpacity
                style={[styles.dropdownTrigger, { flex: 1.2 }]}
                onPress={() => setOpenDropdown(openDropdown === 'possessionDate' ? null : 'possessionDate')}>
                <Text style={styles.dropdownLabel}>Possession</Text>
                <Text style={styles.dropdownValue} numberOfLines={1}>
                  {possessionDate || 'Any'}
                </Text>
                <Text style={styles.dropdownChevron}>{openDropdown === 'possessionDate' ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Standard Property Filters */
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setOpenDropdown(openDropdown === 'listing' ? null : 'listing')}>
              <Text style={styles.dropdownLabel}>Listing</Text>
              <Text style={styles.dropdownValue} numberOfLines={1}>
                {listingType === 'buy' ? 'Buy' : listingType === 'pg-hostel' ? 'PG/Hostel' : 'Rent'}
              </Text>
              <Text style={styles.dropdownChevron}>{openDropdown === 'listing' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          )}

          {/* Common Filters: Property Type & Budget */}
          <TouchableOpacity
            style={[styles.dropdownTrigger, listingType === 'pg-hostel' && styles.dropdownTriggerDisabled]}
            onPress={() => listingType !== 'pg-hostel' && setOpenDropdown(openDropdown === 'property' ? null : 'property')}
            disabled={listingType === 'pg-hostel'}>
            <Text style={styles.dropdownLabel}>Property</Text>
            <Text style={[styles.dropdownValue, listingType === 'pg-hostel' && styles.dropdownValueDisabled]} numberOfLines={1}>
              {selectedPropertyType === 'all' ? 'All' : selectedPropertyType}
            </Text>
            <Text style={styles.dropdownChevron}>{openDropdown === 'property' ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {searchMode !== 'projects' && (
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setOpenDropdown(openDropdown === 'budget' ? null : 'budget')}>
              <Text style={styles.dropdownLabel}>Price</Text>
              <Text style={styles.dropdownValue} numberOfLines={1}>
                {minBudget === 0 && maxBudget === maxBudgetForType
                  ? 'Any'
                  : findBudgetLabelForRange({
                    listingType,
                    propertyType: selectedPropertyType === 'all' ? undefined : selectedPropertyType,
                    min: minBudget,
                    max: maxBudget,
                    excludeLowestRentOption: listingType === 'rent',
                  }) ||
                  `${formatBudgetDisplay(minBudget)}-${formatBudgetDisplay(maxBudget)}`}
              </Text>
              <Text style={styles.dropdownChevron}>{openDropdown === 'budget' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Dropdown options modal */}
        <Modal visible={openDropdown !== null} transparent animationType="fade">
          <TouchableOpacity style={styles.dropdownBackdrop} activeOpacity={1} onPress={() => setOpenDropdown(null)}>
            <View style={styles.dropdownOptionsBox} onStartShouldSetResponder={() => true}>
              {openDropdown === 'listing' && (
                <>
                  {(['buy', 'rent', 'pg-hostel'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.dropdownOption, listingType === type && styles.dropdownOptionActive]}
                      onPress={() => {
                        setListingType(type);
                        if (type === 'buy') setStatus('sale');
                        else if (type === 'rent' || type === 'pg-hostel') setStatus('rent');
                        setOpenDropdown(null);
                        setTimeout(() => loadProperties(), 150);
                      }}>
                      <Text style={[styles.dropdownOptionText, listingType === type && styles.dropdownOptionTextActive]}>
                        {type === 'buy' ? 'Buy' : type === 'pg-hostel' ? 'PG/Hostel' : 'Rent'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {openDropdown === 'property' && (
                <ScrollView style={styles.dropdownOptionsScroll} nestedScrollEnabled>
                  {allPropertyTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.dropdownOption, selectedPropertyType === type && styles.dropdownOptionActive]}
                      onPress={() => {
                        if (listingType === 'pg-hostel') return; // Disabled when PG/Hostel listing type
                        setSelectedPropertyType(type);
                        setOpenDropdown(null);
                        setTimeout(() => loadProperties(), 150);
                      }}
                      disabled={listingType === 'pg-hostel'}>
                      <Text style={[styles.dropdownOptionText, selectedPropertyType === type && styles.dropdownOptionTextActive]}>
                        {type === 'all' ? 'All types' : type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {openDropdown === 'projectStatus' && (
                <ScrollView style={styles.dropdownOptionsScroll} nestedScrollEnabled>
                  {[
                    { label: 'Any Status', value: '' },
                    { label: 'Pre-Launch', value: 'Pre-Launch' },
                    { label: 'Underconstruction', value: 'Underconstruction' },
                    { label: 'Completed', value: 'Completed' },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.dropdownOption, projectStatus === item.value && styles.dropdownOptionActive]}
                      onPress={() => {
                        setProjectStatus(item.value);
                        setOpenDropdown(null);
                        setTimeout(() => loadProperties(), 150);
                      }}>
                      <Text style={[styles.dropdownOptionText, projectStatus === item.value && styles.dropdownOptionTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {openDropdown === 'possessionDate' && (
                <ScrollView style={styles.dropdownOptionsScroll} nestedScrollEnabled>
                  {[
                    { label: 'Any Time', value: '' },
                    { label: '6 Months', value: '6 Months' },
                    { label: '12 Months', value: '12 Months' },
                    { label: '18 Months', value: '18 Months' },
                    { label: '24 Months+', value: '24 Months+' },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.dropdownOption, possessionDate === item.value && styles.dropdownOptionActive]}
                      onPress={() => {
                        setPossessionDate(item.value);
                        setOpenDropdown(null);
                        setTimeout(() => loadProperties(), 150);
                      }}>
                      <Text style={[styles.dropdownOptionText, possessionDate === item.value && styles.dropdownOptionTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {openDropdown === 'budget' && (
                <ScrollView style={styles.dropdownOptionsScroll} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                  {[
                    { label: 'Any', min: 0, max: maxBudgetForType, budgetLabel: '' },
                    ...getBudgetOptions(activeBudgetSet, listingType === 'rent').map((opt) => ({
                      label: opt.label,
                      min: opt.min,
                      max: opt.max,
                      budgetLabel: opt.label,
                    })),
                  ].map(({ label, min, max, budgetLabel }) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.dropdownOption, minBudget === min && maxBudget === max && styles.dropdownOptionActive]}
                      onPress={() => {
                        setMinBudget(min);
                        setMaxBudget(max);
                        setBudget(budgetLabel);
                        setOpenDropdown(null);
                        setTimeout(() => loadProperties(), 150);
                      }}>
                      <Text style={[styles.dropdownOptionText, minBudget === min && maxBudget === max && styles.dropdownOptionTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
        {/* Results Count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredProperties.length} Properties Found
          </Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Properties List */}
      {loading ? (
        <View style={[styles.loadingContainer, { paddingTop: insets.top + searchBarHeight }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredProperties}
          renderItem={renderProperty}
          keyExtractor={(item: Property) => item.id}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + searchBarHeight, paddingBottom: 100 }]}
          ItemSeparatorComponent={renderSeparator}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No properties found</Text>
              <Text style={styles.emptySubtext}>
                {location || searchText
                  ? `No properties found for "${location || searchText}". Try adjusting your filters or search term.`
                  : 'Try adjusting your filters or search for a location'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating View on Map Button */}
      {!loading && filteredProperties.length > 0 && (
        <TouchableOpacity
          style={styles.floatingMapButton}
          onPress={() => {
            try {
              // Navigate to PropertyMap with current filter params
              const mapParams: any = {};
              mapParams.listingType = listingType;
              navigation.navigate('PropertyMap', mapParams as never);
            } catch (error: any) {
              console.error('Error navigating to map:', error);
            }
          }}>
          <Text style={styles.floatingMapButtonIcon}>🗺️</Text>
          <Text style={styles.floatingMapButtonText}>View on Map</Text>
        </TouchableOpacity>
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filtersScroll}
              showsVerticalScrollIndicator={false}>
              {/* Listing Type (Buy/Rent/PG-Hostel) - Hidden in Project Mode */}
              {searchMode !== 'projects' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Listing Type</Text>
                  <View style={styles.filterOptions}>
                    {(['buy', 'rent', 'pg-hostel'] as const).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.filterChip,
                          listingType === type && styles.filterChipActive,
                        ]}
                        onPress={() => {
                          setListingType(type);
                          if (type === 'buy') setStatus('sale');
                          else if (type === 'rent' || type === 'pg-hostel') setStatus('rent');
                        }}>
                        <Text
                          style={[
                            styles.filterChipText,
                            listingType === type && styles.filterChipTextActive,
                          ]}>
                          {type === 'buy' ? 'Buy' : type === 'pg-hostel' ? 'PG/Hostel' : 'Rent'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Project Status Filters (Only for Projects Mode) */}
              {searchMode === 'projects' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Project Status</Text>
                  <View style={styles.filterOptions}>
                    {[
                      { label: 'Any', value: '' },
                      { label: 'Pre-Launch', value: 'Pre-Launch' },
                      { label: 'Underconstruction', value: 'Underconstruction' },
                      { label: 'Completed', value: 'Completed' },
                    ].map(item => (
                      <TouchableOpacity
                        key={item.value || 'any-status'}
                        style={[
                          styles.filterChip,
                          projectStatus === item.value && styles.filterChipActive,
                        ]}
                        onPress={() => setProjectStatus(item.value)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            projectStatus === item.value && styles.filterChipTextActive,
                          ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Possession Date Filters (Only for Projects Mode) */}
              {searchMode === 'projects' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Possession In</Text>
                  <View style={styles.filterOptions}>
                    {[
                      { label: 'Any', value: '' },
                      { label: '6 Months', value: '6 Months' },
                      { label: '12 Months', value: '12 Months' },
                      { label: '18 Months', value: '18 Months' },
                      { label: '24 Months+', value: '24 Months+' },
                    ].map(item => (
                      <TouchableOpacity
                        key={item.value || 'any-date'}
                        style={[
                          styles.filterChip,
                          possessionDate === item.value && styles.filterChipActive,
                        ]}
                        onPress={() => setPossessionDate(item.value)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            possessionDate === item.value && styles.filterChipTextActive,
                          ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Property Category - disabled when listing type is PG/Hostel */}
              <View style={[styles.filterSection, listingType === 'pg-hostel' && styles.filterSectionDisabled]}>
                <Text style={styles.filterLabel}>Category</Text>
                <View style={styles.filterOptions}>
                  {allPropertyTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterChip,
                        selectedPropertyType === type && styles.filterChipActive,
                        listingType === 'pg-hostel' && styles.filterChipDisabled,
                      ]}
                      onPress={() => listingType !== 'pg-hostel' && setSelectedPropertyType(type)}
                      disabled={listingType === 'pg-hostel'}>
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedPropertyType === type &&
                          styles.filterChipTextActive,
                          listingType === 'pg-hostel' && styles.filterChipTextDisabled,
                        ]}>
                        {type === 'all' ? 'All' : type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Budget Range - preset options only (no slider) */}
              {/* Budget Range - preset options only (no slider) - Hidden in Project Mode */}
              {searchMode !== 'projects' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Budget Range</Text>
                  <View style={styles.filterOptions}>
                    {[
                      { label: 'Any', min: 0, max: maxBudgetForType, budgetLabel: '' },
                      ...getBudgetOptions(activeBudgetSet, listingType === 'rent').map((opt) => ({
                        label: opt.label,
                        min: opt.min,
                        max: opt.max,
                        budgetLabel: opt.label,
                      })),
                    ].map(({ label, min, max, budgetLabel }) => {
                      const isActive = minBudget === min && maxBudget === max;
                      return (
                        <TouchableOpacity
                          key={label}
                          style={[styles.filterChip, isActive && styles.filterChipActive]}
                          onPress={() => {
                            setMinBudget(min);
                            setMaxBudget(max);
                            setBudget(budgetLabel);
                          }}>
                          <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Area - Only show for area-based property types */}
              {isAreaBased && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Area (sq ft)</Text>
                  <View style={styles.filterOptions}>
                    {[
                      { label: 'All', value: '' },
                      { label: '0-500 sq ft', value: '0-500 sq ft' },
                      { label: '500-1000 sq ft', value: '500-1000 sq ft' },
                      { label: '1000-2000 sq ft', value: '1000-2000 sq ft' },
                      { label: '2000-5000 sq ft', value: '2000-5000 sq ft' },
                      { label: '5000-10000 sq ft', value: '5000-10000 sq ft' },
                      { label: '10000+ sq ft', value: '10000+ sq ft' },
                    ].map(option => (
                      <TouchableOpacity
                        key={option.value || 'all'}
                        style={[
                          styles.filterChip,
                          area === option.value && styles.filterChipActive,
                        ]}
                        onPress={() => setArea(option.value)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            area === option.value && styles.filterChipTextActive,
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Bedrooms - Only for bedroom-based property types (Apartment, Villa, PG/Hostel, etc.) */}
              {isBedroomBased && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>
                    {listingType === 'pg-hostel' ? 'Bedroom / Room Type' : 'Bedrooms'}
                  </Text>
                  <View style={styles.filterOptions}>
                    {(
                      listingType === 'pg-hostel'
                        ? [{ label: 'Any', value: '' }, { label: '1RK', value: '1RK' }, { label: '1 BHK', value: '1 BHK' }, { label: '2 BHK', value: '2 BHK' }, { label: '3 BHK', value: '3 BHK' }, { label: '4 BHK', value: '4 BHK' }, { label: '5+ BHK', value: '5+ BHK' }]
                        : [{ label: 'Any', value: '' }, { label: '1 BHK', value: '1 BHK' }, { label: '2 BHK', value: '2 BHK' }, { label: '3 BHK', value: '3 BHK' }, { label: '4 BHK', value: '4 BHK' }, { label: '5+ BHK', value: '5+ BHK' }]
                    ).map(option => (
                      <TouchableOpacity
                        key={option.value || 'any'}
                        style={[
                          styles.filterChip,
                          bedrooms === option.value && styles.filterChipActive,
                        ]}
                        onPress={() => setBedrooms(option.value)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            bedrooms === option.value && styles.filterChipTextActive,
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

            </ScrollView>

            {/* Apply Filters Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View >
      </Modal >
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchSection: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    width: '100%',
    position: 'relative',
    zIndex: 10,
  },
  searchSectionAnimated: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    zIndex: 15,
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
    minWidth: 80,
  },
  searchBarSearchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  searchBarSearchButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  quickFiltersDropdownRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  dropdownLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: 4,
  },
  dropdownValue: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontSize: 13,
  },
  dropdownTriggerDisabled: {
    opacity: 0.6,
  },
  dropdownValueDisabled: {
    color: colors.textSecondary,
  },
  dropdownChevron: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dropdownOptionsBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    minWidth: 220,
    maxHeight: 320,
    paddingVertical: spacing.xs,
  },
  dropdownOptionsScroll: {
    maxHeight: 280,
  },
  dropdownOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dropdownOptionActive: {
    backgroundColor: colors.primary + '20',
  },
  dropdownOptionText: {
    ...typography.body,
    color: colors.text,
  },
  dropdownOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  locationSuggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: spacing.md,
    right: spacing.md,
    marginTop: spacing.xs,
    zIndex: 1000,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  filterIcon: {
    fontSize: 14,
    color: colors.surface,
  },
  filterText: {
    ...typography.body,
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultsCount: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  clearText: {
    ...typography.body,
    color: colors.primary,
    textDecorationLine: 'underline',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.md,
  },
  propertyCardStyle: {
    width: '100%',
    marginRight: 0,
  },
  propertySeparator: {
    height: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.accentSoft,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    color: colors.textSecondary,
    padding: spacing.xs,
  },
  filtersScroll: {
    maxHeight: 500,
  },
  filterSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterSectionDisabled: {
    opacity: 0.6,
  },
  filterLabel: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 14,
  },
  filterChipTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  filterChipDisabled: {
    opacity: 0.6,
  },
  filterChipTextDisabled: {
    color: colors.textSecondary,
  },
  priceInputContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontSize: 12,
    textAlign: 'center',
  },
  priceTextInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  clearButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  budgetRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  budgetValueContainer: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  budgetValueLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  budgetValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  sliderContainer: {
    marginBottom: spacing.md,
  },
  sliderLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sliderInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  sliderInput: {
    width: 80,
    height: 40,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  floatingMapButton: {
    position: 'absolute',
    bottom: 30, // Position above bottom tab menu (65px height + some padding)
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
  floatingMapButtonIcon: {
    fontSize: 20,
  },
  floatingMapButtonText: {
    ...typography.body,
    color: colors.textblack,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default SearchResultsScreen;
