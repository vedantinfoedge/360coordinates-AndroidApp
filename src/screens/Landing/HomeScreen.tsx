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
  Animated,
  Share,
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
import CustomAlert from '../../utils/alertHelper';
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
  const {user, logout, isAuthenticated} = useAuth();
  const insets = useSafeAreaInsets();
  
  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;
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
  
  // Header animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = insets.top + 70;

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
        CustomAlert.alert('Error', error?.message || 'Failed to load properties');
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
      CustomAlert.alert('Error', 'Failed to navigate to search. Please try again.');
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

  const handleShareProperty = async (property: Property) => {
    try {
      const shareMessage = `Check out this property: ${property.title}\nLocation: ${property.location}\nPrice: ${formatters.price(property.price, property.status === 'rent')}\n\nVisit us: https://360coordinates.com`;
      await Share.share({
        message: shareMessage,
        title: property.title,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing property:', error);
        CustomAlert.alert('Error', 'Failed to share property. Please try again.');
      }
    }
  };

  const renderPropertyCard = ({item, index}: {item: Property; index: number}) => {
    const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
    const images = item.images?.length
      ? item.images.map((url: string) => fixImageUrl(url)).filter(Boolean)
      : undefined;
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        }}>
        <PropertyCard
          image={imageUrl || undefined}
          images={images}
          name={item.title}
          location={item.location}
          price={formatters.price(item.price, item.status === 'rent')}
          type={item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy'}
          onPress={() => handlePropertyPress(item.id)}
          onSharePress={() => handleShareProperty(item)}
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
        onSupportPress={() => navigation.navigate('Support' as never)}
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
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, {paddingTop: insets.top + spacing.md}]}
          showsVerticalScrollIndicator={false}
          onScroll={(event: {nativeEvent: {contentOffset: {y: number}}}) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            scrollY.setValue(offsetY);
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} ❤️
            </Text>
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
                  try {
                    // Explore Properties -> See All should open SearchResults with ALL properties (no filters)
                    const params: any = {
                      query: '',
                      location: '',
                      listingType: 'all', // Default to show all properties
                    };

                    // Preserve the currently selected listing type when navigating
                    if (listingType === 'sale') {
                      params.status = 'sale';
                      params.listingType = 'buy';
                    } else if (listingType === 'rent') {
                      params.status = 'rent';
                      params.listingType = 'rent';
                    } else if (listingType === 'pg') {
                      params.status = 'rent'; // PG uses rent status in API
                      params.listingType = 'pg-hostel';
                    } else if (listingType === 'all') {
                      // Explicitly set to 'all' to show all properties regardless of type
                      params.listingType = 'all';
                    }

                    // Navigate to SearchResults screen
                    console.log('[HomeScreen] Navigating to SearchResults with params:', params);
                    navigation.navigate('Search' as never, {
                      screen: 'SearchResults',
                      params: params,
                    } as never);
                  } catch (error: any) {
                    console.error('Error navigating to all properties:', error);
                    CustomAlert.alert('Error', 'Failed to load all properties. Please try again.');
                  }
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
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    backgroundColor: '#FAFAFA',
  },
  // Welcome Section - Modern, spacious design
  welcomeSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  welcomeSubtext: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  // Search Section - Airbnb-inspired search bar
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    padding: 0,
    lineHeight: 22,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 12,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  locationSuggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    zIndex: 1000,
  },
  // Toggle Section - Pill-shaped buttons
  toggleSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.1,
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  // Section Styling - More breathing room
  section: {
    marginTop: spacing.xl + 8,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 28,
    flex: 1,
    paddingRight: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    paddingVertical: 4,
  },
  // Properties List - Better spacing
  propertiesList: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    gap: spacing.md,
  },
  // Cities Section - Modern card design
  citiesList: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  cityCard: {
    width: 90,
    alignItems: 'center',
    marginRight: 14,
  },
  cityImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#E3F6FF',
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },
  cityName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Loading & Empty States
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

export default HomeScreen;
