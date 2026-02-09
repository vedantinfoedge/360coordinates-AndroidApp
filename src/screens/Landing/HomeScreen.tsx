import React, {useState, useEffect, useRef, useCallback} from 'react';
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
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainStackParamList} from '../../navigation/MainStackNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {scale, verticalScale, moderateScale} from '../../utils/responsive';
import BuyerHeader from '../../components/BuyerHeader';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import PropertyCard from '../../components/PropertyCard';
import {buyerService, Property} from '../../services/buyer.service';
import {fixImageUrl} from '../../utils/imageHelper';
import CustomAlert from '../../utils/alertHelper';
import {formatters} from '../../utils/formatters';
import {useAuth} from '../../context/AuthContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Home'>;

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

type ListingType = 'sale' | 'rent' | 'pg';

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout, isAuthenticated} = useAuth();
  const insets = useSafeAreaInsets();
  
  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;
  const [listingType, setListingType] = useState<ListingType>('sale');
  const [properties, setProperties] = useState<Property[]>([]);
  const [upcomingProjects, setUpcomingProjects] = useState<Property[]>([]);
  const [buyNewHomeProperties, setBuyNewHomeProperties] = useState<Property[]>([]);
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
  const headerHeight = insets.top + verticalScale(70);
  
  // Smooth marquee auto-scroll refs
  const carouselScrollRef = useRef<ScrollView>(null);
  const scrollPosition = useRef(0);
  const animationRef = useRef<number | null>(null);
  const isUserScrolling = useRef(false);
  const lastTimestamp = useRef<number>(0);
  const SCROLL_SPEED = 0.5;
  const CARD_WIDTH = scale(280);
  const CARD_MARGIN = scale(16);
  const ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;

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

  // Smooth marquee animation using requestAnimationFrame
  const startSmoothScroll = useCallback(() => {
    if (properties.length <= 1) return;
    
    const totalWidth = properties.length * ITEM_WIDTH;
    
    const animate = (timestamp: number) => {
      if (!lastTimestamp.current) {
        lastTimestamp.current = timestamp;
      }
      
      const deltaTime = timestamp - lastTimestamp.current;
      lastTimestamp.current = timestamp;
      
      // Only scroll if user is not interacting
      if (!isUserScrolling.current && carouselScrollRef.current) {
        // Move based on time delta for consistent speed across devices
        scrollPosition.current += SCROLL_SPEED * (deltaTime / 16.67); // Normalize to 60fps
        
        // Reset to beginning when we've scrolled past half (seamless loop)
        if (scrollPosition.current >= totalWidth) {
          scrollPosition.current = 0;
        }
        
        carouselScrollRef.current.scrollTo({
          x: scrollPosition.current,
          animated: false,
        });
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [properties.length]);
  
  // Start/stop smooth scroll animation
  useEffect(() => {
    if (properties.length > 1) {
      startSmoothScroll();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [properties.length, startSmoothScroll]);
  
  // Handle user scroll interaction
  const handleScrollBeginDrag = useCallback(() => {
    isUserScrolling.current = true;
  }, []);
  
  const handleScrollEndDrag = useCallback((event: any) => {
    // Update scroll position to where user left off
    scrollPosition.current = event.nativeEvent.contentOffset.x;
    
    // Resume auto-scroll after a short delay
    setTimeout(() => {
      isUserScrolling.current = false;
    }, 2000); // 2 second pause after user interaction
  }, []);
  
  // Create duplicated data for seamless infinite scroll
  const getMarqueeData = useCallback(() => {
    if (properties.length === 0) return [];
    // Duplicate the data for seamless looping
    return [...properties, ...properties];
  }, [properties]);

  const loadDashboardData = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Same backend as website: property_type 'PG / Hostel', available_for_bachelors (list.php)
      const listParams: any = { limit: 10 };
      if (listingType === 'sale') {
        listParams.status = 'sale';
      } else if (listingType === 'rent') {
        listParams.status = 'rent';
      } else if (listingType === 'pg') {
        listParams.status = 'rent';
        listParams.property_type = 'PG / Hostel';
        listParams.available_for_bachelors = true;
      }

      const propertiesResponse = await buyerService.getProperties(listParams);

      if (propertiesResponse.success && propertiesResponse.data) {
        const filteredProperties = propertiesResponse.data.properties || [];
        setProperties(filteredProperties);
      }

      const allResponse = await buyerService.getProperties({limit: 50});
      if (allResponse.success && allResponse.data?.properties) {
        const allList = allResponse.data.properties as Property[];
        setUpcomingProjects(allList.filter(p => p.project_type === 'upcoming').slice(0, 15));
        setBuyNewHomeProperties(allList.filter(p => p.status === 'sale').slice(0, 15));
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
      
      // Pass listing type (Buy, Rent, PG only - no All)
      params.listingType = listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : 'rent';
      params.status = listingType === 'sale' ? 'sale' : 'rent';
      
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

          {/* Listing Type Toggle Buttons - Buy, Rent, PG/Hostel only */}
          <View style={styles.toggleSection}>
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
            <TouchableOpacity
              style={styles.mapSearchButton}
              onPress={() => {
                try {
                  navigation.navigate('Search' as never, {
                    screen: 'PropertyMap',
                    params: {
                      listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : listingType,
                    },
                  } as never);
                } catch (err: any) {
                  console.error('Error navigating to map:', err);
                  CustomAlert.alert('Error', 'Map is not available.');
                }
              }}
              activeOpacity={0.8}>
              <View style={styles.mapSearchIconWrap}>
                <Text style={styles.mapSearchIcon}>📍</Text>
              </View>
              <Text style={styles.mapSearchText}>Search on Map</Text>
            </TouchableOpacity>
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
                      listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : 'rent',
                      status: listingType === 'sale' ? 'sale' : 'rent',
                    };

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
              <ScrollView
                ref={carouselScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                decelerationRate="fast"
                contentContainerStyle={styles.propertiesList}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={(event) => {
                  scrollPosition.current = event.nativeEvent.contentOffset.x;
                }}>
                {getMarqueeData().map((item: Property, index: number) => {
                  const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
                  const images = item.images?.length
                    ? item.images.map((url: string) => fixImageUrl(url)).filter(Boolean)
                    : undefined;
                  return (
                    <Animated.View
                      key={`${item.id}-${index}`}
                      style={[
                        styles.carouselCard,
                        {
                          opacity: fadeAnim,
                          transform: [{translateY: slideAnim}],
                        },
                      ]}>
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
                        style={styles.carouselPropertyCard}
                      />
                    </Animated.View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No properties found</Text>
              </View>
            )}
          </View>

          {/* Upcoming Projects Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Upcoming Projects</Text>
                <Text style={styles.sectionSubtitle}>
                  New projects from Agents & Builders
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Search' as never, {
                    screen: 'SearchResults',
                    params: {
                      query: '',
                      location: '',
                      listingType: 'buy',
                      status: 'sale',
                      project_type: 'upcoming',
                    },
                  } as never);
                }}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcomingProjects.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.propertiesList}>
                {upcomingProjects.map((item: Property) => {
                  const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
                  const images = item.images?.length
                    ? (item.images.map((url: string) => fixImageUrl(url)).filter((u): u is string => Boolean(u)) as string[])
                    : undefined;
                  return (
                    <View key={item.id} style={styles.carouselCard}>
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
                        style={styles.carouselPropertyCard}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No upcoming projects at the moment</Text>
              </View>
            )}
          </View>

          {/* Buy New Home Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Buy New Home</Text>
                <Text style={styles.sectionSubtitle}>
                  Flats & apartments for sale
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Search' as never, {
                    screen: 'SearchResults',
                    params: {query: '', location: '', listingType: 'buy', status: 'sale'},
                  } as never);
                }}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {buyNewHomeProperties.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.propertiesList}>
                {buyNewHomeProperties.map((item: Property) => {
                  const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
                  const images = item.images?.length
                    ? (item.images.map((url: string) => fixImageUrl(url)).filter((u): u is string => Boolean(u)) as string[])
                    : undefined;
                  return (
                    <View key={item.id} style={styles.carouselCard}>
                      <PropertyCard
                        image={imageUrl || undefined}
                        images={images}
                        name={item.title}
                        location={item.location}
                        price={formatters.price(item.price, false)}
                        type="buy"
                        onPress={() => handlePropertyPress(item.id)}
                        onSharePress={() => handleShareProperty(item)}
                        isFavorite={false}
                        property={item}
                        style={styles.carouselPropertyCard}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No properties for sale at the moment</Text>
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
    fontSize: moderateScale(28),
    fontWeight: '700',
    color: colors.text,
    marginBottom: scale(6),
    letterSpacing: -0.5,
  },
  welcomeSubtext: {
    fontSize: moderateScale(16),
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: moderateScale(24),
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
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  searchIcon: {
    fontSize: moderateScale(18),
    marginRight: scale(12),
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    fontSize: moderateScale(16),
    fontWeight: '400',
    color: colors.text,
    padding: 0,
    lineHeight: moderateScale(22),
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(12),
    marginLeft: scale(12),
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  searchButtonText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  locationSuggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: scale(8),
    zIndex: 1000,
  },
  mapSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    paddingVertical: verticalScale(12),
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    minHeight: verticalScale(48),
    gap: spacing.sm,
    borderWidth: 0,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  mapSearchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapSearchIcon: {
    fontSize: moderateScale(16),
  },
  mapSearchText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.surface,
  },
  // Toggle Section - Pill-shaped buttons
  toggleSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: scale(10),
  },
  toggleButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(24),
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(44),
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
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.1,
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  // Section Styling - More breathing room
  section: {
    marginTop: spacing.xl + scale(8),
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
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: moderateScale(28),
    flex: 1,
    paddingRight: spacing.md,
  },
  sectionSubtitle: {
    fontSize: moderateScale(14),
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: scale(4),
    lineHeight: moderateScale(20),
  },
  seeAllText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.primary,
    paddingVertical: scale(4),
  },
  // Properties List - Better spacing
  propertiesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  carouselCard: {
    width: scale(280),
    marginRight: scale(16),
  },
  carouselPropertyCard: {
    width: '100%',
  },
  // Cities Section - Modern card design
  citiesList: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  cityCard: {
    width: scale(90),
    alignItems: 'center',
    marginRight: scale(14),
  },
  cityImageContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(10),
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
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  // Loading & Empty States
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: moderateScale(15),
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: scale(16),
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: moderateScale(15),
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

export default HomeScreen;
