import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import LocationAutoSuggest from './LocationAutoSuggest';
import {TabIcon} from '../navigation/TabIcons';
import {propertyTypes, pgHostelType, ListingType} from '../../data/propertyTypes';
import {
  getBudgetSetFor,
  getBudgetOptions,
  getMaxSliderForSet,
  getBudgetUnitsForSelection,
  findBudgetLabelForRange,
  type BudgetSetType,
} from '../../data/priceRanges';

export interface CompactSearchBarSearchParams {
  location: string;
  listingType: ListingType;
  propertyType: string;
  budget: string;
  minBudget: number;
  maxBudget: number;
  bedrooms: string;
  area: string;
  /** Coordinates [lng, lat] from autocomplete selection - used for immediate map centering */
  coordinates?: [number, number];
  projectStatus?: string;
  possessionDate?: string;
}

export interface CompactSearchBarProps {
  /** Current search values (controlled) */
  searchText: string;
  location: string;
  listingType: ListingType;
  selectedPropertyType: string;
  budget: string;
  minBudget: number;
  maxBudget: number;
  bedrooms: string;
  area: string;
  /** Callbacks */
  onSearchTextChange: (text: string) => void;
  onLocationChange: (location: string) => void;
  onListingTypeChange: (type: ListingType) => void;
  onPropertyTypeChange: (type: string) => void;
  onBudgetChange: (min: number, max: number, label: string) => void;
  onBedroomsChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onSearch: (params: CompactSearchBarSearchParams) => void;
  /** Optional: compact mode for map overlay */
  compact?: boolean;
  /** Search mode: 'projects' shows project-specific filters, 'properties' shows property filters */
  searchMode?: 'projects' | 'properties';
}

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

