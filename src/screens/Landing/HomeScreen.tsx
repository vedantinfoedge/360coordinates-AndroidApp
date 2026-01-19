import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../../theme';
import BuyerHeader from '../../components/BuyerHeader';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import PropertyCard from '../../components/PropertyCard';
import {buyerService, Property} from '../../services/buyer.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';
import {useAuth} from '../../context/AuthContext';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<any, 'Home'>,
  NativeStackNavigationProp<any>
>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

interface TopCity {
  id: string;
  name: string;
  image: any;
}

const TOP_CITIES: TopCity[] = [
  {id: 'mumbai', name: 'Mumbai', image: require('../../assets/Mumbai.png')},
  {id: 'delhi', name: 'Delhi', image: require('../../assets/Delhi.png')},
  {id: 'bangalore', name: 'Bangalore', image: require('../../assets/Bangalore.png')},
  {id: 'hyderabad', name: 'Hyderabad', image: require('../../assets/Hyderabad.png')},
  {id: 'chennai', name: 'Chennai', image: require('../../assets/Chennai.png')},
  {id: 'pune', name: 'Pune', image: require('../../assets/Pune.png')},
  {id: 'kolkata', name: 'Kolkata', image: require('../../assets/kolkata.png')},
  {id: 'ahmedabad', name: 'Ahmedabad', image: require('../../assets/Ahmedabad.png')},
];

