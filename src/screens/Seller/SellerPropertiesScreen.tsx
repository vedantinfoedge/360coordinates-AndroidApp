import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {sellerService} from '../../services/seller.service';
import {propertyService} from '../../services/property.service';
import {fixImageUrl} from '../../utils/imageHelper';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Property {
  id: string;
  title: string;
  location: string;
  price: string;
  status: 'active' | 'pending' | 'sold';
}

const SellerPropertiesScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyProperties = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Use seller service endpoint (correct endpoint for sellers)
      const response = await sellerService.getProperties({
        page: 1,
        limit: 100, // Get all properties
      });
      
      console.log('[SellerProperties] Response:', JSON.stringify(response, null, 2));
      
      // Handle different response structures
      let propertiesData: any[] = [];
      
      // Check if response exists (might be array or object)
      const responseData: any = response;
      if (responseData) {
        if (Array.isArray(responseData)) {
          // Structure 4: Response is directly an array
          propertiesData = responseData;
          console.log('[SellerProperties] Response is directly an array:', propertiesData.length);
        } else if (responseData.success) {
          if (responseData.data) {
            // Structure 1: {success: true, data: {properties: [...]}}
            if (responseData.data.properties && Array.isArray(responseData.data.properties)) {
              propertiesData = responseData.data.properties;
              console.log('[SellerProperties] Found properties in data.properties:', propertiesData.length);
            }
            // Structure 2: {success: true, data: [...]} (direct array)
            else if (Array.isArray(responseData.data)) {
              propertiesData = responseData.data;
              console.log('[SellerProperties] Found properties as direct array:', propertiesData.length);
            }
            // Structure 3: Check for any array field (list, items, results, etc.)
            else if (typeof responseData.data === 'object') {
              const dataKeys = Object.keys(responseData.data);
              console.log('[SellerProperties] Searching for array in data keys:', dataKeys);
              for (const key of dataKeys) {
                if (Array.isArray(responseData.data[key])) {
                  propertiesData = responseData.data[key];
                  console.log(`[SellerProperties] Found properties in data.${key}:`, propertiesData.length);
                  break;
                }
              }
            }
          }
        } else {
          // Response exists but no success field - might be direct data
          if (responseData.data && Array.isArray(responseData.data)) {
            propertiesData = responseData.data;
            console.log('[SellerProperties] Found properties in response.data (no success field):', propertiesData.length);
          } else if (Array.isArray(responseData)) {
            propertiesData = responseData;
            console.log('[SellerProperties] Response is array (no success field):', propertiesData.length);
          }
        }
        
        console.log('[SellerProperties] Total extracted properties:', propertiesData.length);
        
        // Only process if we have properties
        if (propertiesData.length > 0) {
          // Fix image URLs and ensure all required fields are present
          const fixedProperties = propertiesData.map((prop: any, index: number) => {
          // Determine status/active state
          let isActive = prop.is_active;
          if (isActive === undefined || isActive === null) {
            // Try to infer from status field
            if (prop.status === 'active' || prop.status === 1 || prop.status === '1') {
              isActive = 1;
            } else if (prop.status === 'inactive' || prop.status === 'sold' || prop.status === 0 || prop.status === '0') {
              isActive = 0;
            } else {
              // Default to active if not specified
              isActive = 1;
            }
          }
          
          // Try multiple image fields - backend might store images in different formats
          const rawImage = prop.cover_image || prop.image || prop.images?.[0] || prop.property_image || 
                          (Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : null);
          const imageUrl = fixImageUrl(rawImage);
          const propId = prop.id || prop.property_id;
          
          console.log(`[SellerProperties] Property ${propId} image check:`, {
            cover_image: prop.cover_image,
            image: prop.image,
            images: prop.images,
            property_image: prop.property_image,
            fixedUrl: imageUrl,
          });
          
          return {
            ...prop, // Spread first to preserve all backend data
            id: propId ? String(propId) : `prop-${index}-${Date.now()}`, // Ensure valid ID
            property_id: prop.property_id || prop.id || propId,
            title: prop.title || prop.property_title || 'Untitled Property',
            location: prop.location || prop.city || prop.address || 'Location not specified',
            price: prop.price ? String(prop.price) : '0',
            status: prop.status || (isActive ? 'sale' : 'sold'), // status is sale/rent, not active/pending
            is_active: isActive,
            cover_image: imageUrl, // Override with fixed URL - must come after spread
            views_count: prop.views_count || prop.views || prop.view_count || 0,
            inquiry_count: prop.inquiry_count || prop.inquiries || prop.inquiry_count || 0,
            favorite_count: prop.favorite_count || prop.favorites || prop.favorite_count || 0,
          };
          });
          
          console.log('[SellerProperties] Loaded and fixed properties:', fixedProperties.length);
          setProperties(fixedProperties);
        } else {
          // No properties found in response
          console.log('[SellerProperties] No properties found in response data');
          if (showLoading && (!responseData || (responseData.success === false))) {
            const errorMsg = responseData?.message || responseData?.error?.message || 'No properties found. Start by adding your first property!';
            if (responseData?.success === false) {
              Alert.alert('Info', errorMsg);
            }
          }
          setProperties([]);
        }
      } else {
        // Response exists but structure doesn't match expected formats
        console.warn('[SellerProperties] Unexpected response structure:', responseData);
        const errorMsg = responseData?.message || responseData?.error?.message || 'Failed to load properties. Please try again.';
        if (showLoading && responseData?.success === false) {
          Alert.alert('Error Loading Properties', errorMsg);
        }
        setProperties([]);
      }
    } catch (error: any) {
      console.error('[SellerProperties] Exception loading properties:', error);
      console.error('[SellerProperties] Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        code: error?.code,
        data: error?.data,
        success: error?.success,
      });
      
      // Check if error has already been formatted by API interceptor
      let errorMessage = 'Failed to load properties. Please check your connection.';
      
      // Handle error from API interceptor (already parsed)
      if (error?.message && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error?.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          try {
            const parsed = JSON.parse(errorData);
            errorMessage = parsed.message || parsed.error || errorMessage;
          } catch {
            // Not JSON, use as is if reasonable
            if (errorData && errorData.length < 200) {
              errorMessage = errorData;
            }
          }
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Show detailed error for debugging
      console.error('[SellerProperties] Final error message:', errorMessage);
      
      if (showLoading) {
        Alert.alert(
          'Error Loading Properties', 
          errorMessage + '\n\nPlease try refreshing or contact support if the issue persists.',
          [
            {text: 'Retry', onPress: () => loadMyProperties(true)},
            {text: 'OK', style: 'cancel'}
          ]
        );
      }
      setProperties([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  // Load properties when screen is focused (e.g., returning from AddProperty)
  useFocusEffect(
    useCallback(() => {
      loadMyProperties();
    }, [loadMyProperties])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMyProperties(false);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'sold':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const handleEdit = (propertyId: string) => {
    // Navigate to edit property screen
    navigation.navigate('AddProperty' as never);
    // In real app, pass propertyId to edit screen
  };

  const handleDelete = async (propertyId: string | number) => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This action cannot be undone and the property will be removed from the database and website.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[SellerProperties] Attempting to delete property:', propertyId);
              
              // Optimistically remove from UI immediately for better UX
              const propertyIdStr = String(propertyId);
              setProperties(prev => prev.filter(p => String(p.id) !== propertyIdStr));
              
              // Call API to delete from database
              const response: any = await propertyService.deleteProperty(propertyIdStr);
              
              console.log('[SellerProperties] Delete API response:', response);
              
              // Check response format - backend might return success in different formats
              const isSuccess = response?.success === true || 
                               response?.status === 'success' ||
                               (response?.message && typeof response.message === 'string' && 
                                (response.message.toLowerCase().includes('success') ||
                                 response.message.toLowerCase().includes('deleted')));
              
              if (isSuccess || response?.data?.success) {
                console.log('[SellerProperties] Property deleted successfully from database');
                // Reload list to ensure sync with backend and refresh dashboard stats
                loadMyProperties(true);
                
                // Show success message (but don't double-alert if already shown)
                setTimeout(() => {
                  Alert.alert('Success', 'Property has been deleted from the database and will no longer appear on the app or website.');
                }, 100);
              } else {
                // If API failed, reload to restore the property
                console.warn('[SellerProperties] Delete may have failed, reloading properties');
                loadMyProperties(true);
                const errorMsg = response?.message || response?.error?.message || 'Failed to delete property. Please try again.';
                Alert.alert('Error', errorMsg);
              }
            } catch (error: any) {
              console.error('[SellerProperties] Delete error:', error);
              
              // Reload list to restore the property if delete failed
              loadMyProperties(true);
              
              // Show error message
              const errorMessage = error?.message || 
                                  error?.response?.data?.message ||
                                  error?.response?.message ||
                                  'Failed to delete property. Please check your connection and try again.';
              Alert.alert('Delete Failed', errorMessage);
            }
          },
        },
      ],
    );
  };

  const handleViewDetails = (propertyId: string) => {
    navigation.navigate('PropertyDetails', {propertyId});
  };

  const renderProperty = ({item}: {item: any}) => {
    // Safety check for item
    if (!item || !item.id) {
      console.warn('[SellerProperties] Invalid item in renderProperty:', item);
      return null;
    }
    
    // Image URL is already fixed when loading properties (line 132), so use directly
    // If it's a relative path that wasn't fixed, fix it now
    const imageUrl = item.cover_image 
      ? (item.cover_image.startsWith('http') ? item.cover_image : fixImageUrl(item.cover_image))
      : null;
    const isActive = item.is_active === 1 || item.is_active === true;
    const statusColor = isActive ? getStatusColor('active') : getStatusColor('sold');
    
    return (
      <View style={styles.propertyCard}>
        <TouchableOpacity
          style={styles.propertyContent}
          onPress={() => handleViewDetails(item.id)}>
          {imageUrl ? (
            <Image 
              source={{uri: imageUrl}} 
              style={styles.propertyImage}
              resizeMode="cover"
              onError={(error) => {
                console.warn('[SellerProperties] Failed to load image:', imageUrl, error.nativeEvent.error);
              }}
            />
          ) : (
            <View style={styles.propertyImagePlaceholder}>
              <Text style={styles.placeholderText}>🏠</Text>
              <Text style={styles.placeholderSubtext}>No Image</Text>
            </View>
          )}
        <View style={styles.propertyInfo}>
          <View style={styles.propertyHeader}>
            <Text style={styles.propertyTitle} numberOfLines={2}>
              {item.title || 'Untitled Property'}
            </Text>
            <View style={[styles.statusBadge, {backgroundColor: statusColor}]}>
              <Text style={styles.statusText}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
          <Text style={styles.propertyLocation} numberOfLines={1}>
            {item.location || 'Location not specified'}
          </Text>
          <Text style={styles.propertyPrice}>
            {(item.status === 'rent' || item.status === 'Rent')
              ? `₹${parseFloat(item.price || '0').toLocaleString('en-IN')}/month`
              : `₹${parseFloat(item.price || '0').toLocaleString('en-IN')}`}
          </Text>
          <View style={styles.propertyStats}>
            <Text style={styles.statText}>👁️ {item.views_count || item.views || 0}</Text>
            <Text style={styles.statText}>💬 {item.inquiry_count || item.inquiries || 0}</Text>
            <Text style={styles.statText}>❤️ {item.favorite_count || item.favorites || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item.id)}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewDetails(item.id)}>
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}>
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Properties</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProperty' as never)}>
          <Text style={styles.addButtonText}>+ Add Property</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : properties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyText}>No properties listed</Text>
          <Text style={styles.emptySubtext}>
            Add your first property to get started
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => navigation.navigate('AddProperty' as never)}>
            <Text style={styles.emptyAddButtonText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={properties}
          renderItem={renderProperty}
          keyExtractor={(item, index) => String(item.id || item.property_id || index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  propertyImagePlaceholder: {
    width: SCREEN_WIDTH > 600 ? 120 : '100%',
    height: SCREEN_WIDTH > 600 ? 200 : 180,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    opacity: 0.5,
    marginBottom: spacing.xs,
  },
  placeholderSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    opacity: 0.7,
  },
  propertyInfo: {
    padding: spacing.md,
    flex: 1, // Take remaining space
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  propertyTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyAddButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 16,
  },
  propertyContent: {
    flexDirection: SCREEN_WIDTH > 600 ? 'row' : 'column', // Responsive layout
  },
  actionButtons: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: colors.surfaceSecondary || colors.border + '20',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap', // Allow wrapping on small screens
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: SCREEN_WIDTH > 600 ? 1 : 0,
    minWidth: SCREEN_WIDTH > 600 ? undefined : (SCREEN_WIDTH - spacing.md * 2 - spacing.xs * 4) / 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs / 2,
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.info,
  },
  viewButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: colors.surface,
  },
  propertyImage: {
    width: SCREEN_WIDTH > 600 ? 120 : '100%', // Full width on small screens, fixed on large
    height: SCREEN_WIDTH > 600 ? 200 : 180, // Responsive height
    resizeMode: 'cover',
  },
  propertyStats: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default SellerPropertiesScreen;

