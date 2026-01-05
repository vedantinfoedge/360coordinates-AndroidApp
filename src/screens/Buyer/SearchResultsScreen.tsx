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
import {demoProperties} from '../../data/demoProperties';
import {propertyTypes, pgHostelType, ListingType, PropertyType} from '../../data/propertyTypes';

type SearchResultsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'PropertyList'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SearchResultsScreenNavigationProp;
  route?: {
    params?: {
      searchQuery?: string;
    };
  };
};

// Using demo properties from data file
const allProperties = demoProperties.map(prop => ({
  id: prop.id,
  name: prop.title,
  location: prop.location,
  price: prop.price,
  type: prop.type as 'buy' | 'rent' | 'pg-hostel',
  bedrooms: prop.bedrooms || 0,
  bathrooms: prop.bathrooms || 0,
  area: prop.area || '',
  propertyType: prop.propertyType,
  city: prop.city,
  state: prop.state,
  bhk: prop.bhk,
}));

const SearchResultsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout} = useAuth();
  const initialQuery = route?.params?.searchQuery || '';

  const [properties, setProperties] = useState<Property[]>(allProperties);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(allProperties);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery) {
      setSearchText(initialQuery);
      applyFilters();
    }
  }, [initialQuery]);

  // Filters
  const [listingType, setListingType] = useState<ListingType | 'all'>('all');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);

  // Get all property types for filter
  const allPropertyTypes = useMemo(() => {
    const types = ['all', ...propertyTypes.map(t => t.label), pgHostelType.label];
    return types;
  }, []);

  const cities = ['all', 'Mumbai', 'Bangalore', 'Pune', 'Gurgaon', 'Hyderabad', 'Noida', 'Delhi'];

  useEffect(() => {
    applyFilters();
  }, [
    searchText,
    listingType,
    selectedPropertyType,
    selectedCity,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
  ]);

  const applyFilters = () => {
    let filtered = [...allProperties];

    // Search text filter
    if (searchText.trim()) {
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(searchText.toLowerCase()) ||
          p.location.toLowerCase().includes(searchText.toLowerCase()) ||
          p.city.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

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

    // Price filter
    if (minPrice || maxPrice) {
      filtered = filtered.filter(p => {
        const priceStr = p.price.replace(/[₹,]/g, '').toLowerCase();
        const isRent = priceStr.includes('month');
        const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, ''));

        if (isRent || p.type === 'pg-hostel') {
          // For rent and PG/Hostel, price is in thousands
          const min = minPrice ? parseFloat(minPrice) : 0;
          const max = maxPrice ? parseFloat(maxPrice) : Infinity;
          return priceNum >= min && priceNum <= max;
        } else {
          // For buy properties, convert Cr to Lakhs
          const priceInLakhs = priceStr.includes('cr')
            ? priceNum * 100
            : priceNum;
          const min = minPrice ? parseFloat(minPrice) : 0;
          const max = maxPrice ? parseFloat(maxPrice) : Infinity;
          return priceInLakhs >= min && priceInLakhs <= max;
        }
      });
    }

    setFilteredProperties(filtered);
  };

  const clearFilters = () => {
    setListingType('all');
    setSelectedPropertyType('all');
    setSelectedCity('all');
    setMinPrice('');
    setMaxPrice('');
    setBedrooms(null);
    setBathrooms(null);
    setSearchText('');
  };

  const renderProperty = ({item}: {item: Property}) => (
    <PropertyCard
      name={item.name}
      location={item.location}
      price={item.price}
      type={item.type}
      onPress={() =>
        navigation.navigate('PropertyDetails', {propertyId: item.id})
      }
    />
  );

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

              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Price Range</Text>
                <View style={styles.priceInputContainer}>
                  <View style={styles.priceInput}>
                    <Text style={styles.priceLabel}>Min</Text>
                    <TextInput
                      style={styles.priceTextInput}
                      placeholder="Min"
                      placeholderTextColor={colors.textSecondary}
                      value={minPrice}
                      onChangeText={setMinPrice}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.priceInput}>
                    <Text style={styles.priceLabel}>Max</Text>
                    <TextInput
                      style={styles.priceTextInput}
                      placeholder="Max"
                      placeholderTextColor={colors.textSecondary}
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      keyboardType="numeric"
                    />
                  </View>
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
