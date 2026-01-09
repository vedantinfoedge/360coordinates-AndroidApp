import React, {useState, useEffect, useMemo} from 'react';
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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import PropertyCard from '../../components/PropertyCard';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import {propertyTypes, pgHostelType, ListingType, PropertyType} from '../../data/propertyTypes';
import {propertyService} from '../../services/property.service';
import {propertySearchService} from '../../services/propertySearch.service';
import {commonService} from '../../services/common.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';

type SearchResultsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'SearchResults' | 'PropertyList'>,
  NativeStackNavigationProp<RootStackParamList>
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
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || 'all');
  const [location, setLocation] = useState<string>(initialLocation);
  const [budget, setBudget] = useState<string>(initialBudget);
  const [bedrooms, setBedrooms] = useState<number | null>(initialBedrooms ? parseInt(initialBedrooms) : null);
  const [area, setArea] = useState<string>(initialArea);
  const [status, setStatus] = useState<'sale' | 'rent' | ''>(initialStatus);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [cities, setCities] = useState<string[]>(['all']);

  // Get all property types for filter
  const allPropertyTypes = useMemo(() => {
    const types = ['all', ...propertyTypes.map(t => t.label), pgHostelType.label];
    return types;
  }, []);

  // Load cities from API
  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const response = await commonService.getCities();
      if (response && response.success) {
        const citiesData = response.data?.cities || response.data || [];
        const cityNames = Array.isArray(citiesData) 
          ? citiesData.map((city: any) => city.name || city.city_name || city).filter(Boolean)
          : [];
        setCities(['all', ...cityNames]);
        
        // After cities are loaded, check if search query matches a city
        const currentQuery = searchText.trim() || initialLocation;
        if (currentQuery) {
          const matchedCity = cityNames.find((city: string) => 
            city.toLowerCase() === currentQuery.toLowerCase()
          );
          if (matchedCity && selectedCity === 'all') {
            setSelectedCity(matchedCity);
            // Reload properties with city filter
            setTimeout(() => loadProperties(), 100);
          }
        }
      }
    } catch (error) {
      console.error('Error loading cities:', error);
      // Fallback to common Indian cities
      const fallbackCities = ['all', 'Mumbai', 'Bangalore', 'Pune', 'Gurgaon', 'Hyderabad', 'Noida', 'Delhi'];
      setCities(fallbackCities);
      
      // Check if search query matches a fallback city
      const currentQuery = searchText.trim() || initialLocation;
      if (currentQuery) {
        const matchedCity = fallbackCities.find((city: string) => 
          city !== 'all' && city.toLowerCase() === currentQuery.toLowerCase()
        );
        if (matchedCity && selectedCity === 'all') {
          setSelectedCity(matchedCity);
          setTimeout(() => loadProperties(), 100);
        }
      }
    }
  };

  // Debounced search - trigger API call when search text, location, or filters change
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      loadProperties();
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(searchTimeout);
  }, [searchText, location, listingType, selectedCity]);

  // Load initial properties on mount
  useEffect(() => {
    if (initialLocation) {
      setSearchText(initialLocation);
      setLocation(initialLocation);
      // Check if initialLocation matches a city name
      const matchedCity = cities.find(city => 
        city !== 'all' && city.toLowerCase() === initialLocation.toLowerCase().trim()
      );
      if (matchedCity) {
        setSelectedCity(matchedCity);
      }
    }
    // Delay loadProperties slightly to ensure state is set
    const timer = setTimeout(() => {
      loadProperties();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Apply client-side filters for property type, bedrooms, bathrooms
  useEffect(() => {
    if (properties.length > 0) {
      applyFilters();
    }
  }, [
    selectedPropertyType,
    bedrooms,
    bathrooms,
    properties,
  ]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      
      // Build search filters according to website API specification
      const searchParams: any = {
        limit: 100, // Website uses limit=100
      };
      
      // Status (sale or rent) - required for filtering
      if (status) {
        searchParams.status = status;
      } else if (listingType !== 'all') {
        searchParams.status = listingType === 'buy' ? 'sale' : listingType === 'rent' ? 'rent' : 'rent';
      }
      
      // Location (preferred over city according to website spec)
      const currentLocation = location.trim() || searchText.trim() || initialLocation;
      if (currentLocation) {
        searchParams.location = currentLocation;
      }
      
      // City (used if location is not provided)
      if (!currentLocation && selectedCity !== 'all') {
        searchParams.city = selectedCity;
      } else if (selectedCity !== 'all' && !currentLocation.includes(selectedCity)) {
        // Add city if location doesn't already contain it
        searchParams.city = selectedCity;
      }
      
      // Property type (supports compound types like "Villa / Row House")
      if (selectedPropertyType && selectedPropertyType !== 'all') {
        searchParams.property_type = selectedPropertyType;
      }
      
      // Budget range (format: "25L-50L", "5K-10K", etc.)
      if (budget) {
        searchParams.budget = budget;
      }
      
      // Bedrooms (format: "2 BHK", "5+ BHK", etc.)
      if (bedrooms) {
        searchParams.bedrooms = bedrooms;
      }
      
      // Area range (format: "1000-2000 sq ft", "10000+ sq ft", etc.)
      if (area) {
        searchParams.area = area;
      }
      
      // Call API with website-style parameters
      console.log('[SearchResultsScreen] API params:', searchParams);
      
      let results: any[] = [];
      try {
        const response = await propertyService.getProperties(searchParams);
        console.log('[SearchResultsScreen] API response:', response);
        
        if (response && response.success) {
          results = response.data?.properties || response.data || [];
          console.log('[SearchResultsScreen] Found', results.length, 'properties');
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
          const fallbackResponse = await propertyService.getProperties(fallbackParams);
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
          type: isPG ? 'pg-hostel' : isRent ? 'rent' : 'buy',
          bedrooms: parseInt(prop.bedrooms || '0'),
          bathrooms: parseInt(prop.bathrooms || '0'),
          area: prop.area || prop.carpet_area || '',
          propertyType: prop.property_type || 'apartment',
          city: prop.city || '',
          state: prop.state || '',
          bhk: prop.bedrooms || 0,
          cover_image: fixImageUrl(prop.cover_image || prop.image || prop.images?.[0] || ''),
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
  };

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

    // City filter
    if (selectedCity !== 'all') {
      filtered = filtered.filter(p => p.city === selectedCity);
    }

    // Bedrooms filter (skip for PG/Hostel and commercial properties)
    if (bedrooms !== null && listingType !== 'pg-hostel') {
      filtered = filtered.filter(p => {
        if (p.type === 'pg-hostel') return true;
        return p.bedrooms === bedrooms;
      });
    }

    // Bathrooms filter (skip for PG/Hostel and commercial properties)
    if (bathrooms !== null && listingType !== 'pg-hostel') {
      filtered = filtered.filter(p => {
        if (p.type === 'pg-hostel') return true;
        return p.bathrooms === bathrooms;
      });
    }

    // Note: Price filtering is now done server-side via budget parameter
    // No client-side price filtering needed

    setFilteredProperties(filtered);
  };

  const clearFilters = () => {
    setListingType('all');
    setSelectedPropertyType('all');
    setSelectedCity('all');
    setBudget('');
    setBedrooms(null);
    setArea('');
    setStatus('');
    setBathrooms(null);
    setSearchText('');
    setLocation('');
  };

  const handleToggleFavorite = async (propertyId: string | number) => {
    try {
      const {buyerService} = await import('../../services/buyer.service');
      const response = await buyerService.toggleFavorite(propertyId);
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
      />
    );
  };

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => {
          // Navigate to support - will add later
        }}
        onLogoutPress={logout}
      />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city, locality, project"
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => loadProperties()}
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
      <FlatList
        data={filteredProperties}
        renderItem={renderProperty}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No properties found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters
            </Text>
          </View>
        }
      />

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

              {/* City Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>City</Text>
                <View style={styles.filterOptions}>
                  {cities.map(city => (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.filterChip,
                        selectedCity === city && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedCity(city)}>
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedCity === city && styles.filterChipTextActive,
                        ]}>
                        {city === 'all' ? 'All Cities' : city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Bedrooms */}
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

              {/* Bathrooms */}
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
                onPress={() => setShowFilters(false)}>
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
});

export default SearchResultsScreen;
