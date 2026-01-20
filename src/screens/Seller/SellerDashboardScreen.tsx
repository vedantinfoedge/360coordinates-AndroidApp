import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  ImageBackground,
  Animated,
  Dimensions,
} from 'react-native';
import {CompositeNavigationProp, useFocusEffect} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {sellerService, DashboardStats} from '../../services/seller.service';
import CustomAlert from '../../utils/alertHelper';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type SellerDashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<SellerTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SellerDashboardScreenNavigationProp;
};

interface RecentProperty {
  id: number | string;
  title: string;
  location: string;
  price: number;
  status: 'sale' | 'rent';
  cover_image?: string;
  views: number;
  inquiries: number;
}

interface RecentInquiry {
  id: number;
  property_id: number;
  property_title: string;
  buyer_id: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_profile_image?: string;
  message: string;
  status: string;
  created_at: string;
}

const SellerDashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Check user type access
  useEffect(() => {
    if (user && user.user_type === 'agent') {
      CustomAlert.alert(
        'Access Denied',
        'You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{name: 'Agent' as never}],
              });
            },
          },
        ],
        {cancelable: false}
      );
      return;
    }
  }, [user, navigation]);

  const loadDashboardData = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Try to get stats first - if successful, we only need 3 properties for display
      let apiStats: DashboardStats | null = null;
      let statsSuccess = false;
      
      try {
        const statsResponse: any = await sellerService.getDashboardStats();
        if (statsResponse && statsResponse.success && statsResponse.data) {
          apiStats = statsResponse.data;
          setRecentInquiries(statsResponse.data.recent_inquiries || []);
          statsSuccess = true; // API stats available, can use smaller limit
        }
      } catch (statsError: any) {
        // If dashboard stats endpoint doesn't exist (404), we'll calculate from properties
        if (statsError?.status !== 404 && statsError?.response?.status !== 404) {
          console.warn('[SellerDashboard] Error loading API stats:', statsError);
        }
      }

      // Load properties - use smaller limit if stats API worked
      const propertiesLimit = statsSuccess ? 10 : 20; // Only need 3 for display, but fetch a few more for stats calc if needed
      const propertiesResponse: any = await sellerService.getProperties({
        page: 1,
        limit: propertiesLimit,
      });

      const response = propertiesResponse as any;
      console.log('[SellerDashboard] Raw API response:', JSON.stringify(response, null, 2));
      
      if (response && response.success && response.data) {
        // Handle different response structures
        let properties: any[] = [];
        
        if (response.data.properties && Array.isArray(response.data.properties)) {
          properties = response.data.properties;
          console.log('[SellerDashboard] Using response.data.properties:', properties.length);
        } else if (Array.isArray(response.data)) {
          properties = response.data;
          console.log('[SellerDashboard] Using response.data (array):', properties.length);
        } else {
          const dataKeys = Object.keys(response.data);
          console.log('[SellerDashboard] Response.data keys:', dataKeys);
          for (const key of dataKeys) {
            if (Array.isArray(response.data[key])) {
              properties = response.data[key];
              console.log('[SellerDashboard] Using response.data[' + key + ']:', properties.length);
              break;
            }
          }
        }
        
        // Log sample property to see structure
        if (properties.length > 0) {
          console.log('[SellerDashboard] Sample property (first):', {
            id: properties[0].id,
            title: properties[0].title,
            cover_image: properties[0].cover_image,
            image: properties[0].image,
            images: properties[0].images,
            allKeys: Object.keys(properties[0]),
          });
        }
        
        // Store all properties for stats calculation
        setAllProperties(properties);
        
        // Calculate dynamic stats from properties
        const totalProperties = properties.length;
        const activeProperties = properties.filter((prop: any) => {
          const isActive = prop.is_active === 1 || prop.is_active === true || 
                          prop.status === 'active' || prop.status === 1;
          return isActive;
        }).length;
        
        const totalViews = properties.reduce((sum: number, prop: any) => {
          return sum + (prop.views_count || prop.views || prop.view_count || 0);
        }, 0);
        
        const totalInquiries = properties.reduce((sum: number, prop: any) => {
          return sum + (prop.inquiry_count || prop.inquiries || prop.inquiry_count || 0);
        }, 0);
        
        const propertiesByStatus = {
          sale: properties.filter((prop: any) => prop.status === 'sale' || prop.status === 'sell').length,
          rent: properties.filter((prop: any) => prop.status === 'rent').length,
        };
        
        // Use API stats if available, otherwise use calculated stats from properties
        const finalStats: DashboardStats = apiStats ? {
          ...apiStats,
          // Override with calculated values for accuracy
          total_properties: totalProperties,
          active_properties: activeProperties,
          total_views: totalViews,
          total_inquiries: totalInquiries,
          properties_by_status: propertiesByStatus,
        } : {
          total_properties: totalProperties,
          active_properties: activeProperties,
          total_inquiries: totalInquiries,
          new_inquiries: 0,
          total_views: totalViews,
          views_percentage_change: 0,
          properties_by_status: propertiesByStatus,
          recent_inquiries: [],
          subscription: null,
        };
        
        setDashboardStats(finalStats);
        
        // Format recent properties (first 3)
        const formattedProperties: RecentProperty[] = properties.slice(0, 3).map((prop: any) => {
          // Try multiple image fields - backend might store images in different formats
          const rawImage = prop.cover_image || prop.image || prop.images?.[0] || prop.property_image || 
                          (Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : null);
          const imageUrl = fixImageUrl(rawImage);
          const propId = prop.id || prop.property_id;
          
          // Log image processing for debugging
          if (propId) {
            console.log(`[SellerDashboard] Property ${propId} image processing:`, {
              rawImage: rawImage,
              fixedUrl: imageUrl,
              hasRawImage: !!rawImage,
              hasFixedUrl: !!imageUrl,
              cover_image: prop.cover_image,
              image: prop.image,
              images: prop.images,
            });
          }
          
          return {
            id: propId,
            title: prop.title || prop.property_title || 'Untitled Property',
            location: prop.location || prop.city || 'Location not specified',
            price: parseFloat(prop.price || '0') || 0,
            status: (prop.status === 'rent' ? 'rent' : 'sale') as 'sale' | 'rent',
            cover_image: imageUrl || undefined,
            views: prop.views || prop.view_count || prop.views_count || 0,
            inquiries: prop.inquiries || prop.inquiry_count || 0,
          };
        });
        
        console.log('[SellerDashboard] Formatted properties:', formattedProperties.map(p => ({
          id: p.id,
          title: p.title,
          cover_image: p.cover_image,
        })));
        
        setRecentProperties(formattedProperties);
      } else {
        setRecentProperties([]);
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      // Only show alert for non-404 errors
      if (showLoading && error?.status !== 404 && error?.response?.status !== 404) {
        CustomAlert.alert('Error', error?.message || 'Failed to load dashboard data');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

      // Load data when screen is focused (e.g., returning from AddProperty)
      // Only reload if we don't have data yet, to avoid unnecessary API calls
      useFocusEffect(
        useCallback(() => {
          if (user && user.user_type === 'seller' && !dashboardStats) {
            loadDashboardData(true); // Only load if no data exists
          }
        }, [user, loadDashboardData, dashboardStats])
      );

  useEffect(() => {
    // Only load data if user is a seller
    if (user && user.user_type === 'seller') {
      // Auto-refresh every 30 seconds (as per documentation)
      refreshIntervalRef.current = setInterval(() => {
        loadDashboardData(false); // Silent refresh
      }, 30000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
    // Only depend on user.user_type to avoid recreating interval unnecessarily
    // loadDashboardData is memoized with empty deps, so it's stable
  }, [user?.user_type, loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(false);
  };

  const renderPropertyCard = ({item}: {item: RecentProperty}) => {
    // Validate and fix image URL for Android - improved handling
    let imageUrl: string | null = null;
    
    if (item.cover_image) {
      const trimmed = String(item.cover_image).trim();
      if (trimmed && trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
        // Ensure URL is properly formatted for Android
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          // Validate URL format
          try {
            new URL(trimmed);
            imageUrl = trimmed;
          } catch (e) {
            // Invalid URL format, try fixing
            const fixed = fixImageUrl(trimmed);
            if (fixed) {
              imageUrl = fixed;
            }
          }
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
      <PropertyImageCard
        imageUrl={imageUrl}
        propertyId={item.id}
        onPress={() => navigation.navigate('PropertyDetails', {propertyId: item.id})}
        style={styles.propertyCard}>
        <View style={styles.propertyCardContent}>
          <View style={styles.propertyCardHeader}>
            <View style={styles.propertyCardInfo}>
              <View style={styles.propertyBadgeContainer}>
                <View
                  style={[
                    styles.propertyStatusBadge,
                    {
                      backgroundColor:
                        item.status === 'sale' ? colors.success : colors.primary,
                    },
                  ]}>
                  <Text style={styles.propertyStatusText}>
                    {item.status === 'sale' ? 'For Sale' : 'For Rent'}
                  </Text>
                </View>
              </View>
              <Text style={styles.propertyCardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.propertyLocationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.propertyCardLocation} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.propertyCardStats}>
            <Text style={styles.propertyStatText}>
              👁️ {item.views} people interested
            </Text>
            <Text style={styles.propertyStatText}>
              💬 {item.inquiries} inquiries
            </Text>
          </View>
          <Text style={styles.propertyCardPrice}>
            {formatters.price(item.price, item.status === 'rent')}
          </Text>
        </View>
      </PropertyImageCard>
    );
  };

  // Property Image Card Component with error handling
  const PropertyImageCard: React.FC<{
    imageUrl: string | null;
    propertyId: number | string;
    onPress: () => void;
    style: any;
    children: React.ReactNode;
  }> = ({imageUrl, propertyId, onPress, style, children}) => {
    const [hasError, setHasError] = useState(false);
    
    // Reset error state when imageUrl changes
    React.useEffect(() => {
      setHasError(false);
    }, [imageUrl]);
    
    return (
      <TouchableOpacity style={style} onPress={onPress}>
        {imageUrl && !hasError ? (
          <Image
            source={{uri: imageUrl}}
            style={styles.propertyImage}
            resizeMode="cover"
            onError={() => {
              // Silently handle image errors - show placeholder instead
              setHasError(true);
            }}
          />
        ) : (
          <View style={styles.propertyImagePlaceholder}>
            <Text style={styles.propertyImagePlaceholderText}>🏠</Text>
          </View>
        )}
        {children}
      </TouchableOpacity>
    );
  };

  const renderInquiryCard = ({item}: {item: RecentInquiry}) => (
    <TouchableOpacity
      style={styles.inquiryCard}
      onPress={() =>
        navigation.navigate('Inquiries', {inquiryId: item.id} as never)
      }>
      <View style={styles.inquiryCardHeader}>
        {item.buyer_profile_image ? (
          <Image
            source={{uri: fixImageUrl(item.buyer_profile_image)}}
            style={styles.inquiryAvatar}
          />
        ) : (
          <View style={styles.inquiryAvatarPlaceholder}>
            <Text style={styles.inquiryAvatarText}>
              {item.buyer_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.inquiryCardInfo}>
          <Text style={styles.inquiryBuyerName} numberOfLines={1}>
            {item.buyer_name}
          </Text>
          <Text style={styles.inquiryTime}>
            {formatters.timeAgo(item.created_at)}
          </Text>
        </View>
      </View>
      <Text style={styles.inquiryPropertyTitle} numberOfLines={1}>
        {item.property_title}
      </Text>
      <Text style={styles.inquiryMessage} numberOfLines={2}>
        {item.message}
      </Text>
    </TouchableOpacity>
  );

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Show access denied message if user is an agent
  if (user && user.user_type === 'agent') {
    return (
      <View style={styles.container}>
        <SellerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onSubscriptionPress={() => navigation.navigate('Subscription' as never)}
          onLogoutPress={async () => {
            await logout();
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorIcon}>🚫</Text>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.
          </Text>
        </View>
      </View>
    );
  }

  if (loading && !dashboardStats) {
    return (
      <View style={styles.container}>
        <SellerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onSubscriptionPress={() => navigation.navigate('Subscription' as never)}
          onLogoutPress={async () => {
            await logout();
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  const stats = dashboardStats || {
    total_properties: 0,
    active_properties: 0,
    total_inquiries: 0,
    new_inquiries: 0,
    total_views: 0,
    views_percentage_change: 0,
    properties_by_status: {sale: 0, rent: 0},
    recent_inquiries: [],
  };

  const daysRemaining = stats.subscription?.end_date
    ? formatters.daysRemaining(stats.subscription.end_date)
    : 0;

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onSubscriptionPress={() => navigation.navigate('Subscription' as never)}
        onLogoutPress={async () => {
          await logout();
        }}
        subscriptionDays={daysRemaining}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          }}>
          {/* Seller Header */}
          <ImageBackground
            source={require('../../assets/sellproperty.jpg')}
            style={styles.sellerHeader}
            imageStyle={styles.sellerHeaderImage}>
            <View style={styles.sellerHeaderOverlay}>
              <View style={styles.sellerHeaderContent}>
                <Text style={styles.sellerGreeting}>
                  Welcome back, {user?.full_name?.split(' ')[0] || user?.name || 'Seller'}!
                </Text>
                <Text style={styles.sellerSubtitle}>
                  Here's what's happening with your properties today
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addPropertyButton}
                onPress={async () => {
                  // Check property limit before navigating
                  try {
                    const statsResponse: any = await sellerService.getDashboardStats();
                    if (statsResponse && statsResponse.success && statsResponse.data) {
                      const currentCount = statsResponse.data.total_properties || 0;
                      if (currentCount >= 3) {
                        CustomAlert.alert(
                          'Property Limit Reached',
                          'You have reached the maximum limit of 3 properties. You cannot add more properties.',
                          [{text: 'OK'}]
                        );
                        return;
                      }
                    }
                    navigation.navigate('AddProperty');
                  } catch (error) {
                    // If check fails, still allow navigation (will be checked again in AddPropertyScreen)
                    navigation.navigate('AddProperty');
                  }
                }}>
                <Text style={styles.addPropertyButtonText}>+ Add Property</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>

        {/* Statistics Cards (2x2 Grid) */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Properties */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => {
              console.log('[SellerDashboard] Navigating to MyProperties tab');
              navigation.navigate('MyProperties');
            }}>
            <View style={styles.statCardIcon}>
              <Text style={styles.statIcon}>🏠</Text>
            </View>
            <Text style={styles.statNumber}>{stats.total_properties}</Text>
            <Text style={styles.statLabel}>Total Properties</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>
                {stats.active_properties} Active
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: People Showed Interest */}
          <View style={styles.statCard}>
            <View style={styles.statCardIcon}>
              <Text style={styles.statIcon}>👁️</Text>
            </View>
            <Text style={styles.statNumber}>
              {formatters.formatNumber(stats.total_views)}
            </Text>
            <Text style={styles.statLabel}>People Showed Interest</Text>
            {stats.views_percentage_change > 0 ? (
              <View style={styles.positiveIndicator}>
                <Text style={styles.indicatorText}>
                  {stats.views_percentage_change}% ↑
                </Text>
              </View>
            ) : stats.views_percentage_change < 0 ? (
              <View style={styles.negativeIndicator}>
                <Text style={styles.indicatorText}>
                  {Math.abs(stats.views_percentage_change)}% ↓
                </Text>
              </View>
            ) : (
              <View style={styles.activeIndicator}>
                <Text style={styles.indicatorText}>Active</Text>
              </View>
            )}
            <Text style={styles.statHint}>
              {stats.total_views} people have viewed your properties
            </Text>
          </View>

          {/* Card 3: Total Inquiries */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Inquiries')}>
            <View style={styles.statCardIcon}>
              <Text style={styles.statIcon}>💬</Text>
            </View>
            <Text style={styles.statNumber}>{stats.total_inquiries}</Text>
            <Text style={styles.statLabel}>Total Inquiries</Text>
            {stats.new_inquiries > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  {stats.new_inquiries} New
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Card 4: Listing Status */}
          <View style={styles.statCard}>
            <View style={styles.statCardIcon}>
              <Text style={styles.statIcon}>☀️</Text>
            </View>
            <Text style={styles.statLabel}>Listing Status</Text>
            <View style={styles.statusPills}>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {stats.properties_by_status.sale} Sale
                </Text>
              </View>
              <View style={[styles.statusPill, styles.statusPillRent]}>
                <Text style={styles.statusPillText}>
                  {stats.properties_by_status.rent} Rent
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid (2x2) */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={async () => {
              // Check property limit before navigating
              try {
                const statsResponse: any = await sellerService.getDashboardStats();
                if (statsResponse && statsResponse.success && statsResponse.data) {
                  const currentCount = statsResponse.data.total_properties || 0;
                  if (currentCount >= 3) {
                    CustomAlert.alert(
                      'Property Limit Reached',
                      'You have reached the maximum limit of 3 properties. You cannot add more properties.',
                      [{text: 'OK'}]
                    );
                    return;
                  }
                }
                navigation.navigate('AddProperty');
              } catch (error) {
                // If check fails, still allow navigation (will be checked again in AddPropertyScreen)
                navigation.navigate('AddProperty');
              }
            }}>
            <Text style={styles.quickActionIcon}>➕</Text>
            <Text style={styles.quickActionTitle}>Add New Property</Text>
            <Text style={styles.quickActionDescription}>
              List a new property for sale or rent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => {
              console.log('[SellerDashboard] Navigating to MyProperties from quick actions');
              navigation.navigate('MyProperties');
            }}>
            <Text style={styles.quickActionIcon}>✏️</Text>
            <Text style={styles.quickActionTitle}>Manage Properties</Text>
            <Text style={styles.quickActionDescription}>
              Edit, update or remove listings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Inquiries')}>
            <Text style={styles.quickActionIcon}>💬</Text>
            <Text style={styles.quickActionTitle}>View Inquiries</Text>
            <Text style={styles.quickActionDescription}>
              Respond to buyer inquiries
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.quickActionIcon}>👤</Text>
            <Text style={styles.quickActionTitle}>Update Profile</Text>
            <Text style={styles.quickActionDescription}>
              Manage your account settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Properties Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Properties</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[SellerDashboard] Navigating to MyProperties from View All');
                navigation.navigate('MyProperties');
              }}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentProperties.length > 0 ? (
            <FlatList
              data={recentProperties}
              renderItem={renderPropertyCard}
              keyExtractor={item => String(item.id)}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🏠</Text>
              <Text style={styles.emptyStateText}>No Properties Listed</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('AddProperty')}>
                <Text style={styles.emptyStateButtonText}>Add Property</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Inquiries Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Recent Inquiries</Text>
              {stats.new_inquiries > 0 && (
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {stats.new_inquiries} New
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Inquiries')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentInquiries.length > 0 ? (
            <FlatList
              data={recentInquiries.slice(0, 4)}
              renderItem={renderInquiryCard}
              keyExtractor={item => String(item.id)}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>💬</Text>
              <Text style={styles.emptyStateText}>No new inquiries</Text>
            </View>
          )}
        </View>
        </Animated.View>
      </ScrollView>
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
    padding: spacing.lg,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sellerHeader: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    minHeight: 180,
  },
  sellerHeaderImage: {
    borderRadius: borderRadius.xl,
  },
  sellerHeaderOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: spacing.lg,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  sellerHeaderContent: {
    marginBottom: spacing.md,
  },
  sellerGreeting: {
    ...typography.h1,
    color: colors.surface,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sellerSubtitle: {
    ...typography.body,
    color: colors.surface,
    fontSize: 14,
    opacity: 0.9,
  },
  addPropertyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  addPropertyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    justifyContent: 'space-between',
    marginHorizontal: -spacing.xs, // Negative margin for spacing between cards
  },
  statCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 3) / 2, // Responsive width calculation with proper spacing
    minWidth: 150, // Minimum width for very small screens
    maxWidth: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 3) / 2, // Max width same as width for consistent grid
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.xs / 2, // Half margin on each side for spacing
    marginBottom: spacing.md, // Bottom margin for wrapping
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardIcon: {
    marginBottom: spacing.sm,
  },
  statIcon: {
    fontSize: 32,
  },
  statNumber: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  activeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  activeBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  newBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  positiveIndicator: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  negativeIndicator: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  activeIndicator: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  indicatorText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  statHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: spacing.xs,
  },
  statusPills: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  statusPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  statusPillRent: {
    backgroundColor: colors.accent || '#FF9800',
  },
  statusPillText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    justifyContent: 'space-between',
    marginHorizontal: -spacing.xs, // Negative margin for spacing between cards
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 3) / 2, // Responsive width calculation with proper spacing
    minWidth: 150, // Minimum width for very small screens
    maxWidth: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 3) / 2, // Max width same as width for consistent grid
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.xs / 2, // Half margin on each side for spacing
    marginBottom: spacing.md, // Bottom margin for wrapping
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  quickActionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  quickActionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  sectionBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  sectionBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
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
    maxWidth: '100%', // Ensure it doesn't overflow
  },
  propertyImage: {
    width: '100%',
    height: Math.min(180, SCREEN_WIDTH * 0.5), // Responsive height
    resizeMode: 'cover',
    backgroundColor: colors.border,
  },
  propertyImagePlaceholder: {
    width: '100%',
    height: Math.min(180, SCREEN_WIDTH * 0.5), // Responsive height
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyImagePlaceholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  propertyCardContent: {
    padding: spacing.md,
  },
  propertyCardHeader: {
    marginBottom: spacing.sm,
  },
  propertyBadgeContainer: {
    marginBottom: spacing.xs,
  },
  propertyStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  propertyStatusText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  propertyCardTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs / 2,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  propertyCardLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  propertyCardStats: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
  },
  propertyStatText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  propertyCardPrice: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  inquiryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inquiryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inquiryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  inquiryAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  inquiryAvatarText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  inquiryCardInfo: {
    flex: 1,
  },
  inquiryBuyerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  inquiryTime: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  inquiryPropertyTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inquiryMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  emptyStateButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default SellerDashboardScreen;
