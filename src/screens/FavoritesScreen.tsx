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
import {CompositeNavigationProp, useFocusEffect} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {BuyerTabParamList} from '../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../theme';
import {buyerService} from '../services/buyer.service';
import {fixImageUrl} from '../utils/imageHelper';
import {formatters} from '../utils/formatters';
import BuyerHeader from '../components/BuyerHeader';
import PropertyCard from '../components/PropertyCard';
import {useAuth} from '../context/AuthContext';

type FavoritesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Favorites'>,
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
}

const FavoritesScreen: React.FC<Props> = ({navigation}) => {
  const {logout, user, isAuthenticated} = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  // Reload favorites when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFavorites(1, false);
    }, [])
  );

  const loadFavorites = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }
      
      // Use buyer service endpoint (matches the toggle endpoint)
      const response = await buyerService.getFavorites({page: pageNum, limit: 20});
      
      if (response && response.success && response.data) {
        // Handle buyer service response format
        const propertiesList = response.data.properties || response.data.favorites || [];
        const formattedProperties = propertiesList.map((prop: any) => ({
          id: prop.id || prop.property_id,
          title: prop.title || prop.property_title || 'Untitled Property',
          location: prop.location || prop.city || 'Location not specified',
          city: prop.city,
          price: prop.price || 0,
          status: prop.status || (prop.listing_type === 'rent' ? 'rent' : prop.listing_type === 'pg-hostel' ? 'pg' : 'sale'),
          cover_image: fixImageUrl(prop.cover_image || prop.images?.[0] || ''),
          images: prop.images || [],
          property_type: prop.property_type,
          is_favorite: true, // All items in favorites are favorited
        }));

        if (append) {
          setProperties(prev => [...prev, ...formattedProperties]);
        } else {
          setProperties(formattedProperties);
        }

        // Check if there are more pages
        const pagination = response.data.pagination;
        if (pagination) {
          setHasMore(pagination.current_page < pagination.total_pages);
        } else {
          setHasMore(formattedProperties.length === 20);
        }
      } else {
        if (!append) {
          setProperties([]);
        }
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      if (!append) {
        Alert.alert('Error', error.message || 'Failed to load favorites');
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
      // Optimistically remove from list
      setProperties(prev => prev.filter(prop => prop.id !== propertyId));
      
      // Call API to remove from favorites
      await buyerService.toggleFavorite(propertyId);
      
      // Show success message
      Alert.alert('Removed', 'Property removed from favorites');
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      // Reload favorites on error to restore state
      loadFavorites(1, false);
      Alert.alert('Error', 'Failed to remove from favorites. Please try again.');
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
        Alert.alert('Error', 'Failed to share property. Please try again.');
      }
    }
  };

  const renderProperty = ({item}: {item: Property}) => {
    const propertyType = item.status === 'rent' ? 'rent' : item.status === 'pg' ? 'pg-hostel' : 'buy';
    
    return (
      <PropertyCard
        image={fixImageUrl(item.cover_image || item.images?.[0])}
        name={item.title}
        location={item.location || item.city || 'Location not specified'}
        price={formatters.price(item.price, propertyType === 'rent')}
        type={propertyType}
        isFavorite={true}
        onPress={() => navigation.navigate('PropertyDetails', {propertyId: String(item.id)})}
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
        <View style={[styles.centerContainer, {flex: 1}]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </View>
    );
  }

  if (properties.length === 0 && !loading) {
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
        <View style={[styles.centerContainer, {flex: 1}]}>
          <Text style={styles.emptyIcon}>❤️</Text>
          <Text style={styles.emptyText}>No favorites yet</Text>
          <Text style={styles.emptySubtext}>
            Start exploring properties and add them to your favorites
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}>
            <Text style={styles.exploreButtonText}>Explore Properties</Text>
          </TouchableOpacity>
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
      {/* Header with count */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Favorites</Text>
        {properties.length > 0 && (
          <Text style={styles.headerSubtitle}>
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </Text>
        )}
      </View>
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
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    padding: spacing.md,
  },
  propertyCardStyle: {
    width: '100%',
    marginRight: 0,
  },
  propertySeparator: {
    height: spacing.md,
  },
  emptyIcon: {
    fontSize: 64,
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

