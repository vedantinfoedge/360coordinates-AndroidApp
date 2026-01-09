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
  Share,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuyerHeader from '../../components/BuyerHeader';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import PropertyCard from '../../components/PropertyCard';
import ProjectCard from '../../components/ProjectCard';
import {buyerService, Property} from '../../services/buyer.service';
import {favoriteService} from '../../services/favorite.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';

type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: DashboardScreenNavigationProp;
};

interface TopCity {
  id: string;
  name: string;
  image: string;
}

const TOP_CITIES: TopCity[] = [
  {id: 'mumbai', name: 'Mumbai', image: '🏙️'},
  {id: 'delhi', name: 'Delhi', image: '🏛️'},
  {id: 'bangalore', name: 'Bangalore', image: '🌆'},
  {id: 'hyderabad', name: 'Hyderabad', image: '🏢'},
  {id: 'chennai', name: 'Chennai', image: '🌊'},
  {id: 'pune', name: 'Pune', image: '🏘️'},
  {id: 'kolkata', name: 'Kolkata', image: '🎭'},
  {id: 'ahmedabad', name: 'Ahmedabad', image: '🏗️'},
];

type ListingType = 'all' | 'sale' | 'rent' | 'pg';

const BuyerDashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [listingType, setListingType] = useState<ListingType>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [upcomingProjects, setUpcomingProjects] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check user type access
  useEffect(() => {
    if (user && user.user_type === 'agent') {
      Alert.alert(
        'Access Denied',
        'You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{name: 'Agent' as never}],
              });
            },
          },
        ],
        {cancelable: false}
      );
      return;
    }
  }, [user, navigation]);

  useEffect(() => {
    // Only load data if user is not an agent
    if (user && user.user_type !== 'agent') {
      loadDashboardData();
    
      // Auto-refresh every 60 seconds for all data
      refreshIntervalRef.current = setInterval(() => {
        loadDashboardData(false); // Silent refresh
      }, 60000);

      // Auto-refresh upcoming projects every 30 seconds for real-time updates
      const projectsInterval = setInterval(async () => {
        try {
          setProjectsLoading(true);
          const projectsResponse = await buyerService.getProperties({
            limit: 20,
            project_type: 'upcoming',
          });
          if (projectsResponse.success && projectsResponse.data) {
            const allProjects = projectsResponse.data.properties || [];
            const upcoming = allProjects.filter((p: any) => 
              p.project_type === 'upcoming' || 
              p.status === 'upcoming' ||
              p.type === 'upcoming'
            );
            setUpcomingProjects(upcoming.length > 0 ? upcoming : allProjects.slice(0, 5));
          }
        } catch (error) {
          console.error('Error refreshing upcoming projects:', error);
        } finally {
          setProjectsLoading(false);
        }
      }, 30000); // Refresh every 30 seconds

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        clearInterval(projectsInterval);
      };
    }
  }, [user, listingType]); // Reload when listing type changes

  const loadDashboardData = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Build status filter based on listing type
      let statusFilter: 'sale' | 'rent' | 'pg' | undefined = undefined;
      if (listingType === 'sale') {
        statusFilter = 'sale';
      } else if (listingType === 'rent') {
        statusFilter = 'rent';
      } else if (listingType === 'pg') {
        statusFilter = 'pg'; // PG/Hostel filter
      }
      // Note: 'all' shows all properties (no filter)
      
      // Load properties and projects in parallel
      const [propertiesResponse, projectsResponse] = await Promise.all([
        buyerService.getProperties({
          limit: 10,
          ...(statusFilter && {status: statusFilter}),
        }),
        buyerService.getProperties({
          limit: 20,
          project_type: 'upcoming', // Filter for upcoming projects
        }),
      ]);

      if (propertiesResponse.success && propertiesResponse.data) {
        let filteredProperties = propertiesResponse.data.properties || [];
        
        // Additional filter for PG/Hostel - ensure property_type matches
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
        // Extract favorite IDs
        const favorites = filteredProperties
          .filter(p => p.is_favorite)
          .map(p => p.id);
        setFavoriteIds(new Set(favorites));
      }

      if (projectsResponse.success && projectsResponse.data) {
        const allProjects = projectsResponse.data.properties || [];
        // Filter for upcoming projects if backend doesn't filter
        const upcoming = allProjects.filter((p: any) => 
          p.project_type === 'upcoming' || 
          p.status === 'upcoming' ||
          p.type === 'upcoming'
        );
        setUpcomingProjects(upcoming.length > 0 ? upcoming : allProjects.slice(0, 5));
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
      // Close location suggestions
      setShowLocationSuggestions(false);
      
      // Get the search location text (trimmed)
      const searchLocationText = (searchLocation || searchQuery || '').trim();
      
      // If no location is provided, show an alert
      if (!searchLocationText) {
        Alert.alert('Search Required', 'Please enter a location to search for properties.');
        return;
      }
      
      // Navigate to SearchResults with search params (website-style API params)
      const params: any = {};
      
      // Location (preferred over city according to website spec) - this is the key parameter for searching
      params.location = searchLocationText;
      
      // Also set searchQuery for backward compatibility
      params.searchQuery = searchLocationText;
      
      // Extract city from location if it's a city name (optional, for better filtering)
      const locationText = searchLocationText.toLowerCase();
      const matchedCity = TOP_CITIES.find(city => city.name.toLowerCase() === locationText);
      if (matchedCity) {
        params.city = matchedCity.name;
      }
      
      // Add listing type filter
      if (listingType !== 'all') {
        if (listingType === 'sale') {
          params.status = 'sale';
          params.listingType = 'buy';
        } else if (listingType === 'rent') {
          params.status = 'rent';
          params.listingType = 'rent';
        } else if (listingType === 'pg') {
          params.status = 'rent'; // PG uses rent status in API
          params.listingType = 'pg-hostel';
        }
      }
      
      console.log('[BuyerDashboard] Navigating to SearchResults with params:', params);
      navigation.navigate('SearchResults', params as never);
    } catch (error: any) {
      console.error('Error navigating to search:', error);
      Alert.alert('Error', 'Failed to navigate to search. Please try again.');
    }
  };

  const handleToggleFavorite = async (propertyId: number) => {
    try {
      const response = await buyerService.toggleFavorite(propertyId);
      if (response && response.success) {
        // Determine favorite status from response
        const isFavorite = response.data?.is_favorite ?? response.data?.favorite ?? !favoriteIds.has(propertyId);
        
        const newFavoriteIds = new Set(favoriteIds);
        if (isFavorite) {
          newFavoriteIds.add(propertyId);
        } else {
          newFavoriteIds.delete(propertyId);
        }
        setFavoriteIds(newFavoriteIds);
        
        // Update property in list
        setProperties(prev =>
          prev.map(p =>
            p.id === propertyId
              ? {...p, is_favorite: isFavorite}
              : p,
          ),
        );
        
        console.log(`Property ${propertyId} ${isFavorite ? 'added to' : 'removed from'} favorites`);
      } else {
        Alert.alert('Error', response?.message || 'Failed to update favorite');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', error?.message || 'Failed to update favorite');
    }
  };

  const handleCityPress = (cityName: string) => {
    navigation.navigate('SearchResults', {
      location: cityName,
    } as never);
  };

  const handleShareProperty = async (property: Property) => {
    try {
      const shareUrl = `https://demo1.indiapropertys.com/property/${property.id}`;
      const shareMessage = `Check out this property: ${property.title}\nLocation: ${property.location}\nPrice: ${formatters.price(property.price, property.status === 'rent')}\n\nView more: ${shareUrl}`;
      
      await Share.share({
        message: shareMessage,
        title: property.title,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing property:', error);
        Alert.alert('Error', 'Failed to share property. Please try again.');
      }
    }
  };

  const renderPropertyCard = ({item}: {item: Property}) => (
    <PropertyCard
      image={fixImageUrl(item.cover_image || item.images?.[0])}
      name={item.title}
      location={item.location}
      price={formatters.price(item.price, item.status === 'rent')}
      type={item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy'}
      onPress={() => navigation.navigate('PropertyDetails', {propertyId: String(item.id)})}
      onFavoritePress={() => handleToggleFavorite(item.id)}
      onSharePress={() => handleShareProperty(item)}
      isFavorite={favoriteIds.has(item.id) || item.is_favorite || false}
      property={item}
    />
  );

  const renderProjectCard = ({item}: {item: Property}) => (
    <ProjectCard
      name={item.title}
      city={item.location}
      image={fixImageUrl(item.cover_image || item.images?.[0])}
      onPress={() => navigation.navigate('PropertyDetails', {propertyId: String(item.id)})}
    />
  );

  const renderCityCard = ({item}: {item: TopCity}) => (
    <TouchableOpacity
      style={styles.cityCard}
      onPress={() => handleCityPress(item.name)}>
      <View style={styles.cityImageContainer}>
        <Text style={styles.cityEmoji}>{item.image}</Text>
      </View>
      <Text style={styles.cityName}>{item.name}</Text>
    </TouchableOpacity>
  );

  // Show access denied message if user is an agent
  if (user && user.user_type === 'agent') {
    return (
      <View style={styles.container}>
        <BuyerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorIcon}>🚫</Text>
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
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {user ? `Hello, ${(user.full_name || '').split(' ')[0]}` : 'Welcome'}
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
          
          {/* Search on Map Button */}
          <TouchableOpacity
            style={styles.mapSearchButton}
            onPress={() => {
              try {
                navigation.navigate('PropertyMap', {
                  listingType: listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : listingType,
                } as never);
              } catch (error: any) {
                console.error('Error navigating to map:', error);
                Alert.alert('Error', 'Map feature is not available. Please check Mapbox integration.');
              }
            }}>
            <Text style={styles.mapSearchIcon}>🗺️</Text>
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
                  // Pass listing type filter to show filtered properties in list view
                  const params: any = {};
                  if (listingType !== 'all') {
                    params.listingType = listingType === 'sale' ? 'buy' : listingType === 'pg' ? 'pg-hostel' : listingType;
                  }
                  navigation.navigate('AllProperties', params as never);
                } catch (error: any) {
                  console.error('Error navigating to all properties:', error);
                  Alert.alert('Error', 'Failed to load all properties. Please try again.');
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

        {/* Upcoming Projects Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Projects</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CityProjects' as never)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {projectsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading projects...</Text>
            </View>
          ) : upcomingProjects.length > 0 ? (
            <FlatList
              data={upcomingProjects}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={styles.projectsList}
              renderItem={renderProjectCard}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No projects available</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  mapSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapSearchIcon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  mapSearchText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
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
  projectsList: {
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
  },
  cityEmoji: {
    fontSize: 40,
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
    fontSize: 64,
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