const CompactSearchBar: React.FC<CompactSearchBarProps> = ({
  searchText,
  location,
  listingType,
  selectedPropertyType,
  budget,
  minBudget,
  maxBudget,
  bedrooms,
  area,
  onSearchTextChange,
  onLocationChange,
  onListingTypeChange,
  onPropertyTypeChange,
  onBudgetChange,
  onBedroomsChange,
  onAreaChange,
  onSearch,
  compact = false,
  searchMode = 'properties',
}) => {
  const isProjectMode = searchMode === 'projects';
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<
    'listing' | 'property' | 'budget' | 'bedrooms' | 'area' | 'projectStatus' | 'possessionDate' | null
  >(null);
  const [projectStatus, setProjectStatus] = useState('');
  const [possessionDate, setPossessionDate] = useState('');

  const allPropertyTypes = useMemo(
    () => ['all', ...propertyTypes.map(t => t.label), pgHostelType.label],
    [],
  );

  const isBedroomBased = useMemo(() => {
    if (selectedPropertyType === 'all') return false;
    return bedroomBasedTypes.some(
      type =>
        selectedPropertyType.includes(type) || type.includes(selectedPropertyType),
    );
  }, [selectedPropertyType]);

  const isAreaBased = useMemo(() => {
    if (selectedPropertyType === 'all') return false;
    return areaBasedTypes.some(
      type =>
        selectedPropertyType.includes(type) || type.includes(selectedPropertyType),
    );
  }, [selectedPropertyType]);

  const activeBudgetSet = useMemo(
    (): BudgetSetType =>
      getBudgetSetFor(listingType, selectedPropertyType === 'all' ? '' : selectedPropertyType),
    [listingType, selectedPropertyType],
  );

  const maxBudgetForType = useMemo(
    () => getMaxSliderForSet(activeBudgetSet),
    [activeBudgetSet],
  );

  const budgetUnits = useMemo(
    () =>
      getBudgetUnitsForSelection(
        listingType,
        selectedPropertyType === 'all' ? '' : selectedPropertyType,
      ),
    [listingType, selectedPropertyType],
  );

  const formatBudgetDisplay = (value: number) => {
    if (budgetUnits === 'lakhs') {
      if (value >= 100) return `₹${(value / 100).toFixed(1)} Cr`;
      return `₹${value}L`;
    } else {
      if (value >= 100) return `₹${(value / 100).toFixed(1)} Lakh`;
      return `₹${value}K`;
    }
  };

  const budgetDisplay =
    minBudget === 0 && maxBudget === maxBudgetForType
      ? 'Any'
      : findBudgetLabelForRange({
          listingType,
          propertyType: selectedPropertyType === 'all' ? undefined : selectedPropertyType,
          min: minBudget,
          max: maxBudget,
          excludeLowestRentOption: listingType === 'rent',
        }) ||
        `${formatBudgetDisplay(minBudget)}-${formatBudgetDisplay(maxBudget)}`;

  const handleSearch = () => {
    setShowLocationSuggestions(false);
    setOpenDropdown(null);
    onSearch({
      location: searchText.trim() || location.trim(),
      listingType,
      propertyType: selectedPropertyType,
      budget,
      minBudget,
      maxBudget,
      bedrooms,
      area,
      projectStatus: isProjectMode ? projectStatus : undefined,
      possessionDate: isProjectMode ? possessionDate : undefined,
    });
  };

  const handleLocationSelect = (locationData: {name?: string; placeName?: string; coordinates?: [number, number]}) => {
    const name = locationData.name || locationData.placeName || '';
    onSearchTextChange(name);
    onLocationChange(name);
    setShowLocationSuggestions(false);
    // Trigger search with coordinates for immediate map centering
    onSearch({
      location: name,
      listingType,
      propertyType: selectedPropertyType,
      budget,
      minBudget,
      maxBudget,
      bedrooms,
      area,
      coordinates: locationData.coordinates,
      projectStatus: isProjectMode ? projectStatus : undefined,
      possessionDate: isProjectMode ? possessionDate : undefined,
    });
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Location row */}
      <View style={styles.locationRow}>
        <TabIcon name="location" color="#717171" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by city, locality, project"
          placeholderTextColor="#717171"
          value={searchText}
          onChangeText={text => {
            onSearchTextChange(text);
            setShowLocationSuggestions(text.length >= 2);
          }}
          onSubmitEditing={handleSearch}
          onBlur={() => {
            const loc = (searchText || '').trim();
            if (loc !== location) onLocationChange(loc);
          }}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {showLocationSuggestions && searchText.length >= 2 && (
        <View style={styles.suggestionsContainer}>
          <LocationAutoSuggest
            query={searchText}
            onSelect={handleLocationSelect}
            visible={showLocationSuggestions}
          />
        </View>
      )}

      {/* Quick filters row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filtersRow, compact && styles.filtersRowCompact]}
        style={[styles.filtersScroll, compact && styles.filtersScrollCompact]}>
        {isProjectMode ? (
          <>
            <TouchableOpacity
              style={[styles.dropdownTrigger, compact && styles.dropdownTriggerCompact]}
              onPress={() => setOpenDropdown(openDropdown === 'projectStatus' ? null : 'projectStatus')}>
              <Text style={[styles.dropdownLabel, compact && styles.dropdownLabelCompact]}>Status</Text>
              <Text style={[styles.dropdownValue, compact && styles.dropdownValueCompact]} numberOfLines={1}>
                {projectStatus || 'Any'}
              </Text>
              <Text style={[styles.dropdownChevron, compact && styles.dropdownChevronCompact]}>{openDropdown === 'projectStatus' ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownTrigger, compact && styles.dropdownTriggerCompact]}
              onPress={() => setOpenDropdown(openDropdown === 'possessionDate' ? null : 'possessionDate')}>
              <Text style={[styles.dropdownLabel, compact && styles.dropdownLabelCompact]}>Possession</Text>
              <Text style={[styles.dropdownValue, compact && styles.dropdownValueCompact]} numberOfLines={1}>
                {possessionDate || 'Any'}
              </Text>
              <Text style={[styles.dropdownChevron, compact && styles.dropdownChevronCompact]}>{openDropdown === 'possessionDate' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.dropdownTrigger, compact && styles.dropdownTriggerCompact]}
              onPress={() => setOpenDropdown(openDropdown === 'listing' ? null : 'listing')}>
              <Text style={[styles.dropdownLabel, compact && styles.dropdownLabelCompact]}>Listing</Text>
              <Text style={[styles.dropdownValue, compact && styles.dropdownValueCompact]} numberOfLines={1}>
                {listingType === 'buy' ? 'Buy' : listingType === 'pg-hostel' ? 'PG/Hostel' : 'Rent'}
              </Text>
              <Text style={[styles.dropdownChevron, compact && styles.dropdownChevronCompact]}>{openDropdown === 'listing' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Property Type - shown in both modes */}
        <TouchableOpacity
          style={[
            styles.dropdownTrigger,
            compact && styles.dropdownTriggerCompact,
            listingType === 'pg-hostel' && styles.dropdownTriggerDisabled,
          ]}
          onPress={() =>
            listingType !== 'pg-hostel' &&
            setOpenDropdown(openDropdown === 'property' ? null : 'property')
          }
          disabled={listingType === 'pg-hostel'}>
          <Text style={[styles.dropdownLabel, compact && styles.dropdownLabelCompact]}>Property</Text>
          <Text
            style={[styles.dropdownValue, compact && styles.dropdownValueCompact, listingType === 'pg-hostel' && styles.dropdownValueDisabled]}
            numberOfLines={1}>
            {selectedPropertyType === 'all' ? 'All' : selectedPropertyType}
          </Text>
          <Text style={[styles.dropdownChevron, compact && styles.dropdownChevronCompact]}>{openDropdown === 'property' ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {!isProjectMode && (
          <>
            <TouchableOpacity
              style={[styles.dropdownTrigger, compact && styles.dropdownTriggerCompact]}
              onPress={() => setOpenDropdown(openDropdown === 'budget' ? null : 'budget')}>
              <Text style={[styles.dropdownLabel, compact && styles.dropdownLabelCompact]}>Price</Text>
              <Text style={[styles.dropdownValue, compact && styles.dropdownValueCompact]} numberOfLines={1}>
                {budgetDisplay}
              </Text>
              <Text style={[styles.dropdownChevron, compact && styles.dropdownChevronCompact]}>{openDropdown === 'budget' ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isBedroomBased && (
              <TouchableOpacity
                style={[styles.dropdownTrigger, compact && styles.dropdownTriggerCompact]}
                onPress={() => setOpenDropdown(openDropdown === 'bedrooms' ? null : 'bedrooms')}>
                <Text style={[styles.dropdownLabel, compact && styles.dropdownLabelCompact]}>BHK</Text>
                <Text style={[styles.dropdownValue, compact && styles.dropdownValueCompact]} numberOfLines={1}>
                  {bedrooms || 'Any'}
                </Text>
                <Text style={[styles.dropdownChevron, compact && styles.dropdownChevronCompact]}>{openDropdown === 'bedrooms' ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            )}

            {isAreaBased && (
              <TouchableOpacity
                style={[styles.dropdownTrigger, compact && styles.dropdownTriggerCompact]}
                onPress={() => setOpenDropdown(openDropdown === 'area' ? null : 'area')}>
                <Text style={[styles.dropdownLabel, compact && styles.dropdownLabelCompact]}>Area</Text>
                <Text style={[styles.dropdownValue, compact && styles.dropdownValueCompact]} numberOfLines={1}>
                  {area || 'Any'}
                </Text>
                <Text style={[styles.dropdownChevron, compact && styles.dropdownChevronCompact]}>{openDropdown === 'area' ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Dropdown modal */}
      <Modal visible={openDropdown !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setOpenDropdown(null)}>
          <View style={styles.dropdownBox} onStartShouldSetResponder={() => true}>
            {openDropdown === 'projectStatus' && (
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {[
                  {label: 'Any Status', value: ''},
                  {label: 'Pre-Launch', value: 'Pre-Launch'},
                  {label: 'Underconstruction', value: 'Underconstruction'},
                  {label: 'Completed', value: 'Completed'},
                ].map(item => (
                  <TouchableOpacity
                    key={item.value || 'any-status'}
                    style={[styles.dropdownOption, projectStatus === item.value && styles.dropdownOptionActive]}
                    onPress={() => {
                      setProjectStatus(item.value);
                      setOpenDropdown(null);
                      onSearch({
                        location: searchText.trim() || location.trim(),
                        listingType,
                        propertyType: selectedPropertyType,
                        budget,
                        minBudget,
                        maxBudget,
                        bedrooms,
                        area,
                        projectStatus: item.value,
                        possessionDate,
                      });
                    }}>
                    <Text style={[styles.dropdownOptionText, projectStatus === item.value && styles.dropdownOptionTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {openDropdown === 'possessionDate' && (
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {[
                  {label: 'Any Time', value: ''},
                  {label: '6 Months', value: '6 Months'},
                  {label: '12 Months', value: '12 Months'},
                  {label: '18 Months', value: '18 Months'},
                  {label: '24 Months+', value: '24 Months+'},
                ].map(item => (
                  <TouchableOpacity
                    key={item.value || 'any-date'}
                    style={[styles.dropdownOption, possessionDate === item.value && styles.dropdownOptionActive]}
                    onPress={() => {
                      setPossessionDate(item.value);
                      setOpenDropdown(null);
                      onSearch({
                        location: searchText.trim() || location.trim(),
                        listingType,
                        propertyType: selectedPropertyType,
                        budget,
                        minBudget,
                        maxBudget,
                        bedrooms,
                        area,
                        projectStatus,
                        possessionDate: item.value,
                      });
                    }}>
                    <Text style={[styles.dropdownOptionText, possessionDate === item.value && styles.dropdownOptionTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {openDropdown === 'listing' && (
              <>
                {(['buy', 'rent', 'pg-hostel'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.dropdownOption, listingType === type && styles.dropdownOptionActive]}
                    onPress={() => {
                      onListingTypeChange(type);
                      setOpenDropdown(null);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        listingType === type && styles.dropdownOptionTextActive,
                      ]}>
                      {type === 'buy' ? 'Buy' : type === 'pg-hostel' ? 'PG/Hostel' : 'Rent'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            {openDropdown === 'property' && (
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {allPropertyTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.dropdownOption,
                      selectedPropertyType === type && styles.dropdownOptionActive,
                    ]}
                    onPress={() => {
                      if (listingType !== 'pg-hostel') {
                        onPropertyTypeChange(type);
                        setOpenDropdown(null);
                      }
                    }}
                    disabled={listingType === 'pg-hostel'}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        selectedPropertyType === type && styles.dropdownOptionTextActive,
                      ]}>
                      {type === 'all' ? 'All types' : type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {openDropdown === 'budget' && (
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {[
                  {label: 'Any', min: 0, max: maxBudgetForType, budgetLabel: ''},
                  ...getBudgetOptions(activeBudgetSet, listingType === 'rent').map(opt => ({
                    label: opt.label,
                    min: opt.min,
                    max: opt.max,
                    budgetLabel: opt.label,
                  })),
                ].map(({label, min, max, budgetLabel}) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.dropdownOption,
                      minBudget === min && maxBudget === max && styles.dropdownOptionActive,
                    ]}
                    onPress={() => {
                      onBudgetChange(min, max, budgetLabel);
                      setOpenDropdown(null);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        minBudget === min && maxBudget === max && styles.dropdownOptionTextActive,
                      ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {openDropdown === 'bedrooms' && (
              <>
                {(
                  listingType === 'pg-hostel'
                    ? [
                        {label: 'Any', value: ''},
                        {label: '1RK', value: '1RK'},
                        {label: '1 BHK', value: '1 BHK'},
                        {label: '2 BHK', value: '2 BHK'},
                        {label: '3 BHK', value: '3 BHK'},
                        {label: '4 BHK', value: '4 BHK'},
                        {label: '5+ BHK', value: '5+ BHK'},
                      ]
                    : [
                        {label: 'Any', value: ''},
                        {label: '1 BHK', value: '1 BHK'},
                        {label: '2 BHK', value: '2 BHK'},
                        {label: '3 BHK', value: '3 BHK'},
                        {label: '4 BHK', value: '4 BHK'},
                        {label: '5+ BHK', value: '5+ BHK'},
                      ]
                ).map(opt => (
                  <TouchableOpacity
                    key={opt.value || 'any'}
                    style={[styles.dropdownOption, bedrooms === opt.value && styles.dropdownOptionActive]}
                    onPress={() => {
                      onBedroomsChange(opt.value);
                      setOpenDropdown(null);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        bedrooms === opt.value && styles.dropdownOptionTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            {openDropdown === 'area' && (
              <>
                {[
                  {label: 'All', value: ''},
                  {label: '0-500 sq ft', value: '0-500 sq ft'},
                  {label: '500-1000 sq ft', value: '500-1000 sq ft'},
                  {label: '1000-2000 sq ft', value: '1000-2000 sq ft'},
                  {label: '2000-5000 sq ft', value: '2000-5000 sq ft'},
                  {label: '5000-10000 sq ft', value: '5000-10000 sq ft'},
                  {label: '10000+ sq ft', value: '10000+ sq ft'},
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.value || 'all'}
                    style={[styles.dropdownOption, area === opt.value && styles.dropdownOptionActive]}
                    onPress={() => {
                      onAreaChange(opt.value);
                      setOpenDropdown(null);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        area === opt.value && styles.dropdownOptionTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  containerCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A1A1A',
  },
  searchButton: {
    backgroundColor: '#0077C0',
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 58,
    left: 12,
    right: 52,
    zIndex: 1000,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filtersScroll: {
    maxHeight: 44,
  },
  filtersScrollCompact: {
    maxHeight: 56,
  },
  filtersRowCompact: {
    gap: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  dropdownTriggerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 90,
    minHeight: 48,
  },
  dropdownTriggerDisabled: {
    opacity: 0.6,
  },
  dropdownLabel: {
    fontSize: 10,
    color: '#717171',
    marginRight: 4,
  },
  dropdownLabelCompact: {
    fontSize: 12,
    marginRight: 6,
  },
  dropdownValue: {
    flex: 1,
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  dropdownValueCompact: {
    fontSize: 14,
  },
  dropdownValueDisabled: {
    color: '#999',
  },
  dropdownChevron: {
    fontSize: 10,
    color: '#717171',
  },
  dropdownChevronCompact: {
    fontSize: 12,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: 300,
    width: 280,
  },
  dropdownScroll: {
    maxHeight: 260,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownOptionActive: {
    backgroundColor: '#E8F4FC',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  dropdownOptionTextActive: {
    color: '#0077C0',
    fontWeight: '600',
  },
});

export default CompactSearchBar;
