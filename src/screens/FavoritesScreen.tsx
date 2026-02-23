import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BuyerStackParamList } from '../navigation/BuyerNavigator';
import { colors, spacing, typography, borderRadius } from '../theme';
import { TabIcon } from '../components/navigation/TabIcons';
import { buyerService } from '../services/buyer.service';
import { fixImageUrl } from '../utils/imageHelper';
import { formatters } from '../utils/formatters';
import PropertyCard from '../components/PropertyCard';
import { useAuth } from '../context/AuthContext';
import CustomAlert from '../utils/alertHelper';

type FavoritesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerStackParamList, 'Favorites'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: FavoritesScreenNavigationProp;
};

interface Property {
  id: number | string;
  title: string;
  location?: string;
  city?: string;
  price: number | string;
  status?: 'sale' | 'rent' | 'pg';
  cover_image?: string;
  images?: string[];
  property_type?: string;
  is_favorite?: boolean;
  project_type?: string;
}

const FavoritesScreen: React.FC<Props> = ({ navigation }) => {
  const { logout, user, isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);

  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadFavorites = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      console.log('==== [FavoritesScreen] LOAD FAVORITES START ====');
      console.log('[FavoritesScreen] Page:', pageNum, 'Append:', append);

      if (pageNum === 1) {
        setLoading(true);
      }

      // Use buyer service endpoint (matches the toggle endpoint)
      const response = await buyerService.getFavorites({
        page: pageNum,
        limit: 20,
        replaceCache: pageNum === 1 && !append,
      });

      console.log('[FavoritesScreen] Response - Success:', response?.success);
      console.log('[FavoritesScreen] Response - Message:', response?.message);
      console.log('[FavoritesScreen] Response - Data keys:', response?.data ? Object.keys(response.data) : 'null');

      if (response && response.success && response.data) {
        // Handle buyer service response format
        const propertiesList = response.data.properties || (response.data as { favorites?: Property[] }).favorites || [];
        console.log('[FavoritesScreen] Properties count from API:', propertiesList.length);
        console.log('[FavoritesScreen] First property (if any):', propertiesList[0] ? JSON.stringify(propertiesList[0], null, 2) : 'none');

        const formattedProperties: Property[] = propertiesList.map((prop: any) => ({
          id: prop.id || prop.property_id,
          title: prop.title || prop.property_title || 'Untitled Property',
          location: prop.location || prop.city || 'Location not specified',
          city: prop.city,
          price: prop.price || 0,
          status: prop.status || (prop.listing_type === 'rent' ? 'rent' : prop.listing_type === 'pg-hostel' ? 'pg' : 'sale'),
          cover_image: fixImageUrl(prop.cover_image || prop.images?.[0] || '') ?? undefined,
          images: ((prop.images || []) as string[]).map((url: string) => fixImageUrl(url)).filter((url: string | null): url is string => Boolean(url)),
          property_type: prop.property_type,
          is_favorite: true, // All items in favorites are favorited
          project_type: prop.project_type,
        }));

        console.log('[FavoritesScreen] Formatted properties count:', formattedProperties.length);

        if (append) {
          setProperties(prev => [...prev, ...formattedProperties]);
          console.log('[FavoritesScreen] Appended to existing properties');
        } else {
          setProperties(formattedProperties);
          console.log('[FavoritesScreen] Set new properties list');
        }

        // Check if there are more pages
        const pagination = response.data.pagination;
        if (pagination) {
          console.log('[FavoritesScreen] Pagination:', JSON.stringify(pagination, null, 2));
          const currentPage = (pagination as { page?: number; current_page?: number }).current_page ?? pagination.page;
          setHasMore(currentPage < pagination.total_pages);
        } else {
          setHasMore(formattedProperties.length === 20);
          console.log('[FavoritesScreen] No pagination info, hasMore based on count:', formattedProperties.length === 20);
        }
      } else {
        console.log('[FavoritesScreen] No data or unsuccessful response');
        if (!append) {
          setProperties([]);
        }
        setHasMore(false);
      }
      console.log('==== [FavoritesScreen] LOAD FAVORITES END ====\n');
    } catch (error: any) {
      console.error('[FavoritesScreen] Error loading favorites:', error);
      console.error('[FavoritesScreen] Error details:', JSON.stringify(error, null, 2));
      console.log('==== [FavoritesScreen] LOAD FAVORITES END (ERROR) ====\n');
      if (!append) {
        CustomAlert.alert('Error', error.message || 'Failed to load favorites');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadFavorites(1, false);
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, loadFavorites]);

  // Reload favorites whenever this screen is focused (e.g. from Profile → My Favorites)
  // so that items added from anywhere (search, details, map, etc.) appear in the list
  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        loadFavorites(1, false);
      }
    }, [isLoggedIn, loadFavorites])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadFavorites(1, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadFavorites(nextPage, true);
    }
  };

  const handleToggleFavorite = async (propertyId: number | string) => {
    try {
      // Optimistically remove from list (normalize id types for comparison)
      const idStr = String(propertyId);
      setProperties(prev => prev.filter(prop => String(prop.id) !== idStr));

      // Call API to remove from favorites
      await buyerService.toggleFavorite(propertyId);

      // Show success message
      CustomAlert.alert('Removed', 'Property removed from favorites');
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      // Reload favorites on error to restore state
      loadFavorites(1, false);
      CustomAlert.alert('Error', 'Failed to remove from favorites. Please try again.');
    }
  };

  const handleShareProperty = async (property: Property) => {
    try {
      const shareMessage = `Check out this property: ${property.title}\nLocation: ${property.location}\nPrice: ${formatters.price(Number(property.price), property.status === 'rent')}\n\nVisit us: https://360coordinates.com`;

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

  const renderProperty = ({ item }: { item: Property }) => {
    const propertyType = item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy';
    const images: string[] | undefined = item.images?.length
      ? item.images.map((url: string) => fixImageUrl(url)).filter((u): u is string => Boolean(u))
      : undefined;
    return (
      <PropertyCard
        image={fixImageUrl(item.cover_image || item.images?.[0]) ?? undefined}
        images={images}
        name={item.title}
        location={item.location || item.city || 'Location not specified'}
        price={formatters.price(Number(item.price), propertyType === 'rent')}
        type={propertyType}
        isFavorite={true}
        onPress={() => {
          const targetScreen = item.project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails';
          const params = { propertyId: String(item.id) };
          (navigation as any).navigate(targetScreen, params);
        }}
        onFavoritePress={() => handleToggleFavorite(item.id)}
        onSharePress={() => handleShareProperty(item)}
        property={item}
        style={styles.propertyCardStyle}
      />
    );
  };

  if (loading && properties.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.centerContainer, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </View>
    );
  }

  if (properties.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.centerContainer, { flex: 1 }]}>
          <View style={styles.emptyIconWrap}>
            <TabIcon name="heart-outline" color={colors.textSecondary} size={64} />
          </View>
          <Text style={styles.emptyText}>
            {isGuest ? 'Login to view your favorites' : 'No favorites yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {isGuest
              ? 'Sign in to save properties and see them here'
              : 'Start exploring properties and add them to your favorites'}
          </Text>
          {isGuest ? (
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => (navigation as any).navigate('Auth', { screen: 'Login' })}>
              <Text style={styles.exploreButtonText}>Login</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Home')}>
              <Text style={styles.exploreButtonText}>Explore Properties</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item: Property) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && properties.length > 0 ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.footerLoader} />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.propertySeparator} />}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  listContent: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  propertyCardStyle: {
    width: '100%',
    marginHorizontal: 0,
  },
  propertySeparator: {
    height: spacing.md,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyIconWrap: {
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  exploreButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 16,
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

export default FavoritesScreen;

