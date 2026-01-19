import React, {useState, useEffect, useMemo, useCallback} from 'react';
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
} from 'react-native';
import RangeSlider from '../../components/common/RangeSlider';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
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

type SearchResultsScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<SearchStackParamList, 'SearchResults'>,
  BottomTabNavigationProp<any, 'Search'>
>;

type Props = {
  navigation: SearchResultsScreenNavigationProp;
  route?: {
    params?: {
      searchQuery?: string;
      location?: string;
      city?: string;
      propertyType?: string;
      budget?: string;
      bedrooms?: string;
      area?: string;
      status?: 'sale' | 'rent';
      listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
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
  is_favorite: boolean;
}

const SearchResultsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout} = useAuth();
  const routeParams = route?.params || {};
  
  // Initialize from route params (website-style search)
  const initialLocation = routeParams.location || routeParams.searchQuery || '';
  const initialCity = routeParams.city || '';
  const initialPropertyType = routeParams.propertyType || '';
  const initialBudget = routeParams.budget || '';
  const initialBedrooms = routeParams.bedrooms || '';
  const initialArea = routeParams.area || '';
  const initialStatus = routeParams.status || (routeParams.listingType === 'buy' ? 'sale' : routeParams.listingType === 'rent' ? 'rent' : '');
  const initialListingType = routeParams.listingType || 'all';

  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState(initialLocation);
  const [loading, setLoading] = useState(true);

  // Filters - initialize with route params (website-style)
  const [listingType, setListingType] = useState<ListingType | 'all'>(
    initialListingType === 'buy' ? 'buy' : 
    initialListingType === 'pg-hostel' ? 'pg-hostel' : 
    initialListingType === 'rent' ? 'rent' : 'all'
  );
  
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(initialPropertyType || 'all');
  const [location, setLocation] = useState<string>(initialLocation);
  const [budget, setBudget] = useState<string>(initialBudget);
  // Budget slider values (in base units: Lakhs for buy, thousands for rent)
  const [minBudget, setMinBudget] = useState<number>(0);
  const [maxBudget, setMaxBudget] = useState<number>(1000); // Default max
  const [bedrooms, setBedrooms] = useState<number | null>(initialBedrooms ? parseInt(initialBedrooms) : null);
  const [area, setArea] = useState<string>(initialArea);
  const [status, setStatus] = useState<'sale' | 'rent' | ''>(initialStatus);
  const [bathrooms, setBathrooms] = useState<number | null>(null);

  // Property type classification
  const bedroomBasedTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa',
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

  // Check if property type is land/plot (bathrooms not applicable)
  const isLandProperty = useMemo(() => {
    if (selectedPropertyType === 'all') return false;
    return selectedPropertyType.includes('Plot') || 
           selectedPropertyType.includes('Land') ||
           selectedPropertyType.includes('Industrial Property');
  }, [selectedPropertyType]);

  // Get appropriate max budget based on property type and listing type
  const getMaxBudgetForType = useCallback((propType: string, listType: ListingType | 'all'): number => {
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
  }, [isAreaBased]);

  // Clear dependent fields when property type or listing type changes
  useEffect(() => {
    // Update max budget when property type or listing type changes
    const newMaxBudget = getMaxBudgetForType(selectedPropertyType, listingType);
    setMaxBudget(newMaxBudget);
    
    // Reset min budget if it exceeds new max
    if (minBudget >= newMaxBudget) {
      setMinBudget(0);
    }
    
    if (selectedPropertyType === 'all') {
      setBedrooms(null);
      setArea('');
      setBudget('');
      setMinBudget(0);
    } else {
      // Clear bedrooms if switching to area-based type
      if (isAreaBased) {
        setBedrooms(null);
      }
      // Clear area if switching to bedroom-based type
      if (isBedroomBased) {
        setArea('');
      }
      // Clear bathrooms if switching to land property
      if (isLandProperty) {
        setBathrooms(null);
      }
    }
  }, [selectedPropertyType, isBedroomBased, isAreaBased, isLandProperty, listingType, getMaxBudgetForType, minBudget]);

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
        } else if (listingType === 'pg-hostel') {
          searchParams.status = 'rent'; // PG uses rent status
        }
      }
      
      // Location (preferred over city according to website spec)
      // Priority: location state > searchText > initialLocation from route params
      const currentLocation = (location && location.trim()) || (searchText && searchText.trim()) || (initialLocation && initialLocation.trim()) || '';
      if (currentLocation) {
        searchParams.location = currentLocation;
        console.log('[SearchResultsScreen] Using location for search:', currentLocation);
      } else {
        console.log('[SearchResultsScreen] No location provided - loading all properties');
      }
      
      
      // Property type (supports compound types like "Villa / Row House")
      // Backend API expects category: 'Residential', 'Commercial', 'Land', 'Industrial'
      if (selectedPropertyType && selectedPropertyType !== 'all') {
        // Map display labels to API categories
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
          'PG / Hostel': 'Residential', // PG/Hostel might be under Residential or separate
        };
        
        const category = categoryMap[selectedPropertyType];
        if (category) {
          searchParams.property_type = category;
          console.log('[SearchResultsScreen] Using property_type category:', category, 'for:', selectedPropertyType);
        } else {
          // Fallback: try specific type if category not found
          const fallbackType = selectedPropertyType.toLowerCase().replace(/ /g, '-');
          searchParams.property_type = fallbackType;
          console.log('[SearchResultsScreen] Using fallback property_type:', fallbackType);
        }
      }
      
      // Budget range (format: "25L-50L", "5K-10K", etc.)
      // Use slider values if budget string is empty
      const budgetString = budget || getBudgetString(minBudget, maxBudget, listingType, selectedPropertyType);
      if (budgetString) {
        searchParams.budget = budgetString;
      }
      
      // Bedrooms (format: "2 BHK", "5+ BHK", etc.) - only for bedroom-based types
      if (bedrooms !== null && isBedroomBased) {
        searchParams.bedrooms = bedrooms.toString();
      }
      
      // Area range (format: "1000-2000 sq ft", "10000+ sq ft", etc.) - only for area-based types
      if (area && isAreaBased) {
        searchParams.area = area;
      }
      
      // Bathrooms filter (not applicable for land/plot properties)
      if (bathrooms !== null && !isLandProperty) {
        searchParams.bathrooms = bathrooms.toString();
      }
      
      // Call API with website-style parameters
      console.log('[SearchResultsScreen] API params:', searchParams);
      
      let results: any[] = [];
      try {
        const response = await propertyService.getProperties(searchParams) as any;
        console.log('[SearchResultsScreen] API response:', response);
        
        if (response && response.success) {
          results = response.data?.properties || response.data || [];
          console.log('[SearchResultsScreen] Found', results.length, 'properties');
          
          // If no results and we used category, try with specific type as fallback
          if (results.length === 0 && searchParams.property_type && selectedPropertyType && selectedPropertyType !== 'all') {
            const specificTypeMap: {[key: string]: string} = {
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
            
            const specificType = specificTypeMap[selectedPropertyType];
            if (specificType && searchParams.property_type !== specificType) {
              console.log('[SearchResultsScreen] No results with category, trying specific type:', specificType);
              const typeParams = {...searchParams};
              typeParams.property_type = specificType;
              
              try {
                const typeResponse = await propertyService.getProperties(typeParams) as any;
                if (typeResponse && typeResponse.success) {
                  const typeResults = typeResponse.data?.properties || typeResponse.data || [];
                  if (typeResults.length > 0) {
                    console.log('[SearchResultsScreen] Found', typeResults.length, 'properties with specific type filter');
                    results = typeResults;
                  }
                }
              } catch (typeError) {
                console.error('[SearchResultsScreen] Specific type filter error:', typeError);
              }
            }
          }
        }
      } catch (error) {
        console.error('[SearchResultsScreen] API error:', error);
        // Fallback: try without some filters if error occurs
        try {
          const fallbackParams: any = {limit: 100};
          if (currentLocation) fallbackParams.location = currentLocation;
          if (status || listingType !== 'all') {
            fallbackParams.status = status || (listingType === 'buy' ? 'sale' : 'rent');
          }
          const fallbackResponse = await propertyService.getProperties(fallbackParams) as any;
          if (fallbackResponse && fallbackResponse.success) {
            results = fallbackResponse.data?.properties || fallbackResponse.data || [];
          }
        } catch (fallbackError) {
          console.error('[SearchResultsScreen] Fallback error:', fallbackError);
        }
      }
      
      // Format properties
      const formattedProperties = results.map((prop: any) => {
        const propStatus = prop.status || prop.property_status || 'sale';
        const isRent = propStatus === 'rent';
        const isPG = propStatus === 'pg' || (prop.property_type || '').toLowerCase().includes('pg') || (prop.property_type || '').toLowerCase().includes('hostel');
        
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
          cover_image: fixImageUrl(prop.cover_image || prop.image || prop.images?.[0] || '') || '',
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
  }, [location, searchText, listingType, selectedPropertyType, budget, bedrooms, area, status, initialLocation, bathrooms, minBudget, maxBudget, isBedroomBased, isAreaBased, isLandProperty]);

  // Track if this is the first render to skip initial search trigger
  const isFirstRender = React.useRef(true);

  // Trigger search when location or filters change (debounced)
  // Note: minBudget and maxBudget are excluded to prevent search during slider drag
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
  }, [location, searchText, listingType, selectedPropertyType, budget, bedrooms, area, bathrooms, loadProperties]);
  
  // Separate effect for budget changes (with longer debounce to avoid lag during slider drag)
  useEffect(() => {
    if (isFirstRender.current) {
      return;
    }
    
    let isMounted = true;
    const budgetTimeout = setTimeout(() => {
      if (isMounted) {
        loadProperties();
      }
    }, 800); // Longer delay for budget to avoid lag during slider drag

    return () => {
      isMounted = false;
      clearTimeout(budgetTimeout);
    };
  }, [minBudget, maxBudget, loadProperties]);

  // Load initial properties on mount
  useEffect(() => {
    if (initialLocation) {
      setSearchText(initialLocation);
      setLocation(initialLocation);
    }
    // Always load properties on mount, even without location
    const timer = setTimeout(() => {
      loadProperties();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Bedrooms filter (skip for PG/Hostel and commercial properties)
    if (bedrooms !== null && listingType !== 'pg-hostel') {
      filtered = filtered.filter(p => {
        if (p.type === 'pg-hostel') return true;
        return p.bedrooms === bedrooms;
      });
    }

    // Bathrooms filter (skip for PG/Hostel, land properties, and commercial properties)
    if (bathrooms !== null && listingType !== 'pg-hostel' && !isLandProperty) {
      filtered = filtered.filter(p => {
        if (p.type === 'pg-hostel') return true;
        return p.bathrooms === bathrooms;
      });
    }

    // Note: Price filtering is now done server-side via budget parameter
    // No client-side price filtering needed

    setFilteredProperties(filtered);
  };

  // Format budget value for display
  const formatBudgetValue = (value: number, type: ListingType | 'all'): string => {
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
  };

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
    setListingType('all');
    setSelectedPropertyType('all');
    setBudget('');
    setMinBudget(0);
    setMaxBudget(500); // Default max
    setBedrooms(null);
    setArea('');
    setStatus('');
    setBathrooms(null);
    setSearchText('');
    setLocation('');
    // Reload properties after clearing filters
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
        bathrooms,
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
      const {Share} = require('react-native');
      const shareUrl = `https://demo1.indiapropertys.com/property/${property.id}`;
      const shareMessage = `Check out this property: ${property.name}\nLocation: ${property.location}\nPrice: ${property.price}\n\nView more: ${shareUrl}`;
      
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

  // Optimized callbacks for RangeSlider
  const handleBudgetChange = useCallback((min: number, max: number) => {
    setMinBudget(min);
    setMaxBudget(max);
  }, []);

  const formatBudgetDisplay = useCallback((value: number) => {
    return formatBudgetValue(value, listingType);
  }, [listingType]);

  const renderProperty = ({item}: {item: Property}) => {
    // Determine property type for PropertyCard
    const propertyType = item.type === 'buy' ? 'buy' : item.type === 'rent' ? 'rent' : 'pg-hostel';
    
    return (
      <PropertyCard
        image={item.cover_image}
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

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => {
          // Navigate to Profile tab in MainTabNavigator
          (navigation as any).getParent()?.navigate('Profile');
        }}
        onSupportPress={() => {
          // Navigate to support - can add later
        }}
        onLogoutPress={logout}
      />

      {/* Search Bar */}
      <View style={[styles.searchSection, {marginTop: insets.top + 70}]}>
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city, locality, project"
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              setLocation(text); // Update location immediately when typing
            }}
            onSubmitEditing={() => {
              // Force immediate search on submit
              loadProperties();
            }}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}>
            <Text style={styles.filterIcon}>🔽</Text>
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredProperties.length} Properties Found
        </Text>
        <TouchableOpacity onPress={clearFilters}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Properties List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProperties}
          renderItem={renderProperty}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, {paddingBottom: 100}]}
          ItemSeparatorComponent={renderSeparator}
          showsVerticalScrollIndicator={false}
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
              {/* Listing Type (Buy/Rent/PG-Hostel) */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Listing Type</Text>
                <View style={styles.filterOptions}>
                  {['all', 'buy', 'rent', 'pg-hostel'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterChip,
                        listingType === type && styles.filterChipActive,
                      ]}
                      onPress={() =>
                        setListingType(type as ListingType | 'all')
                      }>
                      <Text
                        style={[
                          styles.filterChipText,
                          listingType === type && styles.filterChipTextActive,
                        ]}>
                        {type === 'all' 
                          ? 'All' 
                          : type === 'buy' 
                          ? 'Buy' 
                          : type === 'rent'
                          ? 'Rent'
                          : 'PG/Hostel'}
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
                <Text style={styles.filterLabel}>Budget</Text>
                <View style={styles.budgetSliderContainer}>
                  <RangeSlider
                    min={0}
                    max={getMaxBudgetForType(selectedPropertyType, listingType)}
                    minValue={minBudget}
                    maxValue={maxBudget}
                    onValueChange={handleBudgetChange}
                    formatValue={formatBudgetDisplay}
                    step={listingType === 'buy' ? 5 : 1}
                    showMarkers={true}
                    gradientColors={
                      listingType === 'buy'
                        ? [colors.accent, colors.primary, colors.secondary]
                        : [colors.accent, colors.primary, colors.accent]
                    }
                  />
                  <Text style={styles.priceLabel}>
                    {(() => {
                      const max = getMaxBudgetForType(selectedPropertyType, listingType);
                      if (selectedPropertyType === 'PG / Hostel' || listingType === 'pg-hostel') {
                        return `Range: 0 to ${formatBudgetValue(max, listingType)}/month (in thousands)`;
                      } else if (listingType === 'buy') {
                        return `Range: 0 to ${formatBudgetValue(max, listingType)} (in Lakhs)`;
                      } else {
                        return `Range: 0 to ${formatBudgetValue(max, listingType)}/month (in thousands)`;
                      }
                    })()}
                  </Text>
                </View>
              </View>

              {/* Bedrooms - Only show for bedroom-based property types */}
              {isBedroomBased && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Bedrooms</Text>
                  <View style={styles.filterOptions}>
                    {[null, 1, 2, 3, 4, 5].map(num => (
                      <TouchableOpacity
                        key={num ?? 'all'}
                        style={[
                          styles.filterChip,
                          bedrooms === num && styles.filterChipActive,
                        ]}
                        onPress={() => setBedrooms(num)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            bedrooms === num && styles.filterChipTextActive,
                          ]}>
                          {num === null ? 'All' : `${num}+`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

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

              {/* Bathrooms - Hide for land/plot properties */}
              {!isLandProperty && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Bathrooms</Text>
                  <View style={styles.filterOptions}>
                    {[null, 1, 2, 3, 4].map(num => (
                      <TouchableOpacity
                        key={num ?? 'all'}
                        style={[
                          styles.filterChip,
                          bathrooms === num && styles.filterChipActive,
                        ]}
                        onPress={() => setBathrooms(num)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            bathrooms === num && styles.filterChipTextActive,
                          ]}>
                          {num === null ? 'All' : `${num}+`}
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
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
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
    color: colors.text,
    textDecorationLine: 'underline',
    fontSize: 14,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  filtersScroll: {
    maxHeight: 500,
  },
  filterSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  filterChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
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
    marginBottom: spacing.xs,
    fontSize: 12,
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
    borderTopColor: colors.border,
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
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
