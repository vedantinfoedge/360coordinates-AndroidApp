import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerStackParamList} from '../../navigation/BuyerNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import PropertyCard from '../../components/PropertyCard';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import {buyerService, Property} from '../../services/buyer.service';
import {propertyService} from '../../services/property.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';
import LoadingScreen from '../../components/common/LoadingScreen';
import { buildPGHostelFetchParams } from '../../utils/propertySearchParams';

type AllPropertiesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerStackParamList>,
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
  const insets = useSafeAreaInsets();
  const listingType = route?.params?.listingType || 'all';
  const headerHeight = insets.top + 70;
  const scrollY = useRef(new Animated.Value(0)).current;
  
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
        statusFilter = 'rent';
        propertyTypeFilter = 'PG / Hostel';
      }
      
      let propertiesList: any[] = [];
      if (listingType === 'pg-hostel') {
        const { pgParams, bachelorsParams } = buildPGHostelFetchParams({
          page: pageNum,
          limit: 50,
        });
        const [resPG, resBachelors] = await Promise.all([
          propertyService.getProperties(pgParams) as Promise<any>,
          propertyService.getProperties(bachelorsParams) as Promise<any>,
        ]);
        const byId = new Map<string, any>();
        const add = (list: any[]) => {
          (list || []).forEach((p: any) => {
            const id = String(p.id ?? p.property_id ?? '');
            if (id && !byId.has(id)) byId.set(id, p);
          });
        };
        add(resPG?.success ? (resPG.data?.properties ?? resPG.data ?? []) : []);
        add(resBachelors?.success ? (resBachelors.data?.properties ?? resBachelors.data ?? []) : []);
        propertiesList = Array.from(byId.values()).filter((p: any) => {
          const pt = (p.property_type || p.type || '').toLowerCase();
          const isPG = pt.includes('pg') || pt.includes('hostel') || p.status === 'pg';
          const forBachelors = p.available_for_bachelors === true || p.available_for_bachelors === 'true' || p.available_for_bachelors === 1 || p.available_for_bachelors === '1';
          return isPG || forBachelors;
        });
      }
      let pagination: any = null;
      if (listingType !== 'pg-hostel') {
        const params: any = { page: pageNum, limit: 50 };
        if (statusFilter) params.status = statusFilter;
        if (propertyTypeFilter) params.property_type = propertyTypeFilter;
        const response = await buyerService.getProperties(params);
        if (response?.success && response.data) {
          propertiesList = response.data.properties || [];
          pagination = response.data.pagination ?? null;
        }
      } else {
        pagination = { page: pageNum, total_pages: 1, total: propertiesList.length, limit: 50 };
      }
      
      const favorites = propertiesList.filter((p: any) => p.is_favorite).map((p: any) => p.id);
      setFavoriteIds(new Set(favorites));
      if (append) {
        setProperties(prev => [...prev, ...propertiesList]);
      } else {
        setProperties(propertiesList);
      }
      if (pagination) {
        const currentPage = pagination.page ?? pageNum;
        const totalPages = pagination.total_pages ?? Math.ceil((pagination.total || 0) / (pagination.limit || 50));
        setHasMore(currentPage < totalPages);
      } else {
        setHasMore(propertiesList.length >= 50);
      }
    } catch (error: any) {
      console.error('Error loading properties:', error);
      if (!append) {
        CustomAlert.alert('Error', error.message || 'Failed to load properties');
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
      CustomAlert.alert('Error', error?.message || 'Failed to update favorite');
    }
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
      }
    }
  };

  const renderProperty = ({item}: {item: Property}) => {
    const imageUrl = fixImageUrl(item.cover_image || item.images?.[0]);
    const images: string[] | undefined = item.images?.length
      ? item.images.map((url: string) => fixImageUrl(url)).filter((url): url is string => Boolean(url))
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
            {propertyId: String(item.id)},
          )
        }
        onFavoritePress={() => handleToggleFavorite(item.id)}
        onSharePress={() => handleShareProperty(item)}
        isFavorite={favoriteIds.has(item.id) || item.is_favorite || false}
        property={item}
      />
    );
  };

  const getScreenTitle = () => {
    if (listingType === 'buy') return 'All Properties - Buy';
    if (listingType === 'rent') return 'All Properties - Rent';
    if (listingType === 'pg-hostel') return 'All Properties - PG/Hostel';
    return 'All Properties';
  };

  if (loading && properties.length === 0) {
    return <LoadingScreen variant="search" />;
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
        scrollY={scrollY}
        headerHeight={headerHeight}
      />
      
      {/* Header with Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getScreenTitle()}</Text>
        <Text style={styles.headerSubtitle}>
          {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
        </Text>
      </View>

      {/* Properties List */}
      <Animated.FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={[styles.listContent, {paddingTop: insets.top + spacing.md}]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true},
        )}
        scrollEventThrottle={16}
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

