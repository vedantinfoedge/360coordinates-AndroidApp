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
  Share,
  RefreshControl,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { colors, spacing, typography, borderRadius, fonts } from '../../theme';
import { TabIcon } from '../../components/navigation/TabIcons';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import PropertyCard from '../../components/PropertyCard';
import { buyerService, Property } from '../../services/buyer.service';
import { propertyService } from '../../services/property.service';
import { fixImageUrl } from '../../utils/imageHelper';
import CustomAlert from '../../utils/alertHelper';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

const Gradient = LinearGradient as React.ComponentType<any>;
import { formatters } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
};

const getFirstName = (u: { full_name?: string } | null) => {
  if (!u || !u.full_name) return null;
  return u.full_name.trim().split(/\s+/)[0] || null;
};

const DARK = '#1D242B';
const PRIMARY = '#0077C0';
const PRIMARY_LIGHT = '#C7EEFF';
const PRIMARY_XLIGHT = '#e8f7ff';
const PRIMARY_DARK = '#005a91';

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

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, isAuthenticated, switchUserRole } = useAuth();
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
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Header animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = insets.top + verticalScale(70);

  // Smooth marquee auto-scroll refs
  const carouselScrollRef = useRef<any>(null);
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
      const collectedFavoriteIds: number[] = [];

      // PG tab: same as website - two API calls then merge
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
        const filteredProperties = Array.from(byId.values()).filter((p: any) => {
          const pt = (p.property_type || p.type || '').toLowerCase();
          const isPG = pt.includes('pg') || pt.includes('hostel') || p.status === 'pg';
          const forBachelors = p.available_for_bachelors === true || p.available_for_bachelors === 'true' || p.available_for_bachelors === 1 || p.available_for_bachelors === '1';
          return isPG || forBachelors;
        });

        // Filter "Explorer Properties" to show only normal properties (not upcoming) 
        // and only from 'seller' or 'agent'
        const validProperties = filteredProperties.filter((p: any) => {
          const isNotProject = p.project_type !== 'upcoming';
          const validUserType = p.seller?.user_type === 'seller' || p.seller?.user_type === 'agent';
          return isNotProject && (!p.seller || validUserType);
        });
        setProperties(validProperties);
        collectedFavoriteIds.push(...(validProperties as any[]).filter((p: any) => p.is_favorite).map((p: any) => Number(p.id)));
      } else {
        const listParams: any = { limit: 10 };
        if (listingType === 'sale') listParams.status = 'sale';
        else if (listingType === 'rent') listParams.status = 'rent';
        const propertiesResponse = await buyerService.getProperties(listParams);
        if (propertiesResponse.success && propertiesResponse.data) {
          const rawProps = propertiesResponse.data.properties || [];
          // Apply same filtering
          const validProperties = rawProps.filter((p: Property) => {
            const isNotProject = p.project_type !== 'upcoming';
            const validUserType = p.seller?.user_type === 'seller' || p.seller?.user_type === 'agent';
            return isNotProject && (!p.seller || validUserType);
          });
          setProperties(validProperties as Property[]);
          collectedFavoriteIds.push(...(validProperties as any[]).filter((p: any) => p.is_favorite).map((p: any) => Number(p.id)));
        }
      }

      // Fetch extra data for Upcoming Projects and Buy New Home sections
      const [projectsResponse, propertiesResponse] = await Promise.all([
        buyerService.getProperties({ limit: 50, project_type: 'upcoming' }),
        buyerService.getProperties({ limit: 100 })
      ]);

      if (projectsResponse.success && projectsResponse.data?.properties) {
        const projectsList = projectsResponse.data.properties as Property[];
        setUpcomingProjects(projectsList.filter(p => p.project_type === 'upcoming'));
        collectedFavoriteIds.push(...(projectsList as any[]).filter((p: any) => p.is_favorite).map((p: any) => Number(p.id)));
      } else {
        setUpcomingProjects([]);
      }

      if (propertiesResponse.success && propertiesResponse.data?.properties) {
        const allList = propertiesResponse.data.properties as Property[];
        const buyNewList = allList
          .filter(
            p =>
              p.status === 'sale' &&
              p.project_type !== 'upcoming' &&
              (p.property_type || '').toLowerCase().includes('apartment'),
          )
          .slice(0, 15);
        setBuyNewHomeProperties(buyNewList);
        collectedFavoriteIds.push(...(buyNewList as any[]).filter((p: any) => p.is_favorite).map((p: any) => Number(p.id)));
      }
      setFavoriteIds(new Set(collectedFavoriteIds.filter(id => !isNaN(id))));
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

      // Default to properties mode for general search
      params.searchMode = 'properties';

      navigation.navigate('Search' as any, {
        screen: 'SearchResults',
        params: params,
      } as any);
    } catch (error: any) {
      console.error('Error navigating to search:', error);
      CustomAlert.alert('Error', 'Failed to navigate to search. Please try again.');
    }
  };

  const handleCityPress = (cityName: string) => {
    navigation.navigate('Search' as any, {
      screen: 'SearchResults',
      params: {
        location: cityName,
        searchMode: 'properties', // Explicitly set search mode to properties
      },
    } as any);
  };

  const handlePropertyPress = (property: Property) => {
    navigation.navigate('Search' as any, {
      screen: property.project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails',
      params: { propertyId: String(property.id) },
    } as any);
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
        'Favorites are available when viewing as a buyer. Switch to Buyer to add this property to your favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch to Buyer', onPress: () => switchUserRole('buyer') },
        ],
      );
      return;
    }
    try {
      const response = await buyerService.toggleFavorite(propertyId) as any;
      if (response && response.success) {
        const isFavorite = response.data?.is_favorite ?? response.data?.favorite ?? !favoriteIds.has(propertyId);
        const newFavoriteIds = new Set(favoriteIds);
        if (isFavorite) {
          newFavoriteIds.add(propertyId);
        } else {
          newFavoriteIds.delete(propertyId);
        }
        setFavoriteIds(newFavoriteIds);
        const updateProperty = (p: Property) =>
          p.id === propertyId ? { ...p, is_favorite: isFavorite } : p;
        setProperties(prev => prev.map(updateProperty));
        setUpcomingProjects(prev => prev.map(updateProperty));
        setBuyNewHomeProperties(prev => prev.map(updateProperty));
        if (isFavorite) {
          CustomAlert.alert('Added to favorites', 'View this and all favorites in Profile → My Favorites.');
        }
      } else {
        CustomAlert.alert('Error', response?.message || 'Failed to update favorite');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      CustomAlert.alert('Error', error?.message || 'Failed to update favorite');
    }
  };

  const renderPropertyCard = ({ item, index }: { item: Property; index: number }) => {
    const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
    const images = item.images?.length
      ? (item.images.map((url: string) => fixImageUrl(url)).filter(Boolean) as string[])
      : undefined;
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
        <PropertyCard
          image={imageUrl || undefined}
          images={images}
          name={item.title}
          location={item.location}
          price={formatters.price(item.price, item.status === 'rent')}
          type={item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy'}
          onPress={() => handlePropertyPress(item)}
          onFavoritePress={() => handleToggleFavorite(Number(item.id))}
          onSharePress={() => handleShareProperty(item)}
          isFavorite={favoriteIds.has(Number(item.id))}
          property={item}
        />
      </Animated.View>
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

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, {
            paddingTop: 0,
            paddingBottom: Math.max(spacing.xxl * 3, insets.bottom + 110), // Tab bar clearance so View Details button stays fully visible
          }]}
          showsVerticalScrollIndicator={false}
          onScroll={(event: { nativeEvent: { contentOffset: { y: number } } }) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            scrollY.setValue(offsetY);
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {/* Dark Header Section - matches reference UI */}
          <View style={[styles.darkHeaderSection, { paddingTop: insets.top + spacing.md }]}>
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
                      <Text style={styles.avatarText}>{(user?.full_name?.[0] || 'U').toUpperCase()}</Text>
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
                            navigation.navigate('Profile' as any);
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

            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainerRef}>
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
                    />
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.mapSearchCardRef}
                onPress={() => {
                  try {
                    navigation.navigate('Search' as any, {
                      screen: 'PropertyMap',
                      params: {
                        listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : listingType,
                      },
                    } as any);
                  } catch (err: any) {
                    console.error('Error navigating to map:', err);
                    CustomAlert.alert('Error', 'Map is not available.');
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
                      <Pattern id="homeMapCardDots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                        <Circle cx="2" cy="2" r="1" fill={PRIMARY_LIGHT} fillOpacity="0.22" />
                      </Pattern>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#homeMapCardDots)" />
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

          {/* Light content area */}
          <View style={styles.lightContentArea}>


          {/* Explore Projects Section */}
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
                  navigation.navigate('Search' as any, {
                    screen: 'SearchResults',
                    params: {
                      query: '',
                      location: '',
                      listingType: 'buy',
                      status: 'sale',
                      project_type: 'upcoming',
                      searchMode: 'projects',
                    },
                  } as any);
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
                        onPress={() => handlePropertyPress(item)}
                        onFavoritePress={() => handleToggleFavorite(Number(item.id))}
                        onSharePress={() => handleShareProperty(item)}
                        isFavorite={favoriteIds.has(Number(item.id))}
                        property={item}
                        style={styles.carouselPropertyCard}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No Explore projects at the moment</Text>
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
                    // Explore Properties -> See All should open SearchResults with ALL properties (no filters)
                    const params: any = {
                      query: '',
                      location: '',
                      listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : 'rent',
                      status: listingType === 'sale' ? 'sale' : 'rent',
                      searchMode: 'properties', // Explicitly set search mode to properties
                    };

                    // Navigate to SearchResults screen
                    console.log('[HomeScreen] Navigating to SearchResults with params:', params);
                    navigation.navigate('Search' as any, {
                      screen: 'SearchResults',
                      params: params,
                    } as any);
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
                contentContainerStyle={styles.propertiesList}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={(event: any) => {
                  scrollPosition.current = event.nativeEvent.contentOffset.x;
                }}>
                {getMarqueeData().map((item: Property, index: number) => {
                  const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
                  const images = item.images?.length
                    ? (item.images.map((url: string) => fixImageUrl(url)).filter(Boolean) as string[])
                    : undefined;
                  return (
                    <Animated.View
                      key={`${item.id}-${index}`}
                      style={[
                        styles.carouselCard,
                        {
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                        },
                      ]}>
                      <PropertyCard
                        image={imageUrl || undefined}
                        images={images}
                        name={item.title}
                        location={item.location}
                        price={formatters.price(item.price, item.status === 'rent')}
                        type={item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy'}
                        onPress={() => handlePropertyPress(item)}
                        onFavoritePress={() => handleToggleFavorite(Number(item.id))}
                        onSharePress={() => handleShareProperty(item)}
                        isFavorite={favoriteIds.has(Number(item.id))}
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
                  navigation.navigate('Search' as any, {
                    screen: 'SearchResults',
                    params: {
                      query: '',
                      location: '',
                      listingType: 'buy',
                      status: 'sale',
                      propertyType: 'Apartment',
                    },
                  } as any);
                }}>
                <View style={styles.seeAllPill}>
                  <Text style={styles.seeAllText}>See All</Text>
                </View>
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
                    ? (item.images.map((url: string) => fixImageUrl(url)).filter(Boolean) as string[])
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
                        onPress={() => handlePropertyPress(item)}
                        onFavoritePress={() => handleToggleFavorite(Number(item.id))}
                        onSharePress={() => handleShareProperty(item)}
                        isFavorite={favoriteIds.has(Number(item.id))}
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
                Search Residential Properties in Top Cities
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
    paddingTop: 0,
    backgroundColor: '#FAFAFA',
  },
  darkHeaderSection: {
    backgroundColor: DARK,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingTop: spacing.lg,
  },
  greetingLeft: { flex: 1 },
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
  avatarButton: { marginLeft: spacing.md },
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
  searchInputRef: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#FFFFFF',
    padding: 0,
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
  mapSearchCardText: { flex: 1 },
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
    paddingTop: spacing.lg,
  },
  // Welcome Section - Modern, spacious design (legacy, kept for structure)
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
    marginBottom: 0,
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
    shadowOffset: { width: 0, height: 4 },
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
    marginLeft: spacing.sm,
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
    shadowOffset: { width: 0, height: 2 },
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
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40', // Purple border with opacity
    marginTop: spacing.md,
  },
  mapSearchText: {
    ...typography.body,
    color: colors.primary, // Purple text
    fontWeight: '700',
    fontSize: 16,
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
    fontSize: 17,
    fontFamily: fonts.extraBold,
    color: colors.text,
    lineHeight: 24,
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
  // Properties List - Extra paddingBottom so View Details button clears tab bar
  propertiesList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + verticalScale(24),
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
    shadowOffset: { width: 0, height: 3 },
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
    shadowOffset: { width: 0, height: 2 },
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
