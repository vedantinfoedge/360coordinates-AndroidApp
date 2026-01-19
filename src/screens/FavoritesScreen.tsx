import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import {CompositeNavigationProp, useFocusEffect} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {BuyerTabParamList} from '../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../theme';
import {favoriteService} from '../services/favorite.service';
import {buyerService} from '../services/buyer.service';
import {fixImageUrl} from '../utils/imageHelper';
import BuyerHeader from '../components/BuyerHeader';
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
  cover_image?: string;
  images?: string[];
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
          id: prop.id,
          title: prop.title || prop.property_title || 'Untitled Property',
          location: prop.location || prop.city || 'Location not specified',
          city: prop.city,
          price: prop.price || 0,
          cover_image: fixImageUrl(prop.cover_image || prop.images?.[0] || ''),
          images: prop.images || [],
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

  const renderProperty = ({item}: {item: Property}) => {
    const priceText = typeof item.price === 'number' 
      ? `₹${item.price.toLocaleString('en-IN')}` 
      : item.price;

    return (
      <TouchableOpacity
        style={styles.propertyCard}
        onPress={() => navigation.navigate('PropertyDetails', {propertyId: String(item.id)})}>
        <View style={styles.imageContainer}>
          {item.cover_image ? (
            <Image
              source={{uri: item.cover_image}}
              style={styles.propertyImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.propertyImagePlaceholder}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </View>
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.propertyLocation} numberOfLines={1}>
            {item.location || item.city || 'Location not specified'}
          </Text>
          <Text style={styles.propertyPrice}>{priceText}</Text>
        </View>
      </TouchableOpacity>
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

  if (properties.length === 0) {
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
          <Text style={styles.emptyText}>No favorites yet</Text>
          <Text style={styles.emptySubtext}>
            Start exploring properties and add them to your favorites
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
  listContent: {
    padding: spacing.md,
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 200,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  propertyImagePlaceholder: {
    height: 200,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  propertyInfo: {
    padding: spacing.md,
  },
  propertyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  propertyLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  propertyPrice: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
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

export default FavoritesScreen;

