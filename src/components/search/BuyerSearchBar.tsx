import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../../theme';
import LocationAutoSuggest from './LocationAutoSuggest';
import {propertyTypes, pgHostelType, PropertyType} from '../../data/propertyTypes';

// Budget ranges based on property type and status
const BUDGET_RANGES = {
  'Residential Sale': [
    '0-25L',
    '25L-50L',
    '50L-75L',
    '75L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr+',
  ],
  'Residential Rent': [
    '0K-5K',
    '5K-10K',
    '10K-20K',
    '20K-30K',
    '30K-50K',
    '50K-75K',
    '75K-1L',
    '1L-2L',
    '2L+',
  ],
  'Commercial Sale': [
    '0-50L',
    '50L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr-10Cr',
    '10Cr-25Cr',
    '25Cr+',
  ],
  'Commercial Rent': [
    '0-10K',
    '10K-25K',
    '25K-50K',
    '50K-1L',
    '1L-2L',
    '2L-5L',
    '5L+',
  ],
};

const BEDROOMS_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];
const AREA_RANGES = [
  '0-500 sq ft',
  '500-1000 sq ft',
  '1000-2000 sq ft',
  '2000-3000 sq ft',
  '3000-5000 sq ft',
  '5000-10000 sq ft',
  '10000+ sq ft',
];

const TOP_CITIES = [
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Gurgaon',
];

interface SearchData {
  location: string;
  propertyType: string;
  budget: string;
  bedrooms: string;
  area: string;
  status: 'sale' | 'rent' | '';
}

interface BuyerSearchBarProps {
  onSearch: (searchData: SearchData) => void;
  initialData?: Partial<SearchData>;
}

const BuyerSearchBar: React.FC<BuyerSearchBarProps> = ({
  onSearch,
  initialData = {},
}) => {
  const [location, setLocation] = useState(initialData.location || '');
  const [propertyType, setPropertyType] = useState(
    initialData.propertyType || '',
  );
  const [budget, setBudget] = useState(initialData.budget || '');
  const [bedrooms, setBedrooms] = useState(initialData.bedrooms || '');
  const [area, setArea] = useState(initialData.area || '');
  const [status, setStatus] = useState<'sale' | 'rent' | ''>(
    initialData.status || '',
  );
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // Get budget ranges based on property type and status
  const getBudgetRanges = () => {
    if (!status) return [];
    const category = propertyType?.includes('Commercial')
      ? `Commercial ${status === 'sale' ? 'Sale' : 'Rent'}`
      : `Residential ${status === 'sale' ? 'Sale' : 'Rent'}`;
    return BUDGET_RANGES[category as keyof typeof BUDGET_RANGES] || [];
  };

  const budgetRanges = getBudgetRanges();

  // Get all property types
  const allPropertyTypes = [
    '',
    ...propertyTypes.map(t => t.label),
    pgHostelType.label,
  ];

  const handleLocationSelect = (locationData: any) => {
    setLocation(locationData.placeName || locationData.name);
    setSelectedLocation(locationData);
    setShowLocationSuggestions(false);
  };

  const handleSearch = () => {
    const searchData: SearchData = {
      location: location.trim(),
      propertyType: propertyType,
      budget: budget,
      bedrooms: bedrooms,
      area: area,
      status: status,
    };
    onSearch(searchData);
  };

  const clearFilters = () => {
    setLocation('');
    setPropertyType('');
    setBudget('');
    setBedrooms('');
    setArea('');
    setStatus('');
    setSelectedLocation(null);
  };

  const hasActiveFilters = location || propertyType || budget || bedrooms || area || status;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Location Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>📍 Location</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="City, Locality, Area"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={text => {
                setLocation(text);
                setShowLocationSuggestions(text.length >= 2);
              }}
            />
            {showLocationSuggestions && (
              <View style={styles.suggestionsContainer}>
                <LocationAutoSuggest
                  query={location}
                  onSelect={handleLocationSelect}
                  visible={showLocationSuggestions}
                />
              </View>
            )}
          </View>
        </View>

        {/* Property Type */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>🏠 Property Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipContainer}>
            {allPropertyTypes.map(type => (
              <TouchableOpacity
                key={type || 'all'}
                style={[
                  styles.chip,
                  propertyType === type && styles.chipActive,
                ]}
                onPress={() => setPropertyType(type)}>
                <Text
                  style={[
                    styles.chipText,
                    propertyType === type && styles.chipTextActive,
                  ]}>
                  {type || 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Status (Sale/Rent) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>💰 Status</Text>
          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, status === 'sale' && styles.chipActive]}
              onPress={() => setStatus('sale')}>
              <Text
                style={[
                  styles.chipText,
                  status === 'sale' && styles.chipTextActive,
                ]}>
                Sale
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, status === 'rent' && styles.chipActive]}
              onPress={() => setStatus('rent')}>
              <Text
                style={[
                  styles.chipText,
                  status === 'rent' && styles.chipTextActive,
                ]}>
                Rent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget Range */}
        {status && budgetRanges.length > 0 && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>💵 Budget</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipContainer}>
              {budgetRanges.map(range => (
                <TouchableOpacity
                  key={range}
                  style={[styles.chip, budget === range && styles.chipActive]}
                  onPress={() => setBudget(range)}>
                  <Text
                    style={[
                      styles.chipText,
                      budget === range && styles.chipTextActive,
                    ]}>
                    ₹{range}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bedrooms */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>🛏️ Bedrooms</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipContainer}>
            {BEDROOMS_OPTIONS.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, bedrooms === option && styles.chipActive]}
                onPress={() => setBedrooms(option)}>
                <Text
                  style={[
                    styles.chipText,
                    bedrooms === option && styles.chipTextActive,
                  ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Area Range */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>📐 Area</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipContainer}>
            {AREA_RANGES.map(range => (
              <TouchableOpacity
                key={range}
                style={[styles.chip, area === range && styles.chipActive]}
                onPress={() => setArea(range)}>
                <Text
                  style={[
                    styles.chipText,
                    area === range && styles.chipTextActive,
                  ]}>
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick City Buttons */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>🏙️ Quick Cities</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipContainer}>
            {TOP_CITIES.map(city => (
              <TouchableOpacity
                key={city}
                style={[styles.chip, location === city && styles.chipActive]}
                onPress={() => {
                  setLocation(city);
                  setShowLocationSuggestions(false);
                }}>
                <Text
                  style={[
                    styles.chipText,
                    location === city && styles.chipTextActive,
                  ]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {hasActiveFilters && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍 Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  inputContainer: {
    marginRight: spacing.md,
    minWidth: 200,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  searchButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default BuyerSearchBar;

