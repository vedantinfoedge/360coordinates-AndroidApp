import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Share,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors, spacing, typography, borderRadius, fonts } from '../../theme';
import { TabIcon } from '../../components/navigation/TabIcons';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { useAuth } from '../../context/AuthContext';
import CustomAlert from '../../utils/alertHelper';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import PropertyCard from '../../components/PropertyCard';
import { buyerService, Property } from '../../services/buyer.service';
import { propertyService } from '../../services/property.service';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

const Gradient = LinearGradient as React.ComponentType<any>;
import { fixImageUrl } from '../../utils/imageHelper';
import { formatters } from '../../utils/formatters';

type DashboardScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerStackParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: DashboardScreenNavigationProp;
};

interface TopCity {
  id: string;
  name: string;
  image: any; // Image source (require() result)
}

const TOP_CITIES: TopCity[] = [
  { id: 'mumbai', name: 'Mumbai', image: require('../../assets/Mumbai.png') },
  { id: 'delhi', name: 'Delhi', image: require('../../assets/Delhi.png') },
  { id: 'bangalore', name: 'Bangalore', image: require('../../assets/Bangalore.png') },
  { id: 'hyderabad', name: 'Hyderabad', image: require('../../assets/Hyderabad.png') },
  { id: 'chennai', name: 'Chennai', image: require('../../assets/Chennai.png') },
  { id: 'pune', name: 'Pune', image: require('../../assets/Pune.png') },
  { id: 'kolkata', name: 'Kolkata', image: require('../../assets/kolkata.png') },
  { id: 'ahmedabad', name: 'Ahmedabad', image: require('../../assets/Ahmedabad.png') },
];

type ListingType = 'sale' | 'rent' | 'pg';

// Time-of-day greeting
const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
};

// Get user first name for personalized welcome
const getFirstName = (user: { full_name?: string } | null) => {
  if (!user || !user.full_name) return null;
  return user.full_name.trim().split(/\s+/)[0] || null;
};

// HTML reference colors (:root)
const DARK = '#1D242B';
const PRIMARY = '#0077C0';
const PRIMARY_LIGHT = '#C7EEFF';
const PRIMARY_XLIGHT = '#e8f7ff';
const PRIMARY_DARK = '#005a91';
const SUB = '#5a6a76';
const BORDER = '#d6ecf7';

const BuyerDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, isAuthenticated, switchUserRole } = useAuth();
  const [switchingRole, setSwitchingRole] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Load token from AsyncStorage to verify auth state
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@auth_token');
        setToken(storedToken);
      } catch (error) {
        console.error('[BuyerDashboard] Error loading token:', error);
      }
    };
    loadToken();
  }, [user, isAuthenticated]); // Reload token when auth state changes

  // Fixed login check: user exists OR token exists OR isAuthenticated is true
  // For guest users: user is null, token is null, and isAuthenticated is false
  const isLoggedIn = Boolean(user || token || isAuthenticated);
  const isGuest = !isLoggedIn;

  // Debug logs to verify auth state (MANDATORY DEBUG)
  useEffect(() => {
    console.log('[BuyerDashboard] AUTH DEBUG:');
    console.log('user:', user);
    console.log('isAuthenticated:', isAuthenticated);
    console.log('token:', token);
    console.log('isLoggedIn:', isLoggedIn);
    console.log('  - Header props will be:', {
      showLogout: isLoggedIn,
      showSignIn: isGuest,
      showSignUp: isGuest,
      showProfile: isLoggedIn,
    });
  }, [user, token, isAuthenticated, isLoggedIn, isGuest]);
  const [listingType, setListingType] = useState<ListingType>('sale');
  const [properties, setProperties] = useState<Property[]>([]);
  const [upcomingProjects, setUpcomingProjects] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<any>(null);
  useScrollToTop(scrollViewRef);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = insets.top + verticalScale(70);

  const searchInputContainerRef = useRef<View>(null);
  // Smooth marquee auto-scroll refs
  const carouselScrollRef = useRef<any>(null);
  const scrollPosition = useRef(0);
  const animationRef = useRef<number | null>(null);
  const isUserScrolling = useRef(false);
  const lastTimestamp = useRef<number>(0);
  const SCROLL_SPEED = 0.5;
  const CARD_WIDTH = scale(300);
  const CARD_MARGIN = scale(16);
  const ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;

  // Check user type access
  useEffect(() => {
    if (user && user.user_type === 'agent') {
      CustomAlert.alert(
        'Access Denied',
        'You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Agent' as never }],
              });
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }
  }, [user, navigation]);

  useEffect(() => {
    // Load data for guest or non-agent users (skip only for agent)
    if (!user || user.user_type !== 'agent') {
      loadDashboardData();

      // Auto-refresh every 10 seconds for all data
      refreshIntervalRef.current = setInterval(() => {
        loadDashboardData(false);
      }, 10000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [user, listingType]);

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
    }, 6000); // 6 second pause after user interaction
  }, []);

  // Pause marquee when user interacts with image carousel inside a card
  const handleImageCarouselScrollStart = useCallback(() => {
    isUserScrolling.current = true;
  }, []);
  const handleImageCarouselScrollEnd = useCallback(() => {
    setTimeout(() => {
      isUserScrolling.current = false;
    }, 6000);
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

      // PG tab: same as website - two API calls then merge
      let filteredProperties: any[] = [];
      if (listingType === 'pg') {
        const base = { limit: 10, status: 'rent' };
        const [resPG, resBachelors] = await Promise.all([
          propertyService.getProperties({ ...base, property_type: 'PG / Hostel' }) as Promise<any>,
          propertyService.getProperties({ ...base, available_for_bachelors: '1' }) as Promise<any>,
        ]);
        const byId = new Map<string, any>();
        const add = (list: any[]) => (list || []).forEach((p: any) => { const id = String(p.id ?? p.property_id ?? ''); if (id && !byId.has(id)) byId.set(id, p); });
        add(resPG?.success ? (resPG.data?.properties ?? resPG.data ?? []) : []);
        add(resBachelors?.success ? (resBachelors.data?.properties ?? resBachelors.data ?? []) : []);
        filteredProperties = Array.from(byId.values()).filter((p: any) => {
          const pt = (p.property_type || p.type || '').toLowerCase();
          const isPG = pt.includes('pg') || pt.includes('hostel') || p.status === 'pg';
          const forBachelors = p.available_for_bachelors === true || p.available_for_bachelors === 'true' || p.available_for_bachelors === 1 || p.available_for_bachelors === '1';
          return isPG || forBachelors;
        });
      } else {
        const listParams: any = { limit: 10 };
        if (listingType === 'sale') listParams.status = 'sale';
        else if (listingType === 'rent') listParams.status = 'rent';
        const propertiesResponse = await buyerService.getProperties(listParams);
        if (propertiesResponse.success && propertiesResponse.data) {
          filteredProperties = propertiesResponse.data.properties || [];
        }
      }

      if (filteredProperties.length >= 0) {
        // Filter "Explorer Properties" to show only normal properties (not upcoming) 
        // and only from 'seller' or 'agent'
        const validProperties = filteredProperties.filter(p => {
          const isNotProject = p.project_type !== 'upcoming';
          const validUserType = p.seller?.user_type === 'seller' || p.seller?.user_type === 'agent';
          // If seller info is missing, we assume it's valid for now or strictly filter? 
          // Let's strictly filter if user_type is present, or allow if missing (legacy data) but 'Explore Projects' rule is strict.
          // User request: "only normal properties which uploaded from seller and agent dashboard"
          // We'll require user_type for strict compliance if available, or pass if unknown but look like normal property.
          // For now, let's trust the 'seller' object if it exists.
          return isNotProject && (!p.seller || validUserType);
        });

        setProperties(validProperties as Property[]);
        const favorites = (validProperties as Property[])
          .filter(p => p.is_favorite)
          .map(p => Number(p.id));
        setFavoriteIds(new Set(favorites));
      }

      // Fetch Upcoming Projects
      const projectsResponse = await buyerService.getProperties({ limit: 50, project_type: 'upcoming' });

      if (projectsResponse.success && projectsResponse.data?.properties) {
        const projectsList = projectsResponse.data.properties as Property[];
        const upcoming = projectsList.filter(p => p.project_type === 'upcoming');
        setUpcomingProjects(upcoming);
      } else {
        setUpcomingProjects([]);
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
      // Close location suggestions
      setShowLocationSuggestions(false);

      // PART A: Safely get location input with trim() - handle null/empty/spaces
      // Empty location is VALID and should navigate to show ALL properties
      const location = (searchLocation || searchQuery || '').trim();

      // PART A: Always allow Search click - NO validation blocking empty input
      // Empty location is valid - will show ALL properties in SearchResults
      const params: any = {
        query: location, // Always pass query param (even if empty string)
        location: location, // Always pass location param (even if empty string)
      };

      // If location has value, add additional params for filtering
      if (location) {
        // Also set searchQuery for backward compatibility
        params.searchQuery = location;

        // Extract city from location if it's a city name (optional, for better filtering)
        const locationText = location.toLowerCase();
        const matchedCity = TOP_CITIES.find(city => city.name.toLowerCase() === locationText);
        if (matchedCity) {
          params.city = matchedCity.name;
        }
      }
      // If location is empty, params.location will be empty string
      // SearchResults screen will detect empty location and load ALL properties

      // Listing type (Buy, Rent, PG only)
      if (listingType === 'sale') {
        params.status = 'sale';
        params.listingType = 'buy';
      } else if (listingType === 'rent') {
        params.status = 'rent';
        params.listingType = 'rent';
      } else {
        params.status = 'rent';
        params.listingType = 'pg-hostel';
      }

      // Default to properties mode for general search
      params.searchMode = 'properties';

      console.log('[BuyerDashboard] Navigating to SearchResults with params:', params);
      (navigation as any).navigate('Search', { screen: 'SearchResults', params });
    } catch (error: any) {
      console.error('Error navigating to search:', error);
      CustomAlert.alert('Error', 'Failed to navigate to search. Please try again.');
    }
  };

  const handleToggleFavorite = async (propertyId: number) => {
    if (!isLoggedIn) {
      CustomAlert.alert(
        'Login Required',
        'Please login to add properties to your favorites.',
        [
          { text: 'Login', onPress: () => (navigation as any).navigate('Auth', { screen: 'Login' }) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    if (user?.user_type && user.user_type !== 'buyer') {
      CustomAlert.alert(
        'Switch to Buyer',
        'Favorites are available when viewing as a buyer.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch to Buyer', onPress: () => switchUserRole('buyer') },
        ]
      );
      return;
    }
    try {
      const response = await buyerService.toggleFavorite(propertyId) as any;
      if (response && response.success) {
        // Determine favorite status from response
        const isFavorite = response.data?.is_favorite ?? response.data?.favorite ?? !favoriteIds.has(propertyId);

        const idNum = Number(propertyId);
        const newFavoriteIds = new Set(favoriteIds);
        if (isFavorite) {
          newFavoriteIds.add(idNum);
        } else {
          newFavoriteIds.delete(idNum);
        }
        setFavoriteIds(newFavoriteIds);

        // Update property in all lists
        const updateIsFavorite = (p: Property) =>
          Number(p.id) === idNum ? { ...p, is_favorite: isFavorite } : p;
        setProperties(prev => prev.map(updateIsFavorite));
        setUpcomingProjects(prev => prev.map(updateIsFavorite));

        if (isFavorite) {
          CustomAlert.alert('Added to Favorites', 'View in Profile → My Favorites');
        }
        console.log(`Property ${propertyId} ${isFavorite ? 'added to' : 'removed from'} favorites`);
      } else {
        CustomAlert.alert('Error', (response as any)?.message || 'Failed to update favorite');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      const { toggleInCache } = await import('../../services/favoritesManager');
      const newState = await toggleInCache(propertyId);
      const idNum = Number(propertyId);
      const newFavoriteIds = new Set(favoriteIds);
      if (newState) newFavoriteIds.add(idNum);
      else newFavoriteIds.delete(idNum);
      setFavoriteIds(newFavoriteIds);
      const updateIsFavorite = (p: Property) =>
        Number(p.id) === idNum ? { ...p, is_favorite: newState } : p;
      setProperties(prev => prev.map(updateIsFavorite));
      setUpcomingProjects(prev => prev.map(updateIsFavorite));
      CustomAlert.alert(
        'Saved Locally',
        'Could not sync with server. Saved locally and will sync when connection is restored.'
      );
    }
  };

  const handleCityPress = (cityName: string) => {
    // Navigate to SearchResults with city name as both location and city params
    // This ensures proper filtering by city
    const params: any = {
      query: cityName,
      location: cityName,
      city: cityName,
      searchQuery: cityName,
      listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : 'rent',
      status: listingType === 'sale' ? 'sale' : 'rent',
      searchMode: 'properties', // Explicitly set search mode to properties
    };
    (navigation as any).navigate('Search', { screen: 'SearchResults', params });
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

  const renderPropertyCard = ({ item }: { item: Property }) => {
    const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
    const images: string[] | undefined = item.images?.length
      ? item.images
        .map((url: string) => fixImageUrl(url))
        .filter((url): url is string => Boolean(url))
      : undefined;
    return (
      <PropertyCard
        image={imageUrl || undefined}
        images={images}
        name={item.title}
        location={item.location}
        price={formatters.price(item.price, item.status === 'rent')}
        type={item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy'}
        onPress={() =>
          navigation.navigate(
            item.project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails',
            { propertyId: String(item.id) },
          )
        }
        onFavoritePress={() => handleToggleFavorite(Number(item.id))}
        onSharePress={() => handleShareProperty(item)}
        isFavorite={favoriteIds.has(Number(item.id)) || item.is_favorite || false}
        property={{
          ...item,
          project_type: item.project_type,
          project_status: item.project_status || item.upcoming_project_data?.project_status
        }}
        style={styles.propertyCardStyle}
      />
    );
  };

  const renderCityCard = ({ item }: { item: TopCity }) => (
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

  // Show access denied message if user is an agent
  if (user && user.user_type === 'agent') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.errorIconWrap}>
            <TabIcon name="alert" color={colors.textSecondary} size={48} />
          </View>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, {
          paddingTop: 0,
          paddingBottom: Math.max(verticalScale(spacing.xl), insets.bottom + 72), // Tab bar clearance so View Details stays visible
        }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Dark Header Section */}
        <View style={[styles.darkHeaderSection, { paddingTop: insets.top + spacing.sm }]}>
          {/* Greeting row: time + avatar */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <View style={styles.timeGreetingRow}>
                <TabIcon name="leaf" color={colors.success} size={16} />
                <Text style={styles.timeGreetingText}>{getTimeGreeting()}</Text>
              </View>
              <Text style={styles.welcomeTextDark}>
                Welcome{getFirstName(user) ? ', ' : ''}
                {getFirstName(user) ? (
                  <Text style={{ color: PRIMARY_LIGHT }}>{getFirstName(user)}</Text>
                ) : null}
              </Text>
              <Text style={styles.welcomeSubtextDark}>
                Find your dream property in India
              </Text>
            </View>
            {isLoggedIn && (
              <View style={styles.avatarWrapper}>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={() => setShowAvatarDropdown(true)}
                  activeOpacity={0.8}>
                  <Gradient
                    colors={[PRIMARY, PRIMARY_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{ (user?.full_name?.[0] || 'U').toUpperCase()}</Text>
                    <View style={styles.avatarStatusDot} />
                  </Gradient>
                </TouchableOpacity>
                <Modal
                  visible={showAvatarDropdown}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowAvatarDropdown(false)}>
                  <View style={styles.avatarDropdownOverlay}>
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      onPress={() => setShowAvatarDropdown(false)}
                    />
                    <View style={[styles.avatarDropdown, { top: insets.top + verticalScale(90) }]}>
                      <Pressable
                        style={styles.avatarDropdownItem}
                        onPress={() => {
                          setShowAvatarDropdown(false);
                          navigation.navigate('Profile');
                        }}>
                        <TabIcon name="profile" color={colors.text} size={18} />
                        <Text style={styles.avatarDropdownItemText}>Profile</Text>
                      </Pressable>
                      <Pressable
                        style={styles.avatarDropdownItem}
                        onPress={() => {
                          setShowAvatarDropdown(false);
                          logout();
                        }}>
                        <TabIcon name="logout" color={colors.text} size={18} />
                        <Text style={styles.avatarDropdownItemText}>Logout</Text>
                      </Pressable>
                    </View>
                  </View>
                </Modal>
              </View>
            )}
          </View>

          {/* Listing Type Toggle - Buy, Rent, PG/Hostel */}
          <View style={styles.toggleSection}>
            <TouchableOpacity
              style={[styles.toggleButtonDark, listingType === 'sale' && styles.toggleButtonActive]}
              onPress={() => setListingType('sale')}>
              <Text style={[styles.toggleButtonTextDark, listingType === 'sale' && styles.toggleButtonTextActive]}>
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButtonDark, listingType === 'rent' && styles.toggleButtonActive]}
              onPress={() => setListingType('rent')}>
              <Text style={[styles.toggleButtonTextDark, listingType === 'rent' && styles.toggleButtonTextActive]}>
                Rent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButtonDark, listingType === 'pg' && styles.toggleButtonActive]}
              onPress={() => setListingType('pg')}>
              <Text style={[styles.toggleButtonTextDark, listingType === 'pg' && styles.toggleButtonTextActive]}>
                PG/Hostel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar - light gray input per reference */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <View ref={searchInputContainerRef} style={styles.searchInputContainerRef}>
                <TabIcon name="search" color="rgba(199,238,255,0.6)" size={20} />
                <View style={styles.searchInputWrapper}>
                  <TextInput
                    style={styles.searchInputRef}
                    placeholder="City, locality, project…"
                    placeholderTextColor="rgba(199,238,255,0.4)"
                    value={searchLocation || searchQuery}
                    onChangeText={(text: string) => {
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
                    onRequestClose={() => setShowLocationSuggestions(false)}
                    anchorRef={searchInputContainerRef}
                  />
                </View>
              )}
            </View>

            {/* Map Banner - gradient + white text per HTML */}
            <TouchableOpacity
              style={styles.mapSearchCardRef}
              onPress={() => {
                try {
                  navigation.navigate('PropertyMap', {
                    listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : listingType,
                  } as never);
                } catch (error: any) {
                  console.error('Error navigating to map:', error);
                  CustomAlert.alert('Error', 'Map feature is not available. Please check Mapbox integration.');
                }
              }}
              activeOpacity={0.8}>
              <Gradient
                colors={[PRIMARY, PRIMARY_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
                  <Defs>
                    <Pattern id="mapCardDots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                      <Circle cx="2" cy="2" r="1" fill={PRIMARY_LIGHT} fillOpacity="0.22" />
                    </Pattern>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#mapCardDots)" />
                </Svg>
              </View>
              <View style={styles.mapSearchCardContent}>
                <View style={styles.mapIconWrap}>
                  <TabIcon name="location" color="#FFFFFF" size={22} />
                </View>
                <View style={styles.mapSearchCardText}>
                  <Text style={styles.mapSearchCardTitle}>Search on Map</Text>
                  <Text style={styles.mapSearchCardSubtitle}>Explore properties by location</Text>
                </View>
                <View style={styles.mapArrowCircle}>
                  <TabIcon name="chevron-right" color="#FFFFFF" size={18} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Light content area - Explore Projects, etc. */}
        <View style={styles.lightContentArea}>
        {/* Explore Projects Section (by Agent/Builder) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Explore Projects</Text>
              <Text style={styles.sectionSubtitle}>
                New projects from Agents & Builders
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                (navigation as any).navigate('Search', {
                  screen: 'SearchResults',
                  params: {
                    query: '',
                    location: '',
                    listingType: 'buy',
                    status: 'sale',
                    project_type: 'upcoming',
                    searchMode: 'projects',
                  },
                });
              }}>
              <View style={styles.seeAllPill}>
                <Text style={styles.seeAllText}>See All</Text>
              </View>
            </TouchableOpacity>
          </View>
          {upcomingProjects.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselList}>
              {upcomingProjects.map((item: Property) => {
                const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
                const images: string[] | undefined = item.images?.length
                  ? item.images
                    .map((url: string) => fixImageUrl(url))
                    .filter((url): url is string => Boolean(url))
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
                      onPress={() =>
                        navigation.navigate(
                          item.project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails',
                          { propertyId: String(item.id) },
                        )
                      }
                      onFavoritePress={() => handleToggleFavorite(Number(item.id))}
                      onSharePress={() => handleShareProperty(item)}
                      isFavorite={favoriteIds.has(Number(item.id)) || item.is_favorite || false}
                      property={{
                        ...item,
                        project_status: item.project_status || item.upcoming_project_data?.project_status
                      }}
                      style={styles.carouselPropertyCard}
                      hideTypeBadge={false}
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
                  const params: any = {
                    query: '',
                    location: '',
                    listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : 'rent',
                    status: listingType === 'sale' ? 'sale' : 'rent',
                    searchMode: 'properties', // Explicitly set search mode to properties
                  };

                  // Navigate directly to SearchResults screen
                  console.log('[BuyerDashboard] Navigating to SearchResults with params:', params);
                  (navigation as any).navigate('Search', { screen: 'SearchResults', params });
                } catch (error: any) {
                  console.error('Error navigating to all properties:', error);
                  CustomAlert.alert('Error', 'Failed to load all properties. Please try again.');
                }
              }}>
              <View style={styles.seeAllPill}>
                <Text style={styles.seeAllText}>See All</Text>
              </View>
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
              contentContainerStyle={styles.carouselList}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              onMomentumScrollEnd={(event: { nativeEvent: { contentOffset: { x: number } } }) => {
                scrollPosition.current = event.nativeEvent.contentOffset.x;
              }}>
              {getMarqueeData().map((item: Property, index: number) => {
                const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
                const images: string[] | undefined = item.images?.length
                  ? item.images
                    .map((url: string) => fixImageUrl(url))
                    .filter((url): url is string => Boolean(url))
                  : undefined;
                return (
                  <View key={`${item.id}-${index}`} style={styles.carouselCard}>
                    <PropertyCard
                      image={imageUrl || undefined}
                      images={images}
                      name={item.title}
                      location={item.location}
                      price={formatters.price(item.price, item.status === 'rent')}
                      type={item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy'}
                      onPress={() =>
                        navigation.navigate(
                          item.project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails',
                          { propertyId: String(item.id) },
                        )
                      }
                      onFavoritePress={() => handleToggleFavorite(Number(item.id))}
                      onSharePress={() => handleShareProperty(item)}
                      isFavorite={favoriteIds.has(Number(item.id)) || item.is_favorite || false}
                      property={{
                        ...item,
                        project_status: item.project_status || item.upcoming_project_data?.project_status
                      }}
                      style={styles.carouselPropertyCard}
                      onImageCarouselScrollStart={handleImageCarouselScrollStart}
                      onImageCarouselScrollEnd={handleImageCarouselScrollEnd}
                    />
                  </View>
                );
              })}
            </ScrollView>
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
            keyExtractor={(item: TopCity) => item.id}
            contentContainerStyle={styles.citiesList}
            renderItem={renderCityCard}
          />
        </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: verticalScale(spacing.xl),
    backgroundColor: '#FAFAFA',
  },
  // Dark header section (theme from reference image)
  darkHeaderSection: {
    backgroundColor: DARK,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  greetingLeft: {
    flex: 1,
  },
  timeGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timeGreetingText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: PRIMARY_LIGHT,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  welcomeTextDark: {
    fontSize: moderateScale(26),
    fontFamily: fonts.extraBold,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    lineHeight: moderateScale(32),
  },
  welcomeSubtextDark: {
    fontSize: moderateScale(14),
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: moderateScale(20),
  },
  avatarWrapper: { position: 'relative' },
  avatarButton: {
    marginLeft: spacing.md,
  },
  avatarDropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  avatarDropdown: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    minWidth: 160,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  avatarDropdownItemText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  avatarContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(199,238,255,0.3)',
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: fonts.extraBold,
    color: DARK,
  },
  avatarStatusDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: DARK,
  },
  toggleSection: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  toggleButtonDark: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: spacing.md,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(199,238,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(44),
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  toggleButtonTextDark: {
    fontSize: moderateScale(14),
    fontFamily: fonts.medium,
    color: 'rgba(199,238,255,0.6)',
  },
  toggleButtonTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  searchSection: {
    marginBottom: 0,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputContainerRef: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(199,238,255,0.25)',
    borderRadius: scale(12),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: verticalScale(50),
  },
  searchInputWrapper: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  searchInputRef: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#FFFFFF',
    padding: 0,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(10),
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  searchButtonText: {
    fontSize: moderateScale(14),
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
  },
  locationSuggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    zIndex: 1000,
  },
  mapSearchCardRef: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    overflow: 'hidden',
    minHeight: 72,
  },
  mapSearchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    zIndex: 1,
    justifyContent: 'space-between',
  },
  mapIconWrap: {
    marginRight: spacing.md,
    zIndex: 1,
  },
  mapSearchCardText: {
    flex: 1,
  },
  mapSearchCardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  mapSearchCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  mapArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    zIndex: 1,
  },
  lightContentArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: spacing.md,
    paddingHorizontal: 0,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.extraBold,
    color: colors.text,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  seeAllPill: {
    backgroundColor: PRIMARY_XLIGHT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 9999,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  propertiesList: {
    paddingHorizontal: spacing.lg,
    gap: 0,
  },
  propertyCardStyle: {
    width: '100%',
    marginRight: 0,
  },
  propertySeparator: {
    height: verticalScale(22),
  },
  carouselList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg + verticalScale(8),
  },
  carouselCard: {
    width: scale(300),
    marginRight: spacing.md,
  },
  carouselPropertyCard: {
    width: '100%',
  },
  citiesList: {
    paddingLeft: spacing.lg,
    gap: spacing.lg,
  },
  cityCard: {
    width: scale(100),
    alignItems: 'center',
    marginRight: spacing.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cityImageContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(14),
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cityImage: {
    width: '100%',
    height: '100%',
    borderRadius: scale(14),
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
  errorIcon: {
    fontSize: moderateScale(64),
    marginBottom: spacing.md,
  },
  errorIconWrap: {
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
});

export default BuyerDashboardScreen;
