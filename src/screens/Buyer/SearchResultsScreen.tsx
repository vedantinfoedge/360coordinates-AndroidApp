import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
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
import RangeSlider from '../../components/common/RangeSlider';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SearchStackParamList} from '../../navigation/SearchNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import PropertyCard from '../../components/PropertyCard';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import {propertyTypes, pgHostelType, ListingType, PropertyType} from '../../data/propertyTypes';
import {propertyService} from '../../services/property.service';
import {propertySearchService} from '../../services/propertySearch.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';

/**
 * Normalize budget string to backend-expected format (same as website).
 * Backend list.php maps budget to min/max price; keys must match (e.g. 25L-50L, 1Cr+, 50K+).
 */
function normalizeBudgetForBackend(
  budgetString: string,
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel',
): string {
  if (!budgetString || !budgetString.trim()) return budgetString;
  const s = budgetString.trim();

  if (listingType === 'buy') {
    // Backend expects: 0-25L, 25L-50L, 50L-75L, 75L-1Cr, 1Cr-2Cr, 2Cr+
    // App sends: 0L-25L, 25L-50L, 50L-1.0Cr, 1.0Cr-20.0Cr
    const normalized = s.replace(/\.0Cr/g, 'Cr');
    // 0L-25L → 0-25L
    if (normalized === '0L-25L') return '0-25L';
    // Open-ended high range (e.g. 1Cr-20Cr) → 1Cr+
    const buyPlusMatch = normalized.match(/^(\d+)Cr-(\d+)Cr$/);
    if (buyPlusMatch) {
      const lowCr = parseInt(buyPlusMatch[1], 10);
      const highCr = parseInt(buyPlusMatch[2], 10);
      if (highCr >= 10) return `${lowCr}Cr+`;
    }
    return normalized;
  }

  // Rent / PG: backend expects 0K-5K, 5K-10K, 10K-20K, … 2L+
  const rentNormalized = s.replace(/(\d+\.?\d*)Lakh/gi, (_, n) => `${Math.round(parseFloat(n))}L`);
  // 0K-10K is fine; 50K-200K or 50K-1L → 50K+
  const rentPlusMatch = rentNormalized.match(/^(\d+)K-(\d+)(K|L)$/);
  if (rentPlusMatch) {
    const lowK = parseInt(rentPlusMatch[1], 10);
    const highVal = parseInt(rentPlusMatch[2], 10);
    const unit = rentPlusMatch[3];
    if (unit === 'L' || highVal >= 100) return `${lowK}K+`;
  }
  return rentNormalized;
}

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
      listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
      project_type?: 'upcoming' | null;
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
}

const SearchResultsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout, user, isAuthenticated} = useAuth();
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

  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState(initialLocation);
  const [loading, setLoading] = useState(true);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'listing' | 'property' | 'budget' | null>(null);

  // Filters - initialize with route params (Buy, Rent, PG only - no All)
  const [listingType, setListingType] = useState<ListingType | 'all'>(
    initialListingType === 'buy' ? 'buy' : 
    initialListingType === 'pg-hostel' ? 'pg-hostel' : 
    initialListingType === 'rent' ? 'rent' : 'buy'
  );
  
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(initialPropertyType || 'all');
  const [location, setLocation] = useState<string>(initialLocation);
  const [budget, setBudget] = useState<string>(initialBudget);
  // Budget slider values (in base units: Lakhs for buy, thousands for rent)
  const [minBudget, setMinBudget] = useState<number>(0);
  const [maxBudget, setMaxBudget] = useState<number>(1000); // Default max
  // Bedrooms: '' = Any, '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK' (PG also has '1RK')
  const [bedrooms, setBedrooms] = useState<string>(initialBedrooms && /^(1RK|1 BHK|2 BHK|3 BHK|4 BHK|5\+ BHK)$/.test(initialBedrooms) ? initialBedrooms : '');
  const [area, setArea] = useState<string>(initialArea);
  const [status, setStatus] = useState<'sale' | 'rent' | ''>(initialStatus);
  
  // Ref to track if user is actively dragging budget slider (prevents search during drag)
  const isDraggingBudget = useRef(false);
  // Refs to track budget values during drag (without triggering state updates)
  const pendingMinBudget = useRef<number>(0);
  const pendingMaxBudget = useRef<number>(1000);
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

  // Get appropriate max budget based on property type and listing type (memoized)
  const maxBudgetForType = useMemo(() => {
    const propType = selectedPropertyType;
    const listType = listingType;
    if (propType === 'PG / Hostel') {
      return 50; // 50K/month max for PG/Hostel
    } else if (listType === 'buy' && isAreaBased && (propType.includes('Commercial') || propType.includes('Industrial') || propType.includes('Warehouse'))) {
      return 5000; // 50 Cr max for commercial/industrial buy
    } else if (listType === 'buy') {
      return 2000; // 20 Cr max for residential buy
    } else if (listType === 'rent' && isAreaBased && (propType.includes('Co-working') || propType.includes('Warehouse'))) {
      return 500; // 5 Lakh/month max for commercial rent
    } else if (listType === 'rent') {
      return 200; // 2 Lakh/month max for residential rent
    } else if (listType === 'pg-hostel') {
      return 50; // 50K/month max for PG/Hostel
    } else {
      return 500; // Default max
    }
  }, [selectedPropertyType, listingType, isAreaBased]);

  // Keep callback for backward compatibility with useEffect
  const getMaxBudgetForType = useCallback((propType: string, listType: ListingType | 'all'): number => {
    if (propType === 'PG / Hostel') {
      return 50;
    } else if (listType === 'buy' && isAreaBased && (propType.includes('Commercial') || propType.includes('Industrial') || propType.includes('Warehouse'))) {
      return 5000;
    } else if (listType === 'buy') {
      return 2000;
    } else if (listType === 'rent' && isAreaBased && (propType.includes('Co-working') || propType.includes('Warehouse'))) {
      return 500;
    } else if (listType === 'rent') {
      return 200;
    } else if (listType === 'pg-hostel') {
      return 50;
    } else {
      return 500;
    }
  }, [isAreaBased]);

  // Update status when listingType changes - ensure rent filter is applied
  useEffect(() => {
    if (listingType === 'buy') {
      setStatus('sale');
    } else if (listingType === 'rent') {
      setStatus('rent'); // Ensure rent status is set for rent filter
    } else if (listingType === 'pg-hostel') {
      setStatus('rent'); // PG uses rent status
    } else if (listingType === 'all') {
      setStatus('');
    }
  }, [listingType]);

  // Clear dependent fields when property type or listing type changes
  useEffect(() => {
    // Update max budget when property type or listing type changes
    setMaxBudget(maxBudgetForType);
    
    // Reset min budget if it exceeds new max
    if (minBudget >= maxBudgetForType) {
      setMinBudget(0);
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
      } else if (listingType !== 'all') {
        if (listingType === 'buy') {
          searchParams.status = 'sale';
        } else if (listingType === 'rent') {
          searchParams.status = 'rent';
        } else       if (listingType === 'pg-hostel') {
          searchParams.status = 'rent'; // PG uses rent status
        }
      }
      
      // Upcoming projects only (from Upcoming Projects "See All")
      if (projectTypeFilter === 'upcoming') {
        searchParams.project_type = 'upcoming';
      }
      
      // PG/Hostel: same as website - use 1 for PHP backend; two calls then merge (website calls list twice)
      if (listingType === 'pg-hostel') {
        searchParams.property_type = 'PG / Hostel';
        searchParams.available_for_bachelors = '1'; // PHP backend often expects 1/0
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
      if (selectedPropertyType && selectedPropertyType !== 'all' && listingType !== 'pg-hostel') {
        // PG / Hostel is already set above when listingType === 'pg-hostel'
        const categoryMap: {[key: string]: string} = {
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
          'PG / Hostel': 'PG / Hostel', // Backend expects exact 'PG / Hostel' for LIKE
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
      
      // Budget range (format: "25L-50L", "5K-10K", etc.) — normalize to backend-expected format
      // Use slider values if budget string is empty
      const budgetString = budget || getBudgetString(minBudget, maxBudget, listingType, selectedPropertyType);
      if (budgetString) {
        searchParams.budget = normalizeBudgetForBackend(budgetString, listingType);
      }
      
      // Bedrooms (format: "2 BHK", "5+ BHK", etc.) - only for bedroom-based types
      if (bedrooms && isBedroomBased) {
        searchParams.bedrooms = bedrooms;
      }
      
      // Area range (format: "1000-2000 sq ft", "10000+ sq ft", etc.) - only for area-based types
      if (area && isAreaBased) {
        searchParams.area = area;
      }
      
      // Call API with website-style parameters
      console.log('[SearchResultsScreen] API params:', searchParams);
      
      let results: any[] = [];
      try {
        // PG/Hostel: match website exactly - two API calls then merge (website calls list twice)
        if (listingType === 'pg-hostel') {
          const baseParams: any = { limit: 1000, status: 'rent' };
          if (searchParams.location) baseParams.location = searchParams.location;
          if (searchParams.city) baseParams.city = searchParams.city;
          const [resPG, resBachelors] = await Promise.all([
            propertyService.getProperties({ ...baseParams, property_type: 'PG / Hostel' }) as Promise<any>,
            propertyService.getProperties({ ...baseParams, available_for_bachelors: '1' }) as Promise<any>,
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
          // Display rule: show if PG/Hostel type OR available for bachelors (website logic)
          results = Array.from(byId.values()).filter((p: any) => {
            const pt = (p.property_type || p.type || '').toLowerCase();
            const isPGHostel = pt.includes('pg') || pt.includes('hostel') || p.status === 'pg';
            const isAvailableForBachelors = p.available_for_bachelors === true || p.available_for_bachelors === 'true' || p.available_for_bachelors === 1 || p.available_for_bachelors === '1';
            return isPGHostel || isAvailableForBachelors;
          });
          console.log('[SearchResultsScreen] PG/Hostel: merged', byId.size, 'unique, showing', results.length);
        } else {
          const response = await propertyService.getProperties(searchParams) as any;
          console.log('[SearchResultsScreen] API response:', response);
          if (response && response.success) {
            results = response.data?.properties || response.data || [];
            console.log('[SearchResultsScreen] Found', results.length, 'properties');
            if (results.length === 0 && searchParams.property_type && selectedPropertyType && selectedPropertyType !== 'all') {
              const specificTypeMap: {[key: string]: string} = {
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
          if (listingType === 'pg-hostel') {
            fallbackParams.status = 'rent';
            fallbackParams.property_type = 'PG / Hostel';
            fallbackParams.available_for_bachelors = '1';
          } else if (status || listingType !== 'all') {
            fallbackParams.status = status || (listingType === 'buy' ? 'sale' : 'rent');
          }
          const fallbackResponse = await propertyService.getProperties(fallbackParams) as any;
          if (fallbackResponse?.success) {
            results = fallbackResponse.data?.properties || fallbackResponse.data || [];
            if (listingType === 'pg-hostel') {
              results = results.filter((p: any) => {
                const pt = (p.property_type || '').toLowerCase();
                return (pt.includes('pg') || pt.includes('hostel')) && (p.available_for_bachelors === true || p.available_for_bachelors === 'true' || p.available_for_bachelors === 1 || p.available_for_bachelors === '1');
              });
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
          cover_image: coverUrl,
          images: imagesList,
          is_favorite: prop.is_favorite || false,
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
  }, [location, searchText, listingType, selectedPropertyType, budget, bedrooms, area, status, initialLocation, minBudget, maxBudget, isBedroomBased, isAreaBased, isLandProperty, projectTypeFilter]);

  // Track if this is the first render to skip initial search trigger
  const isFirstRender = React.useRef(true);

  // Trigger search when location or filters change (debounced)
  // Note: minBudget and maxBudget are excluded to prevent search during slider drag
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
  }, [location, listingType, selectedPropertyType, budget, bedrooms, area, loadProperties]);
  
  // Separate effect for budget changes (with longer debounce to avoid lag during slider drag)
  useEffect(() => {
    if (isFirstRender.current) {
      return;
    }
    
    // Skip if we're currently dragging (will be handled when drag ends)
    if (isDraggingBudget.current) {
      return;
    }
    
    let isMounted = true;
    const budgetTimeout = setTimeout(() => {
      if (isMounted && !isDraggingBudget.current) {
        loadProperties();
      }
    }, 600); // Debounce delay for budget changes (reduced from 800ms for better responsiveness)

    return () => {
      isMounted = false;
      clearTimeout(budgetTimeout);
    };
  }, [minBudget, maxBudget, loadProperties]);

  // Cleanup budget update timeout on unmount
  useEffect(() => {
    return () => {
      if (budgetUpdateTimeoutRef.current) {
        clearTimeout(budgetUpdateTimeoutRef.current);
      }
    };
  }, []);

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
      // Check if we're in the default state (no location, listingType is 'all')
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
    if (listingType !== 'all') {
      filtered = filtered.filter(p => p.type === listingType);
    }

    // Property category filter
    if (selectedPropertyType !== 'all') {
      // Map display labels to property type IDs
      const propTypeMap: {[key: string]: PropertyType} = {
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
  const formatBudgetValueMemo = useCallback((value: number, type: ListingType | 'all'): string => {
    if (type === 'buy') {
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

  // Convert budget slider values to API format
  const getBudgetString = (min: number, max: number, type: ListingType | 'all', propType?: string): string => {
    const defaultMax = getMaxBudgetForType(propType || selectedPropertyType, type);
    if (min === 0 && max === defaultMax) {
      return ''; // No filter if at default range
    }
    
    if (type === 'buy') {
      const minStr = min >= 100 ? `${(min / 100).toFixed(1)}Cr` : `${min}L`;
      const maxStr = max >= 100 ? `${(max / 100).toFixed(1)}Cr` : `${max}L`;
      return `${minStr}-${maxStr}`;
    } else {
      // Rent or PG/Hostel
      const minStr = min >= 100 ? `${(min / 100).toFixed(1)}Lakh` : `${min}K`;
      const maxStr = max >= 100 ? `${(max / 100).toFixed(1)}Lakh` : `${max}K`;
      return `${minStr}-${maxStr}`;
    }
  };

  const clearFilters = () => {
    setListingType('buy');
    setStatus('sale');
    setSelectedPropertyType('all');
    setBudget('');
    setMinBudget(0);
    setMaxBudget(500);
    setBedrooms('');
    setArea('');
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
    } else if (listingType === 'all') {
      setStatus('');
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
      const {buyerService} = await import('../../services/buyer.service');
      const response = await buyerService.toggleFavorite(propertyId) as any;
      if (response && response.success) {
        // Update property in list
        setProperties(prev =>
          prev.map(p =>
            String(p.id) === String(propertyId)
              ? {...p, is_favorite: response.data?.is_favorite ?? !p.is_favorite}
              : p,
          ),
        );
        setFilteredProperties(prev =>
          prev.map(p =>
            String(p.id) === String(propertyId)
              ? {...p, is_favorite: response.data?.is_favorite ?? !p.is_favorite}
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

  // Throttle timeout ref for budget updates during drag
  const budgetUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized callbacks for RangeSlider - using useCallback with stable dependencies
  const handleBudgetChange = useCallback((min: number, max: number) => {
    // Store pending values in refs (no re-render)
    pendingMinBudget.current = min;
    pendingMaxBudget.current = max;
    
    // If not currently dragging, this is a final update (e.g., on release)
    if (!isDraggingBudget.current) {
      // Clear any pending throttled updates
      if (budgetUpdateTimeoutRef.current) {
        clearTimeout(budgetUpdateTimeoutRef.current);
        budgetUpdateTimeoutRef.current = null;
      }
      // Update state immediately for final values
      setMinBudget(min);
      setMaxBudget(max);
    } else {
      // During drag, only update state periodically to reduce re-renders
      // Use a throttled update (only update every 400ms during drag)
      if (!budgetUpdateTimeoutRef.current) {
        budgetUpdateTimeoutRef.current = setTimeout(() => {
          setMinBudget(pendingMinBudget.current);
          setMaxBudget(pendingMaxBudget.current);
          budgetUpdateTimeoutRef.current = null;
        }, 400);
      }
    }
  }, []);

  // Handle drag start - mark that we're dragging
  const handleBudgetDragStart = useCallback(() => {
    isDraggingBudget.current = true;
    // Clear any pending updates
    if (budgetUpdateTimeoutRef.current) {
      clearTimeout(budgetUpdateTimeoutRef.current);
      budgetUpdateTimeoutRef.current = null;
    }
  }, []);

  // Handle drag end - update final values and trigger search
  const handleBudgetDragEnd = useCallback(() => {
    isDraggingBudget.current = false;
    // Clear any pending throttled updates
    if (budgetUpdateTimeoutRef.current) {
      clearTimeout(budgetUpdateTimeoutRef.current);
      budgetUpdateTimeoutRef.current = null;
    }
    // Update state with final values
    setMinBudget(pendingMinBudget.current);
    setMaxBudget(pendingMaxBudget.current);
  }, []);

  // Memoize formatBudgetDisplay to prevent re-creation on every render
  const formatBudgetDisplay = useCallback((value: number) => {
    return formatBudgetValue(value, listingType);
  }, [listingType, formatBudgetValue]);

  const renderProperty = ({item}: {item: Property}) => {
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
          navigation.navigate('PropertyDetails', {propertyId: item.id})
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
            ? () => (navigation as any).navigate('Auth', {screen: 'Login'})
            : undefined
        }
        onSignUpPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', {screen: 'Register'})
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
      <Animated.View style={[styles.searchSectionAnimated, {top: insets.top}, searchBarAnimatedStyle]}>
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
        <View style={styles.quickFiltersDropdownRow}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setOpenDropdown(openDropdown === 'listing' ? null : 'listing')}>
            <Text style={styles.dropdownLabel}>Listing</Text>
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {listingType === 'buy' ? 'Buy' : listingType === 'pg-hostel' ? 'PG/Hostel' : 'Rent'}
            </Text>
            <Text style={styles.dropdownChevron}>{openDropdown === 'listing' ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setOpenDropdown(openDropdown === 'property' ? null : 'property')}>
            <Text style={styles.dropdownLabel}>Property</Text>
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {selectedPropertyType === 'all' ? 'All' : selectedPropertyType}
            </Text>
            <Text style={styles.dropdownChevron}>{openDropdown === 'property' ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setOpenDropdown(openDropdown === 'budget' ? null : 'budget')}>
            <Text style={styles.dropdownLabel}>Budget</Text>
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {listingType === 'buy'
                ? (minBudget === 0 && maxBudget === maxBudgetForType ? 'Any' : `₹${minBudget >= 100 ? (minBudget / 100) + 'Cr' : minBudget + 'L'}-${maxBudget >= 100 ? (maxBudget / 100) + 'Cr' : maxBudget + 'L'}`)
                : (minBudget === 0 && maxBudget === maxBudgetForType ? 'Any' : `₹${minBudget}K-${maxBudget}K`)}
            </Text>
            <Text style={styles.dropdownChevron}>{openDropdown === 'budget' ? '▲' : '▼'}</Text>
          </TouchableOpacity>
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
                        else setStatus('rent');
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
                      setSelectedPropertyType(type);
                      setOpenDropdown(null);
                      setTimeout(() => loadProperties(), 150);
                    }}>
                    <Text style={[styles.dropdownOptionText, selectedPropertyType === type && styles.dropdownOptionTextActive]}>
                      {type === 'all' ? 'All types' : type}
                    </Text>
                  </TouchableOpacity>
                ))}
                </ScrollView>
              )}
              {openDropdown === 'budget' && (
                <>
                  {(listingType === 'buy'
                    ? [
                        {label: 'Any', min: 0, max: maxBudgetForType},
                        {label: 'Under 25L', min: 0, max: 25},
                        {label: '25L-50L', min: 25, max: 50},
                        {label: '50L-1Cr', min: 50, max: 100},
                        {label: '1Cr+', min: 100, max: maxBudgetForType},
                      ]
                    : [
                        {label: 'Any', min: 0, max: maxBudgetForType},
                        {label: 'Under 10K', min: 0, max: 10},
                        {label: '10K-25K', min: 10, max: 25},
                        {label: '25K-50K', min: 25, max: 50},
                        {label: '50K+', min: 50, max: maxBudgetForType},
                      ]
                  ).map(({label, min, max}) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.dropdownOption, minBudget === min && maxBudget === max && styles.dropdownOptionActive]}
                      onPress={() => {
                        setMinBudget(min);
                        setMaxBudget(max);
                        setOpenDropdown(null);
                        setTimeout(() => loadProperties(), 150);
                      }}>
                      <Text style={[styles.dropdownOptionText, minBudget === min && maxBudget === max && styles.dropdownOptionTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
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
        <View style={[styles.loadingContainer, {paddingTop: insets.top + searchBarHeight}]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredProperties}
          renderItem={renderProperty}
          keyExtractor={(item: Property) => item.id}
          contentContainerStyle={[styles.listContent, {paddingTop: insets.top + searchBarHeight, paddingBottom: 100}]}
          ItemSeparatorComponent={renderSeparator}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {y: scrollY}}}],
            {useNativeDriver: true},
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
              if (listingType !== 'all') {
                mapParams.listingType = listingType;
              }
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
              {/* Listing Type (Buy/Rent/PG-Hostel only) */}
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
                        else setStatus('rent');
                      }}>
                      <Text
                        style={[
                          styles.filterChipText,
                          listingType === type && styles.filterChipTextActive,
                        ]}>
                        {type === 'buy' ? 'Buy' : type === 'rent' ? 'Rent' : 'PG/Hostel'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Property Category */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Category</Text>
                <View style={styles.filterOptions}>
                  {allPropertyTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterChip,
                        selectedPropertyType === type && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedPropertyType(type)}>
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedPropertyType === type &&
                            styles.filterChipTextActive,
                        ]}>
                        {type === 'all' ? 'All' : type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Budget Range Slider */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Budget Range</Text>
                <View style={styles.budgetSliderContainer}>
                  <RangeSlider
                    min={0}
                    max={maxBudgetForType}
                    minValue={minBudget}
                    maxValue={maxBudget}
                    onValueChange={handleBudgetChange}
                    onDragStart={handleBudgetDragStart}
                    onDragEnd={handleBudgetDragEnd}
                    formatValue={formatBudgetDisplay}
                    step={listingType === 'buy' ? 5 : 1}
                    showMarkers={true}
                  />
                  <Text style={styles.priceLabel}>
                    {listingType === 'buy' 
                      ? 'Drag the handles to set your budget range'
                      : 'Drag the handles to set your monthly budget'}
                  </Text>
                </View>
              </View>

              {/* Area - Only show for area-based property types */}
              {isAreaBased && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Area (sq ft)</Text>
                  <View style={styles.filterOptions}>
                    {[
                      {label: 'All', value: ''},
                      {label: '0-500 sq ft', value: '0-500 sq ft'},
                      {label: '500-1000 sq ft', value: '500-1000 sq ft'},
                      {label: '1000-2000 sq ft', value: '1000-2000 sq ft'},
                      {label: '2000-5000 sq ft', value: '2000-5000 sq ft'},
                      {label: '5000-10000 sq ft', value: '5000-10000 sq ft'},
                      {label: '10000+ sq ft', value: '10000+ sq ft'},
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
                        ? [{label: 'Any', value: ''}, {label: '1RK', value: '1RK'}, {label: '1 BHK', value: '1 BHK'}, {label: '2 BHK', value: '2 BHK'}, {label: '3 BHK', value: '3 BHK'}, {label: '4 BHK', value: '4 BHK'}, {label: '5+ BHK', value: '5+ BHK'}]
                        : [{label: 'Any', value: ''}, {label: '1 BHK', value: '1 BHK'}, {label: '2 BHK', value: '2 BHK'}, {label: '3 BHK', value: '3 BHK'}, {label: '4 BHK', value: '4 BHK'}, {label: '5+ BHK', value: '5+ BHK'}]
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
        </View>
      </Modal>
    </View>
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
    shadowOffset: {width: 0, height: 2},
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
    shadowOffset: {width: 0, height: 2},
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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  budgetSliderContainer: {
    marginTop: spacing.sm,
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
