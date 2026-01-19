import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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
import PropertyCard from '../../components/PropertyCard';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import {buyerService, Property} from '../../services/buyer.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';

type AllPropertiesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: AllPropertiesScreenNavigationProp;
  route?: {
    params?: {
      listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
    };
  };
};

const AllPropertiesScreen: React.FC<Props> = ({navigation, route}) => {
  const {logout, user, isAuthenticated} = useAuth();
  const listingType = route?.params?.listingType || 'all';
  
  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadProperties(1, false);
  }, [listingType]);

  const loadProperties = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }
      
      // Build status filter based on listing type
      let statusFilter: 'sale' | 'rent' | 'pg' | undefined = undefined;
      let propertyTypeFilter: string | undefined = undefined;
      
      if (listingType === 'buy') {
        statusFilter = 'sale';
      } else if (listingType === 'rent') {
        statusFilter = 'rent';
      } else if (listingType === 'pg-hostel') {
        statusFilter = 'rent'; // PG/Hostel are often listed under 'rent' status
        propertyTypeFilter = 'pg-hostel'; // Specific property type filter
      }
      
      const params: any = {
        page: pageNum,
        limit: 50,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (propertyTypeFilter) {
        params.property_type = propertyTypeFilter;
      }
      
      const response = await buyerService.getProperties(params);
      
      if (response && response.success && response.data) {
        let propertiesList = response.data.properties || [];
        
        // Additional filter for PG/Hostel to ensure we only get PG/Hostel properties
        if (listingType === 'pg-hostel') {
          propertiesList = propertiesList.filter((prop: any) => {
            const propType = (prop.property_type || prop.type || '').toLowerCase();
            return propType.includes('pg') || 
                   propType.includes('hostel') || 
                   propType === 'pg-hostel' ||
                   prop.status === 'pg';
          });
        }
        
        // Extract favorite IDs
        const favorites = propertiesList
          .filter((p: any) => p.is_favorite)
          .map((p: any) => p.id);
        setFavoriteIds(new Set(favorites));
        
        if (append) {
          setProperties(prev => [...prev, ...propertiesList]);
        } else {
          setProperties(propertiesList);
        }
        
        // Check pagination
        const pagination = response.data.pagination;
        if (pagination) {
          const currentPage = pagination.page || pageNum;
          const totalPages = pagination.total_pages || Math.ceil((pagination.total || 0) / (pagination.limit || 50));
          setHasMore(currentPage < totalPages);
        } else {
          setHasMore(propertiesList.length === 50);
        }
      } else {
        if (!append) {
          setProperties([]);
        }
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error loading properties:', error);
      if (!append) {
        Alert.alert('Error', error.message || 'Failed to load properties');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadProperties(1, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadProperties(nextPage, true);
    }
  };

  const handleToggleFavorite = async (propertyId: number) => {
    try {
      const response = await buyerService.toggleFavorite(propertyId);
      if (response && response.success) {
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
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', error?.message || 'Failed to update favorite');
    }
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
      }
    }
  };

  const renderProperty = ({item}: {item: Property}) => (
    <PropertyCard
      image={fixImageUrl(item.cover_image || item.images?.[0])}
      name={item.title}
      location={item.location}
      price={formatters.price(item.price, item.status === 'rent')}
      type={item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy'}
      onPress={() => navigation.navigate('PropertyDetails', {propertyId: item.id})}
      onFavoritePress={() => handleToggleFavorite(item.id)}
      onSharePress={() => handleShareProperty(item)}
      isFavorite={favoriteIds.has(item.id) || item.is_favorite || false}
      property={item}
    />
  );

  const getScreenTitle = () => {
    if (listingType === 'buy') return 'All Properties - Buy';
    if (listingType === 'rent') return 'All Properties - Rent';
    if (listingType === 'pg-hostel') return 'All Properties - PG/Hostel';
    return 'All Properties';
  };

  if (loading && properties.length === 0) {
    return (
      <View style={styles.container}>
        <BuyerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
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
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
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
      />
      
      {/* Header with Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getScreenTitle()}</Text>
        <Text style={styles.headerSubtitle}>
          {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
        </Text>
      </View>

      {/* Properties List */}
      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No properties found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        }
        ListFooterComponent={
          loading && properties.length > 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
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
    textAlign: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  footerLoader: {
    paddingVertical: spacing.md,
  },
});

export default AllPropertiesScreen;

