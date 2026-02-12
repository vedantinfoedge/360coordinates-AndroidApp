import React, {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {verticalScale} from '../../utils/responsive';
import {useAuth} from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import {sellerService} from '../../services/seller.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters, capitalize} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type StatusFilter = 'all' | 'sale' | 'rent';
type SortOption = 'newest' | 'oldest' | 'price-high' | 'price-low';

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
  created_at?: string;
  created_date?: string;
  date_created?: string;
}

const HEADER_HEIGHT = verticalScale(64);

const AgentPropertiesScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const insets = useSafeAreaInsets();
  const [properties, setProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Check if property can be edited (within 24 hours)
  // Uses MySQL DATETIME format parser: "YYYY-MM-DD HH:MM:SS"
  const canEditProperty = (property: any): boolean => {
    const createdAt = property.created_at || property.created_date || property.date_created;
    if (!createdAt) return true; // Allow if no date available
    
    // Parse MySQL DATETIME format: "YYYY-MM-DD HH:MM:SS"
    const createdDate = formatters.parseMySQLDateTime(String(createdAt));
    if (!createdDate) return true; // Allow if parsing fails
    
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours < 24;
  };

  const handleEdit = async (propertyId: string | number) => {
    const property = properties.find(p => String(p.id) === String(propertyId));
    
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
    (navigation.getParent() as any)?.navigate('AddProperty', {
      propertyId: String(propertyId),
      isLimitedEdit: limitedEdit,
      createdAt: property.created_at || property.created_date || property.date_created,
    });
  };

  const loadProperties = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Agent uses same API endpoints as seller
      const response: any = await sellerService.getProperties({
        page: 1,
        limit: 100, // Get all properties
      });
      
      console.log('[AgentProperties] Response:', JSON.stringify(response, null, 2));
      
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
      
      console.log('[AgentProperties] Total extracted properties:', propertiesData.length);
      
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
            console.log(`[AgentProperties] Property ${propId} image processing:`, {
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
            title: prop.title || prop.property_title || 'Untitled Property',
            location: prop.location || prop.city || prop.address || 'Location not specified',
            price: prop.price ? parseFloat(String(prop.price)) : 0,
            status: prop.status || 'sale',
            is_active: isActive,
            cover_image: imageUrl || undefined, // Use undefined instead of null for better React Native handling
            views_count: prop.views_count || prop.views || prop.view_count || 0,
            inquiry_count: prop.inquiry_count || prop.inquiries || prop.inquiry_count || 0,
            created_at: prop.created_at || prop.created_date || prop.date_created,
            project_type: prop.project_type || null,
          };
        });
        
        console.log('[AgentProperties] Loaded and fixed properties:', fixedProperties.length);
        setAllProperties(fixedProperties);
        setProperties(fixedProperties);
      } else {
        console.log('[AgentProperties] No properties found in response data');
        setAllProperties([]);
        setProperties([]);
      }
    } catch (error: any) {
      console.error('[AgentProperties] Error loading properties:', error);
      let errorMessage = 'Failed to load properties. Please check your connection.';
      
      if (error?.message && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error?.error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
      
      if (showLoading) {
        CustomAlert.alert('Error Loading Properties', errorMessage);
      }
      setAllProperties([]);
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

  const handleDelete = (propertyId: string | number) => {
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
                loadProperties(false);
                setTimeout(() => {
                  CustomAlert.alert('Success', 'Property has been deleted and will no longer appear on the app or website.');
                }, 100);
              } else {
                loadProperties(true);
                const errorMsg = response?.message || response?.error?.message || 'Failed to delete property. Please try again.';
                CustomAlert.alert('Error', errorMsg);
              }
            } catch (error: any) {
              loadProperties(true);
              const errorMessage =
                error?.message ||
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

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = [...allProperties];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prop =>
        (prop.title || '').toLowerCase().includes(query) ||
        (prop.location || '').toLowerCase().includes(query)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(prop => prop.status === statusFilter);
    }
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
          return parseFloat(String(b.price || '0')) - parseFloat(String(a.price || '0'));
        case 'price-low':
          return parseFloat(String(a.price || '0')) - parseFloat(String(b.price || '0'));
        default:
          return 0;
      }
    });
    return filtered;
  }, [allProperties, searchQuery, statusFilter, sortBy]);

  const handleAddProperty = () => {
    navigation.getParent()?.navigate('AddProperty' as never);
  };

  const handleAddProject = () => {
    navigation.getParent()?.navigate('AddProject' as never);
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
        onPress={() => navigation.getParent()?.navigate((item.project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails') as never, {propertyId: item.id} as never)}>
        {imageUrl ? (
          <Image
            source={{uri: imageUrl}}
            style={styles.propertyImage}
            resizeMode="cover"
            onError={(error) => {
              console.error(`[AgentProperties] Image load error for property ${item.id}:`, {
                uri: imageUrl,
                error: error.nativeEvent?.error || 'Unknown error',
              });
            }}
            onLoadStart={() => {
              console.log(`[AgentProperties] Loading image for property ${item.id}:`, imageUrl);
            }}
            onLoadEnd={() => {
              console.log(`[AgentProperties] Image loaded successfully for property ${item.id}`);
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
          <View style={styles.propertyActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEdit(item.id);
              }}>
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(item.id);
              }}>
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.loadingContainer, {paddingTop: insets.top + spacing.lg}]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, {marginTop: insets.top + spacing.md}]}>
        <Text style={styles.headerTitle}>All Listings</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addButtonOutline} onPress={handleAddProperty}>
            <Text style={styles.addButtonOutlineText}>+ Property</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButtonOutline} onPress={handleAddProject}>
            <Text style={styles.addButtonOutlineText}>+ Project</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <View style={styles.searchIconContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties or projects..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)} activeOpacity={0.7}>
          <Text style={styles.filterButtonIcon}>⚙</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
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
                    style={[styles.filterOption, statusFilter === status && styles.filterOptionActive]}
                    onPress={() => setStatusFilter(status)}
                    activeOpacity={0.7}>
                    <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionTextActive]}>
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
                  style={[styles.sortOption, sortBy === option && styles.sortOptionActive]}
                  onPress={() => setSortBy(option)}
                  activeOpacity={0.7}>
                  <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionTextActive]}>
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
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {loading ? (
        <View style={[styles.loadingContainer, {paddingTop: insets.top + HEADER_HEIGHT}]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : allProperties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyText}>No Listings Yet</Text>
          <Text style={styles.emptySubtext}>Start by adding your first property or project</Text>
          <View style={styles.emptyButtonsRow}>
            <TouchableOpacity style={styles.addButtonOutline} onPress={handleAddProperty} activeOpacity={0.8}>
              <Text style={styles.addButtonOutlineText}>+ Add Property</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButtonOutline} onPress={handleAddProject} activeOpacity={0.8}>
              <Text style={styles.addButtonOutlineText}>+ Add Project</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : filteredAndSortedProperties.length === 0 && searchQuery ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>No Listings Found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search terms or filters</Text>
        </View>
      ) : (
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={[styles.listContent, {paddingTop: spacing.md}]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}>
          {(() => {
            const listingData = filteredAndSortedProperties;
            const projects = listingData.filter(p => p.project_type === 'upcoming');
            const propertiesOnly = listingData.filter(p => p.project_type !== 'upcoming');

            const renderSection = (title: string, icon: string, data: Property[]) => {
              return (
                <View style={styles.sectionWrap} key={title}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionTitleLeft}>
                      <Text style={styles.sectionIcon}>{icon}</Text>
                      <Text style={styles.sectionTitleText}>{title}</Text>
                      <View style={styles.sectionCountBadge}>
                        <Text style={styles.sectionCountText}>{data.length}</Text>
                      </View>
                    </View>
                  </View>
                  {data.length === 0 ? (
                    <View style={styles.sectionEmpty}>
                      <Text style={styles.sectionEmptyText}>No {title.toLowerCase()} found</Text>
                    </View>
                  ) : (
                    data.map(item => (
                      <View key={String(item.id)}>{renderProperty({item})}</View>
                    ))
                  )}
                </View>
              );
            };

            return (
              <>
                {renderSection('Properties', '🏠', propertiesOnly)}
                {renderSection('Projects', '🏗️', projects)}
              </>
            );
          })()}
        </ScrollView>
      )}
      {/* FAB - Always visible when there are listings */}
      {allProperties.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.getParent()?.navigate('AddProperty' as never)}
          activeOpacity={0.8}>
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabText}>New Property</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    color: '#1D242B',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  searchIcon: {fontSize: 16},
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
    backgroundColor: '#E3F6FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonIcon: {fontSize: 18, color: colors.primary},
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
  modalTitle: {fontSize: 20, color: '#1D242B', fontWeight: '700'},
  modalClose: {fontSize: 24, color: '#9CA3AF', fontWeight: '500'},
  filterSection: {marginBottom: spacing.xl},
  filterLabel: {fontSize: 15, color: '#1D242B', fontWeight: '600', marginBottom: spacing.md},
  filterDivider: {height: 1, backgroundColor: '#F3F4F6', marginVertical: spacing.lg},
  filterOptions: {flexDirection: 'row', gap: 10, flexWrap: 'wrap'},
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
  filterOptionActive: {backgroundColor: colors.primary},
  filterOptionText: {...typography.body, color: '#374151', fontSize: 14, fontWeight: '500'},
  filterOptionTextActive: {color: colors.surface, fontWeight: '600'},
  filterOptionCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterOptionCheckText: {color: colors.surface, fontSize: 11, fontWeight: '700'},
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
  sortOptionActive: {backgroundColor: '#E3F6FF', borderWidth: 2, borderColor: colors.primary},
  sortOptionText: {...typography.body, color: '#374151', fontSize: 14, fontWeight: '500', flex: 1},
  sortOptionTextActive: {color: colors.primary, fontWeight: '600'},
  sortOptionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  checkmark: {color: colors.surface, fontSize: 12, fontWeight: '700'},
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  applyButtonText: {...typography.body, color: colors.surface, fontWeight: '600', fontSize: 15},
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
  propertyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  editButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  deleteButtonText: {
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
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  addButtonOutline: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonOutlineText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D242B',
  },
  sectionCountBadge: {
    backgroundColor: '#E3F6FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sectionCountText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  sectionEmpty: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  sectionEmptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.cta,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: 24,
    color: colors.accentLight,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  fabText: {
    ...typography.body,
    color: colors.accentLight,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AgentPropertiesScreen;
