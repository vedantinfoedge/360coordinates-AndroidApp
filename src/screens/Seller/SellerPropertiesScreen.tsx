import React, {useState, useCallback, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import CustomAlert from '../../utils/alertHelper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {sellerService, DashboardStats} from '../../services/seller.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters, capitalize} from '../../utils/formatters';

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
  created_at?: string;
}

type StatusFilter = 'all' | 'sale' | 'rent';
type SortOption = 'newest' | 'oldest' | 'price-high' | 'price-low';

const SellerPropertiesScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // Scroll animation for header hide/show
  const scrollY = useRef(new Animated.Value(0)).current;

  // Check property limit before adding
  // According to backend: Sellers have limits based on subscription (free=3, basic=10, pro=10, premium=10)
  // Agents have unlimited properties
  const checkPropertyLimit = async (): Promise<boolean> => {
    try {
      // Agents have unlimited properties - skip check
      if (user?.user_type === 'agent') {
        return true;
      }

      const statsResponse: any = await sellerService.getDashboardStats();
      if (statsResponse && statsResponse.success && statsResponse.data) {
        const stats = statsResponse.data;
        const currentCount = stats.total_properties || 0;
        
        // Get subscription plan type (defaults to 'free' if no subscription)
        const planType = stats.subscription?.plan_type || 'free';
        
        // Property limits based on subscription plan
        const limits: {[key: string]: number} = {
          'free': 3,
          'basic': 10,
          'pro': 10,
          'premium': 10,
        };
        
        const limit = limits[planType] || limits['free'];
        
        if (limit > 0 && currentCount >= limit) {
          CustomAlert.alert(
            'Property Limit Reached',
            `Property limit reached. You can list up to ${limit} properties in your current plan.`,
            [{text: 'OK'}]
          );
          return false;
        }
      } else {
        // If API fails, check current properties count with default free plan limit
        const defaultLimit = 3;
        if (allProperties.length >= defaultLimit) {
          CustomAlert.alert(
            'Property Limit Reached',
            `You have reached the maximum limit of ${defaultLimit} properties. You cannot add more properties.`,
            [{text: 'OK'}]
          );
          return false;
        }
      }
      return true;
    } catch (error: any) {
      // If dashboard stats endpoint doesn't exist (404), use local count as fallback
      if (error?.status === 404 || error?.response?.status === 404) {
        // Endpoint doesn't exist, use local properties count with default free plan limit
        const defaultLimit = 3;
        if (allProperties.length >= defaultLimit) {
          CustomAlert.alert(
            'Property Limit Reached',
            `You have reached the maximum limit of ${defaultLimit} properties. You cannot add more properties.`,
            [{text: 'OK'}]
          );
          return false;
        }
        return true; // Allow if count is below limit
      }
      console.error('Error checking property limit:', error);
      // If check fails for other reasons, use local count as fallback with default free plan limit
      const defaultLimit = 3;
      if (allProperties.length >= defaultLimit) {
        CustomAlert.alert(
          'Property Limit Reached',
          `You have reached the maximum limit of ${defaultLimit} properties. You cannot add more properties.`,
          [{text: 'OK'}]
        );
        return false;
      }
      return true; // Allow if check fails and count is below limit
    }
  };

  // Check if property can be edited (within 24 hours)
  const canEditProperty = (property: any): boolean => {
    const createdAt = property.created_at || property.created_date || property.date_created;
    if (!createdAt) return true; // Allow if no date available
    
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours < 24;
  };

  const loadMyProperties = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Load dashboard stats for property limit check
      try {
        const statsResponse: any = await sellerService.getDashboardStats();
        if (statsResponse && statsResponse.success && statsResponse.data) {
          setDashboardStats(statsResponse.data);
        }
      } catch (error: any) {
        // If dashboard stats endpoint doesn't exist (404), silently continue
        // We'll use local properties count as fallback
        if (error?.status !== 404 && error?.response?.status !== 404) {
          console.warn('Error loading dashboard stats:', error);
        }
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
          setAllProperties(fixedProperties);
          setProperties(fixedProperties);
        } else {
          // No properties found in response
          console.log('[SellerProperties] No properties found in response data');
          if (showLoading && (!responseData || (responseData.success === false))) {
            const errorMsg = responseData?.message || responseData?.error?.message || 'No properties found. Start by adding your first property!';
            if (responseData?.success === false) {
              CustomAlert.alert('Info', errorMsg);
            }
          }
          setProperties([]);
        }
      } else {
        // Response exists but structure doesn't match expected formats
        console.warn('[SellerProperties] Unexpected response structure:', responseData);
        const errorMsg = responseData?.message || responseData?.error?.message || 'Failed to load properties. Please try again.';
        if (showLoading && responseData?.success === false) {
          CustomAlert.alert('Error Loading Properties', errorMsg);
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
        CustomAlert.alert(
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

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = [...allProperties];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prop => 
        (prop.title || '').toLowerCase().includes(query) ||
        (prop.location || '').toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(prop => prop.status === statusFilter);
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const aDate = new Date(a.created_at || a.created_date || 0).getTime();
          const bDate = new Date(b.created_at || b.created_date || 0).getTime();
          return bDate - aDate;
        case 'oldest':
          const aDateOld = new Date(a.created_at || a.created_date || 0).getTime();
          const bDateOld = new Date(b.created_at || b.created_date || 0).getTime();
          return aDateOld - bDateOld;
        case 'price-high':
          return parseFloat(b.price || '0') - parseFloat(a.price || '0');
        case 'price-low':
          return parseFloat(a.price || '0') - parseFloat(b.price || '0');
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [allProperties, searchQuery, statusFilter, sortBy]);

  const handleEdit = async (propertyId: string | number) => {
    const property = allProperties.find(p => String(p.id) === String(propertyId));
    
    if (!property) {
      CustomAlert.alert('Error', 'Property not found');
      return;
    }
    
    const limitedEdit = !canEditProperty(property);
    
    if (limitedEdit) {
      CustomAlert.alert(
        'Limited Edit Mode',
        'This property was created more than 24 hours ago.\n\nOnly the Title and Pricing fields (price, negotiable, deposit, maintenance) can be edited. Other details are locked.',
        [{text: 'OK'}],
      );
    }
    
    // Navigate to AddProperty screen with edit params
    (navigation as any).navigate('AddProperty', {
      propertyId: String(propertyId),
      isLimitedEdit: limitedEdit,
      createdAt: property.created_at || property.created_date || property.date_created,
    });
  };

  const handleAddProperty = async () => {
    const canAdd = await checkPropertyLimit();
    if (canAdd) {
      navigation.navigate('AddProperty' as never);
    }
  };

  const handleDelete = async (propertyId: string | number) => {
    CustomAlert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This action cannot be undone and the property will be removed from the database and website.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const propertyIdStr = String(propertyId);
              setProperties(prev => prev.filter(p => String(p.id) !== propertyIdStr));

              const response: any = await sellerService.deleteProperty(propertyIdStr);

              const isSuccess =
                response?.success === true ||
                response?.status === 'success' ||
                (response?.message &&
                  typeof response.message === 'string' &&
                  (response.message.toLowerCase().includes('success') ||
                    response.message.toLowerCase().includes('deleted')));

              if (isSuccess || response?.data?.success) {
                loadMyProperties(false);
                setTimeout(() => {
                  CustomAlert.alert('Success', 'Property has been deleted from the database and will no longer appear on the app or website.');
                }, 100);
              } else {
                loadMyProperties(true);
                const errorMsg = response?.message || response?.error?.message || 'Failed to delete property. Please try again.';
                CustomAlert.alert('Error', errorMsg);
              }
            } catch (error: any) {
              loadMyProperties(true);
              
              // Show error message
              const errorMessage = error?.message || 
                                  error?.response?.data?.message ||
                                  error?.response?.message ||
                                  'Failed to delete property. Please check your connection and try again.';
              CustomAlert.alert('Delete Failed', errorMessage);
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
      <TouchableOpacity
        style={styles.propertyCard}
        onPress={() => navigation.navigate('PropertyDetails', {propertyId: item.id})}>
        {imageUrl ? (
          <Image
            source={{uri: imageUrl}}
            style={styles.propertyImage}
            resizeMode="cover"
            onError={(error: any) => {
              console.error(`[SellerProperties] Image load error for property ${item.id}:`, {
                uri: imageUrl,
                error: error.nativeEvent?.error || 'Unknown error',
              });
            }}
            onLoadStart={() => {
              console.log(`[SellerProperties] Loading image for property ${item.id}:`, imageUrl);
            }}
            onLoadEnd={() => {
              console.log(`[SellerProperties] Image loaded successfully for property ${item.id}`);
            }}
          />
        ) : (
          <View style={styles.propertyImagePlaceholder}>
            <Text style={styles.placeholderText}>🏠</Text>
          </View>
        )}
      <View style={styles.propertyInfo}>
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyTitle} numberOfLines={2}>
            {capitalize(item.title || 'Untitled Property')}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: statusColor},
            ]}>
            <Text style={styles.statusText}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>
        <View style={styles.propertyLocationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.propertyLocation} numberOfLines={1}>
            {item.location || 'Location not specified'}
          </Text>
        </View>
        <View style={styles.propertyStatsRow}>
          <View style={styles.propertyStatItem}>
            <Text style={styles.propertyStatIcon}>👁️</Text>
            <Text style={styles.propertyStatText}>{item.views_count || item.views || 0}</Text>
          </View>
          <View style={styles.propertyStatItem}>
            <Text style={styles.propertyStatIcon}>💬</Text>
            <Text style={styles.propertyStatText}>{item.inquiry_count || item.inquiries || 0}</Text>
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
          <View style={styles.propertyActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={(e: any) => {
                e.stopPropagation();
                handleEdit(item.id);
              }}
              activeOpacity={0.7}>
              <Text style={styles.editButtonIcon}>✏</Text>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e: any) => {
                e.stopPropagation();
                handleDelete(item.id);
              }}
              activeOpacity={0.7}>
              <Text style={styles.deleteButtonIcon}>🗑</Text>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onSubscriptionPress={() => navigation.navigate('Subscription')}
        onLogoutPress={logout}
        scrollY={scrollY}
      />
      <View style={[styles.header, {marginTop: spacing.xxl}]}>
        <Text style={styles.headerTitle}>My Properties</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.viewPlansButton, {marginRight: spacing.sm}]}
            onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.viewPlansButtonText}>View Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddProperty}>
            <Text style={styles.addButtonText}>+ Add Property</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search and Filter Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <View style={styles.searchIconContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}>
          <Text style={styles.filterButtonIcon}>⚙</Text>
        </TouchableOpacity>
      </View>
      
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {(['all', 'sale', 'rent'] as StatusFilter[]).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      statusFilter === status && styles.filterOptionActive,
                    ]}
                    onPress={() => setStatusFilter(status)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        statusFilter === status && styles.filterOptionTextActive,
                      ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                    {statusFilter === status && (
                      <View style={styles.filterOptionCheck}>
                        <Text style={styles.filterOptionCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterDivider} />
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              {(['newest', 'oldest', 'price-high', 'price-low'] as SortOption[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortOption,
                    sortBy === option && styles.sortOptionActive,
                  ]}
                  onPress={() => setSortBy(option)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option && styles.sortOptionTextActive,
                    ]}>
                    {option === 'newest' && 'Newest First'}
                    {option === 'oldest' && 'Oldest First'}
                    {option === 'price-high' && 'Price: High to Low'}
                    {option === 'price-low' && 'Price: Low to High'}
                  </Text>
                  {sortBy === option && (
                    <View style={styles.sortOptionCheck}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : properties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>🏠</Text>
          </View>
          <Text style={styles.emptyTitle}>No Properties Listed</Text>
          <Text style={styles.emptySubtext}>
            Start by adding your first property to showcase it to potential buyers
          </Text>
          <Text style={styles.emptyTip}>
            💡 Tip: Add clear photos and detailed descriptions to attract more inquiries
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={handleAddProperty}
            activeOpacity={0.8}>
            <Text style={styles.emptyAddButtonText}>+ Add Your First Property</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {filteredAndSortedProperties.length === 0 && searchQuery ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
              </View>
              <Text style={styles.emptyTitle}>No Properties Found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search terms or filters to find what you're looking for
              </Text>
            </View>
          ) : (
            <Animated.FlatList
              data={filteredAndSortedProperties}
              renderItem={renderProperty}
              keyExtractor={(item: any, index: number) => String(item.id || item.property_id || index)}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{nativeEvent: {contentOffset: {y: scrollY}}}],
                {useNativeDriver: true}
              )}
              scrollEventThrottle={16}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Clean off-white
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  propertyImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 44,
    opacity: 0.4,
    marginBottom: spacing.xs,
  },
  placeholderSubtext: {
    ...typography.caption,
    color: '#9CA3AF',
    fontSize: 12,
    opacity: 0.8,
  },
  propertyInfo: {
    padding: spacing.lg,
    flex: 1,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  propertyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D242B', // Dark Charcoal
    flex: 1,
    marginRight: spacing.sm,
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    color: colors.surface,
    fontWeight: '600',
  },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationIcon: {
    fontSize: 13,
    marginRight: spacing.xs,
  },
  propertyLocation: {
    ...typography.caption,
    color: '#6B7280',
    flex: 1,
    fontSize: 13,
  },
  propertyStatsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  propertyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  propertyStatIcon: {
    fontSize: 14,
  },
  propertyStatText: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 12,
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  propertyPrice: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  propertyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D242B', // Dark Charcoal
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewPlansButton: {
    backgroundColor: '#E3F6FF', // Light blue
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPlansButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#E3F6FF', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
    lineHeight: 28,
  },
  emptySubtext: {
    ...typography.body,
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyTip: {
    ...typography.caption,
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 13,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  emptyAddButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginTop: spacing.sm,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 50,
  },
  emptyAddButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 15,
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
    borderRadius: 8,
    marginHorizontal: spacing.xs / 2,
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    minHeight: 40,
    gap: spacing.xs,
  },
  editButtonIcon: {
    fontSize: 14,
  },
  editButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2', // Light red tint
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    minHeight: 40,
    gap: spacing.xs,
  },
  deleteButtonIcon: {
    fontSize: 14,
  },
  deleteButtonText: {
    ...typography.body,
    color: '#DC2626', // Red text
    fontWeight: '600',
    fontSize: 13,
  },
  propertyImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: '#6B7280',
    marginTop: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: spacing.sm,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchIconContainer: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
    fontSize: 14,
    height: 46,
  },
  filterButton: {
    width: 46,
    height: 46,
    backgroundColor: '#E3F6FF', // Light blue
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonIcon: {
    fontSize: 18,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterLabel: {
    fontSize: 15,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  filterDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.lg,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    gap: spacing.xs,
    minHeight: 42,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
  },
  filterOptionText: {
    ...typography.body,
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  filterOptionCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterOptionCheckText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: spacing.sm,
    minHeight: 50,
  },
  sortOptionActive: {
    backgroundColor: '#E3F6FF', // Light blue
    borderWidth: 2,
    borderColor: colors.primary,
  },
  sortOptionText: {
    ...typography.body,
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sortOptionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  applyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 15,
  },
  actionButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#9CA3AF',
  },
});

export default SellerPropertiesScreen;