type ListingType = 'all' | 'sale' | 'rent' | 'pg';

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const insets = useSafeAreaInsets();
  const [listingType, setListingType] = useState<ListingType>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadDashboardData();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [listingType]);

  const loadDashboardData = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      let statusFilter: 'sale' | 'rent' | 'pg' | undefined = undefined;
      if (listingType === 'sale') {
        statusFilter = 'sale';
      } else if (listingType === 'rent') {
        statusFilter = 'rent';
      } else if (listingType === 'pg') {
        statusFilter = 'pg';
      }
      
      const propertiesResponse = await buyerService.getProperties({
        limit: 10,
        ...(statusFilter && {status: statusFilter}),
      });

      if (propertiesResponse.success && propertiesResponse.data) {
        let filteredProperties = propertiesResponse.data.properties || [];
        
        if (listingType === 'pg') {
          filteredProperties = filteredProperties.filter((prop: any) => {
            const propType = (prop.property_type || prop.type || '').toLowerCase();
            return propType.includes('pg') || 
                   propType.includes('hostel') || 
                   propType === 'pg-hostel' ||
                   prop.status === 'pg';
          });
        }
        
        setProperties(filteredProperties);
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      if (showLoading) {
        Alert.alert('Error', error?.message || 'Failed to load properties');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(false);
  };

  const handleLocationSelect = (location: any) => {
    setSearchLocation(location.name || location.placeName || '');
    setShowLocationSuggestions(false);
  };

  const handleSearch = () => {
    try {
      setShowLocationSuggestions(false);
      
      // PART A: Safely get location input with trim() - handle null/empty/spaces
      // Empty location is VALID and should navigate to show ALL properties
      const searchLocationText = (searchLocation || searchQuery || '').trim();
      
      // PART A: Always allow Search click - NO validation blocking empty input
      // Empty location is valid - will show ALL properties in SearchResults
      // Navigate to Search tab which has the search functionality
      const params: any = {
        query: searchLocationText, // Always pass query param (even if empty string)
        location: searchLocationText, // Always pass location param (even if empty string)
      };
      
      // If location has value, add additional params for backward compatibility
      if (searchLocationText) {
        params.searchQuery = searchLocationText;
      }
      
      // Add listing type filter
      if (listingType !== 'all') {
        params.listingType = listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : listingType;
      }
      
      navigation.navigate('Search' as never, {
        screen: 'SearchResults',
        params: params,
      } as never);
    } catch (error: any) {
      console.error('Error navigating to search:', error);
      Alert.alert('Error', 'Failed to navigate to search. Please try again.');
    }
  };

  const handleCityPress = (cityName: string) => {
    navigation.navigate('Search' as never, {
      screen: 'SearchResults',
      params: {location: cityName},
    } as never);
  };

  const handlePropertyPress = (propertyId: number) => {
    navigation.navigate('Search' as never, {
      screen: 'PropertyDetails',
      params: {propertyId: String(propertyId)},
    } as never);
  };

  const renderPropertyCard = ({item, index}: {item: Property; index: number}) => {
    const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        }}>
        <PropertyCard
          image={imageUrl || undefined}
          name={item.title}
          location={item.location}
          price={formatters.price(item.price, item.status === 'rent')}
          type={item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy'}
          onPress={() => handlePropertyPress(item.id)}
          isFavorite={false}
          property={item}
        />
      </Animated.View>
    );
  };

  const renderCityCard = ({item}: {item: TopCity}) => (
    <TouchableOpacity
      style={styles.cityCard}
      onPress={() => handleCityPress(item.name)}>
      <View style={styles.cityImageContainer}>
        <Image 
          source={item.image} 
          style={styles.cityImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.cityName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile' as never)}
        onSupportPress={() => {
          // Navigate to support if needed
        }}
        onLogoutPress={logout}
      />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, {paddingTop: insets.top + 70}]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome</Text>
            <Text style={styles.welcomeSubtext}>
              Find your dream property in India
            </Text>
          </View>

          {/* Listing Type Toggle Buttons */}
          <View style={styles.toggleSection}>
            <TouchableOpacity
              style={[styles.toggleButton, listingType === 'all' && styles.toggleButtonActive]}
              onPress={() => setListingType('all')}>
              <Text style={[styles.toggleButtonText, listingType === 'all' && styles.toggleButtonTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, listingType === 'sale' && styles.toggleButtonActive]}
              onPress={() => setListingType('sale')}>
              <Text style={[styles.toggleButtonText, listingType === 'sale' && styles.toggleButtonTextActive]}>
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, listingType === 'rent' && styles.toggleButtonActive]}
              onPress={() => setListingType('rent')}>
              <Text style={[styles.toggleButtonText, listingType === 'rent' && styles.toggleButtonTextActive]}>
                Rent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, listingType === 'pg' && styles.toggleButtonActive]}
              onPress={() => setListingType('pg')}>
              <Text style={[styles.toggleButtonText, listingType === 'pg' && styles.toggleButtonTextActive]}>
                PG/Hostel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar with Location Autocomplete */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchIcon}>📍</Text>
                <View style={styles.searchInputWrapper}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by city, locality, project"
                    placeholderTextColor={colors.textSecondary}
                    value={searchLocation || searchQuery}
                    onChangeText={text => {
                      setSearchLocation(text);
                      setSearchQuery(text);
                      setShowLocationSuggestions(text.length >= 2);
                    }}
                    onSubmitEditing={handleSearch}
                  />
                </View>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleSearch}>
                  <Text style={styles.searchButtonText}>Search</Text>
                </TouchableOpacity>
              </View>
              {showLocationSuggestions && searchLocation.length >= 2 && (
                <View style={styles.locationSuggestionsContainer}>
                  <LocationAutoSuggest
                    query={searchLocation}
                    onSelect={handleLocationSelect}
                    visible={showLocationSuggestions}
                  />
                </View>
              )}
        </View>
      </View>

          {/* Explore Properties Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Explore Properties</Text>
                <Text style={styles.sectionSubtitle}>
                  Buy or Rent — All in One Place
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Search' as never, {
                    screen: 'AllProperties',
                    params: {
                      listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : listingType,
                    },
                  } as never);
                }}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading properties...</Text>
              </View>
            ) : properties.length > 0 ? (
              <FlatList
                data={properties}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.propertiesList}
                renderItem={renderPropertyCard}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No properties found</Text>
              </View>
            )}
      </View>

          {/* Top Cities Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Browse Residential Projects in Top Cities
              </Text>
            </View>
            <FlatList
              data={TOP_CITIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.citiesList}
              renderItem={renderCityCard}
            />
      </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  welcomeSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  welcomeText: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  welcomeSubtext: {
    ...typography.body,
    color: colors.textSecondary,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  searchButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  locationSuggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    zIndex: 1000,
  },
  toggleSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: colors.surface,
  },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  seeAllText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  propertiesList: {
    paddingLeft: spacing.lg,
    gap: spacing.md,
  },
  citiesList: {
    paddingLeft: spacing.lg,
    gap: spacing.md,
  },
  cityCard: {
    width: 100,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cityImageContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
  },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cityImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  cityName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default HomeScreen;
