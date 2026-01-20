import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuilderHeader from '../../components/BuilderHeader';
import {sellerService} from '../../services/seller.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Property {
  id: string | number;
  property_id?: string | number;
  title: string;
  property_title?: string;
  location: string;
  city?: string;
  address?: string;
  price: number | string;
  status: 'sale' | 'rent';
  cover_image?: string;
  image?: string;
  images?: string[];
  is_active?: number | boolean;
  views_count?: number;
  views?: number;
  inquiry_count?: number;
  inquiries?: number;
  project_type?: 'upcoming' | null;
}

const BuilderPropertiesScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProperties = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Builder uses same API endpoints as agent/seller
      const response: any = await sellerService.getProperties({
        page: 1,
        limit: 100, // Get all properties
      });
      
      console.log('[BuilderProperties] Response:', JSON.stringify(response, null, 2));
      
      // Handle different response structures
      let propertiesData: any[] = [];
      
      if (response) {
        if (Array.isArray(response)) {
          propertiesData = response;
        } else if (response.success) {
          if (response.data) {
            if (response.data.properties && Array.isArray(response.data.properties)) {
              propertiesData = response.data.properties;
            } else if (Array.isArray(response.data)) {
              propertiesData = response.data;
            } else if (typeof response.data === 'object') {
              const dataKeys = Object.keys(response.data);
              for (const key of dataKeys) {
                if (Array.isArray(response.data[key])) {
                  propertiesData = response.data[key];
                  break;
                }
              }
            }
          }
        } else {
          if (response.data && Array.isArray(response.data)) {
            propertiesData = response.data;
          } else if (Array.isArray(response)) {
            propertiesData = response;
          }
        }
      }
      
      console.log('[BuilderProperties] Total extracted properties:', propertiesData.length);
      
      if (propertiesData.length > 0) {
        const fixedProperties = propertiesData.map((prop: any, index: number) => {
          let isActive = prop.is_active;
          if (isActive === undefined || isActive === null) {
            if (prop.status === 'active' || prop.status === 1 || prop.status === '1') {
              isActive = 1;
            } else if (prop.status === 'inactive' || prop.status === 'sold' || prop.status === 0 || prop.status === '0') {
              isActive = 0;
            } else {
              isActive = 1;
            }
          }
          
          // Try multiple image fields - backend might store images in different formats
          const rawImage = prop.cover_image || prop.image || prop.images?.[0] || prop.property_image || 
                          (Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : null);
          const imageUrl = fixImageUrl(rawImage);
          const propId = prop.id || prop.property_id;
          
          // Log image processing for debugging
          if (propId) {
            console.log(`[BuilderProperties] Property ${propId} image processing:`, {
              rawImage: rawImage,
              fixedUrl: imageUrl,
              hasRawImage: !!rawImage,
              hasFixedUrl: !!imageUrl,
            });
          }
          
          return {
            ...prop,
            id: propId ? String(propId) : `prop-${index}-${Date.now()}`,
            property_id: prop.property_id || prop.id || propId,
            title: prop.title || prop.property_title || 'Untitled Project',
            location: prop.location || prop.city || prop.address || 'Location not specified',
            price: prop.price ? parseFloat(String(prop.price)) : 0,
            status: prop.status || 'sale',
            is_active: isActive,
            cover_image: imageUrl || undefined, // Use undefined instead of null for better React Native handling
            views_count: prop.views_count || prop.views || prop.view_count || 0,
            inquiry_count: prop.inquiry_count || prop.inquiries || prop.inquiry_count || 0,
            project_type: prop.project_type || null,
          };
        });
        
        console.log('[BuilderProperties] Loaded and fixed properties:', fixedProperties.length);
        setProperties(fixedProperties);
      } else {
        console.log('[BuilderProperties] No properties found in response data');
        setProperties([]);
      }
    } catch (error: any) {
      console.error('[BuilderProperties] Error loading properties:', error);
      let errorMessage = 'Failed to load properties. Please check your connection.';
      
      if (error?.message && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error?.error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
      
      if (showLoading) {
        CustomAlert.alert('Error Loading Properties', errorMessage);
      }
      setProperties([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  // Load properties on mount
  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProperties(false);
    }, [loadProperties])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProperties(false);
  };

  const getStatusColor = (status: string, isActive?: number | boolean) => {
    const active = isActive === 1 || isActive === true || status === 'active';
    if (active) {
      return colors.success;
    }
    return colors.textSecondary;
  };

  const getStatusText = (status: string, isActive?: number | boolean, projectType?: string | null) => {
    const active = isActive === 1 || isActive === true || status === 'active';
    if (projectType === 'upcoming') {
      return 'UPCOMING';
    }
    if (active) {
      return 'ACTIVE';
    }
    return 'INACTIVE';
  };

  const renderProperty = ({item}: {item: Property}) => {
    // Validate and fix image URL for Android - improved handling
    let imageUrl: string | null = null;
    if (item.cover_image) {
      const trimmed = String(item.cover_image).trim();
      if (trimmed && trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
        // Ensure URL is properly formatted for Android
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          imageUrl = trimmed;
        } else {
          // Re-fix the URL in case it wasn't properly fixed earlier
          const fixed = fixImageUrl(trimmed);
          if (fixed && (fixed.startsWith('http://') || fixed.startsWith('https://'))) {
            imageUrl = fixed;
          }
        }
      }
    }
    
    return (
      <TouchableOpacity
        style={styles.propertyCard}
        onPress={() => navigation.navigate('PropertyDetails', {propertyId: item.id})}>
        {imageUrl ? (
          <Image
            source={{uri: imageUrl}}
            style={styles.propertyImage}
            resizeMode="cover"
            onError={(error) => {
              console.error(`[BuilderProperties] Image load error for property ${item.id}:`, {
                uri: imageUrl,
                error: error.nativeEvent?.error || 'Unknown error',
              });
            }}
            onLoadStart={() => {
              console.log(`[BuilderProperties] Loading image for property ${item.id}:`, imageUrl);
            }}
            onLoadEnd={() => {
              console.log(`[BuilderProperties] Image loaded successfully for property ${item.id}`);
            }}
          />
        ) : (
          <View style={styles.propertyImagePlaceholder}>
            <Text style={styles.placeholderText}>🏗️</Text>
          </View>
        )}
      <View style={styles.propertyInfo}>
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: getStatusColor(item.status, item.is_active)},
            ]}>
            <Text style={styles.statusText}>
              {getStatusText(item.status, item.is_active, item.project_type)}
            </Text>
          </View>
        </View>
        <View style={styles.propertyLocationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.propertyLocation} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        <View style={styles.propertyStatsRow}>
          <View style={styles.propertyStatItem}>
            <Text style={styles.propertyStatIcon}>👁️</Text>
            <Text style={styles.propertyStatText}>{item.views_count || 0}</Text>
          </View>
          <View style={styles.propertyStatItem}>
            <Text style={styles.propertyStatIcon}>💬</Text>
            <Text style={styles.propertyStatText}>{item.inquiry_count || 0}</Text>
          </View>
        </View>
        <View style={styles.propertyFooter}>
          <Text style={styles.propertyPrice}>
            {formatters.price(
              typeof item.price === 'string' 
                ? (parseFloat(item.price) || 0) 
                : (typeof item.price === 'number' ? item.price : 0),
              item.status === 'rent'
            )}
          </Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('EditProperty', {propertyId: item.id} as never);
            }}>
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <BuilderHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BuilderHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyText}>No projects yet</Text>
            <Text style={styles.emptySubtext}>
              Your construction projects will appear here
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddProperty')}>
              <Text style={styles.addButtonText}>Add Your First Project</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      {/* Floating Action Button - Always visible when there are properties */}
      {properties.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddProperty')}
          activeOpacity={0.8}>
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabText}>New Project</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceSecondary,
  },
  propertyImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  propertyInfo: {
    padding: spacing.md,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  propertyTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 10,
  },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  propertyLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  propertyStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  propertyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  propertyStatIcon: {
    fontSize: 16,
  },
  propertyStatText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  propertyPrice: {
    ...typography.h3,
    color: colors.accent,
    fontWeight: '700',
    flex: 1,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  editButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: 24,
    color: colors.surface,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  fabText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default BuilderPropertiesScreen;
