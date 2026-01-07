import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuyerHeader from '../../components/BuyerHeader';
import SearchBar from '../../components/SearchBar';
import PropertyCard from '../../components/PropertyCard';
import ProjectCard from '../../components/ProjectCard';
import PropertyMapView from '../../components/map/PropertyMapView';
import {propertyService} from '../../services/property.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {ListingType} from '../../data/propertyTypes';

type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
> & {
  navigate: (screen: string, params?: any) => void;
};

type Props = {
  navigation: DashboardScreenNavigationProp;
};

const BuyerDashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [searchType, setSearchType] = useState<ListingType>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [upcomingProjects, setUpcomingProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Load properties and projects from API
  useEffect(() => {
    loadProperties();
    loadUpcomingProjects();
  }, [searchType]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getProperties({
        status: searchType === 'buy' ? 'sale' : 'rent',
        limit: 10,
      });
      
      console.log('Properties API Response:', JSON.stringify(response, null, 2));
      
      if (response && response.success) {
        // Handle different response structures
        // Property service returns: {success: true, data: {properties: [...], total, page, total_pages}}
        const propertiesData = response.data?.properties || response.data || response.properties || [];
        
        if (Array.isArray(propertiesData) && propertiesData.length > 0) {
          // Convert to PropertyCard format with fixed image URLs
          const formattedProperties = propertiesData.map((prop: any) => ({
            id: prop.id?.toString() || prop.property_id?.toString() || '',
            name: prop.title || prop.property_title || prop.name || 'Untitled Property',
            location: prop.location || prop.city || prop.address || 'Location not specified',
            price: prop.status === 'sale' || prop.property_status === 'sale'
              ? `₹${parseFloat(prop.price || '0').toLocaleString('en-IN')}`
              : `₹${parseFloat(prop.price || '0').toLocaleString('en-IN')}/month`,
            type: (prop.status === 'sale' || prop.property_status === 'sale') ? 'buy' : 'rent',
            image: fixImageUrl(prop.cover_image || prop.image || prop.thumbnail),
            // Store full property data for map view
            fullProperty: prop,
          }));
          setProperties(formattedProperties);
        } else {
          console.log('No properties found in response');
          setProperties([]);
        }
      } else {
        console.log('API response not successful:', response);
        setProperties([]);
      }
    } catch (error: any) {
      console.error('Error loading properties:', error);
      
      // Handle different error types - API interceptor should format errors consistently
      const errorMessage = error?.message || 'Failed to load properties. Please try again.';
      console.error('Error details:', errorMessage);
      
      setProperties([]);
      
      // Optionally show error to user (uncomment if needed)
      // Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingProjects = async () => {
    try {
      setProjectsLoading(true);
      // Fetch recent properties as "upcoming projects" - can be filtered by property_type if needed
      const response = await propertyService.getProperties({
        status: 'approved',
        limit: 5,
        sort_by: 'newest',
      });
      
      if (response && response.success) {
        const propertiesData = response.data?.properties || response.data || [];
        
        // Format as projects
        const formattedProjects = propertiesData.map((prop: any) => ({
          id: prop.id?.toString() || prop.property_id?.toString() || '',
          name: prop.title || prop.property_title || 'Untitled Property',
          city: prop.city || prop.location || 'Location not specified',
        }));
        
        setUpcomingProjects(formattedProjects);
      }
    } catch (error: any) {
      console.error('Error loading upcoming projects:', error);
      setUpcomingProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <BuyerHeader
        onProfilePress={() => {
          // Navigate to Profile tab - it's in the same tab navigator
          navigation.navigate('Profile');
        }}
        onSupportPress={() => {
          // Navigate to Support screen
          navigation.navigate('Support');
        }}
        onLogoutPress={logout}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {user ? `Hello, ${(user.full_name || '').split(' ')[0]}` : 'Welcome'}
          </Text>
          <Text style={styles.welcomeSubtext}>
            Find your dream property in India
          </Text>
        </View>

        {/* Buy/Rent/PG-Hostel Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              searchType === 'buy' && styles.toggleButtonActive,
            ]}
            onPress={() => setSearchType('buy')}>
            <Text
              style={[
                styles.toggleText,
                searchType === 'buy' && styles.toggleTextActive,
              ]}>
              Buy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              searchType === 'rent' && styles.toggleButtonActive,
            ]}
            onPress={() => setSearchType('rent')}>
            <Text
              style={[
                styles.toggleText,
                searchType === 'rent' && styles.toggleTextActive,
              ]}>
              Rent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              searchType === 'pg-hostel' && styles.toggleButtonActive,
            ]}
            onPress={() => setSearchType('pg-hostel')}>
            <Text
              style={[
                styles.toggleText,
                searchType === 'pg-hostel' && styles.toggleTextActive,
              ]}>
              PG/Hostel
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchBar
          placeholder="Search by city, locality, project"
          value={searchQuery}
          onChangeText={setSearchQuery}
          navigation={navigation}
          onSearchPress={() => {
            navigation.navigate('PropertyList', {searchQuery});
          }}
        />

        {/* Quick Filters */}
        <View style={styles.quickFiltersSection}>
          <Text style={styles.sectionTitleSmall}>Quick Filters</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFiltersContainer}>
            {['Apartments', 'Villas', 'Plots', 'Commercial', 'PG/Hostel'].map(
              (filter, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickFilterChip}>
                  <Text style={styles.quickFilterText}>{filter}</Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>
        </View>

        {/* Featured Properties Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Properties</Text>
            <View style={styles.headerActions}>
              {/* View Toggle */}
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    viewMode === 'list' && styles.toggleButtonActive,
                  ]}
                  onPress={() => setViewMode('list')}>
                  <Text
                    style={[
                      styles.toggleText,
                      viewMode === 'list' && styles.toggleTextActive,
                    ]}>
                    📋
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    viewMode === 'map' && styles.toggleButtonActive,
                  ]}
                  onPress={() => setViewMode('map')}>
                  <Text
                    style={[
                      styles.toggleText,
                      viewMode === 'map' && styles.toggleTextActive,
                    ]}>
                    🗺️
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('PropertyList')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
          </View>
          {viewMode === 'map' ? (
            <View style={styles.mapContainer}>
              <PropertyMapView
                properties={properties
                  .filter(prop => prop.fullProperty?.latitude && prop.fullProperty?.longitude)
                  .map(prop => ({
                    id: prop.id,
                    title: prop.name,
                    location: prop.location,
                    price: parseFloat(prop.fullProperty?.price || prop.price.replace(/[₹,]/g, '') || '0'),
                    status: prop.type === 'buy' ? 'sale' : 'rent',
                    latitude: parseFloat(prop.fullProperty?.latitude || '0'),
                    longitude: parseFloat(prop.fullProperty?.longitude || '0'),
                    cover_image: prop.image,
                  }))}
                onPropertyPress={property => {
                  navigation.navigate('PropertyDetails', {propertyId: property.id});
                }}
                showListToggle={false}
              />
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading properties...</Text>
            </View>
          ) : properties.length > 0 ? (
            <FlatList
              data={properties}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.propertiesList}
              renderItem={({item}) => (
                <PropertyCard
                  name={item.name}
                  location={item.location}
                  price={item.price}
                  type={item.type}
                  onPress={() => navigation.navigate('PropertyDetails', {propertyId: item.id})}
                />
              )}
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
            <TouchableOpacity onPress={() => navigation.navigate('PropertyList')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {projectsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading projects...</Text>
            </View>
          ) : upcomingProjects.length > 0 ? (
            <FlatList
              data={upcomingProjects}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.projectsList}
              renderItem={({item}) => (
                <ProjectCard
                  project={item}
                  onPress={() => {
                    navigation.navigate('PropertyDetails', {propertyId: item.id});
                  }}
                />
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No projects available</Text>
            </View>
          )}
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
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: colors.text,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  quickFiltersSection: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitleSmall: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  quickFiltersContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  quickFilterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickFilterText: {
    ...typography.caption,
    color: colors.text,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: 2,
    gap: 2,
  },
  mapContainer: {
    height: 400,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  seeAllText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  propertiesList: {
    paddingLeft: spacing.lg,
    gap: spacing.md,
  },
  projectsList: {
    paddingLeft: spacing.lg,
    gap: spacing.md,
  },
});

export default BuyerDashboardScreen;

