import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
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
  Easing,
  Platform,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {CompositeNavigationProp, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerStackParamList} from '../../navigation/SellerNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {sellerService, DashboardStats} from '../../services/seller.service';
import CustomAlert from '../../utils/alertHelper';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';
import {DEBUG_SELLER_CRASH, SELLER_DASHBOARD_SAFE_MODE} from '../../config/debugCrash';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type SellerDashboardScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<SellerStackParamList, 'Dashboard'>,
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
  buyer_id: number | null; // null for guest inquiries
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_profile_image?: string;
  message: string;
  status: string;
  created_at: string;
}

// Animated Components
const AnimatedAddPropertyButton = React.memo(({onPress}: {onPress: () => void}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  return (
    <Animated.View style={{transform: [{scale: scaleAnim}]}}>
      <TouchableOpacity
        style={styles.addPropertyButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}>
        <Text style={styles.addPropertyButtonText}>+ Add Property</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const AnimatedStatCard = React.memo(({
  icon,
  number,
  label,
  badge,
  badgeColor,
  statusPills,
  onPress,
  delay = 0,
}: {
  icon: string;
  number?: string | number;
  label: string;
  badge?: string;
  badgeColor?: string;
  statusPills?: {sale: number; rent: number};
  onPress?: () => void;
  delay?: number;
}) => {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 400,
      delay: delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        friction: 3,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }).start();
    }
  };

  // Determine badge text color based on background
  const getBadgeTextColor = () => {
    if (!badgeColor) return '#059669';
    if (badgeColor === '#D1FAE5') return '#059669'; // Green bg -> green text
    if (badgeColor === '#FEE2E2') return '#DC2626'; // Red bg -> red text
    if (badgeColor === '#E3F6FF') return colors.primary; // Blue bg -> blue text
    if (badgeColor === '#F3F4F6') return '#6B7280'; // Gray bg -> gray text
    return '#059669';
  };

  const CardWrapper = onPress ? TouchableOpacity : View;
  const cardProps = onPress
    ? {
        onPress,
        onPressIn: handlePressIn,
        onPressOut: handlePressOut,
        activeOpacity: 0.8,
      }
    : {};

  return (
    <Animated.View
      style={[
        {opacity: cardAnim, transform: [{scale: scaleAnim}]},
        {width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 3) / 2},
      ]}>
      <CardWrapper style={styles.statCard} {...cardProps}>
        <View style={styles.statCardIcon}>
          <Text style={styles.statIcon}>{icon}</Text>
        </View>
        {number !== undefined && (
          <Text style={styles.statNumber}>{number}</Text>
        )}
        <Text style={styles.statLabel}>{label}</Text>
        {badge && (
          <View style={[styles.activeBadge, badgeColor && {backgroundColor: badgeColor}]}>
            <Text style={[styles.activeBadgeText, {color: getBadgeTextColor()}]}>{badge}</Text>
          </View>
        )}
        {statusPills && (
          <View style={styles.statusPills}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{statusPills.sale} Sale</Text>
            </View>
            <View style={[styles.statusPill, styles.statusPillRent]}>
              <Text style={styles.statusPillText}>{statusPills.rent} Rent</Text>
            </View>
          </View>
        )}
      </CardWrapper>
    </Animated.View>
  );
});

const AnimatedQuickActionCard = React.memo(({
  icon,
  title,
  description,
  onPress,
  delay = 0,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  delay?: number;
}) => {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 400,
      delay: delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: cardAnim,
          transform: [{scale: scaleAnim}],
          width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 3) / 2,
        },
      ]}>
      <TouchableOpacity
        style={styles.quickActionCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}>
        <View style={styles.quickActionIconContainer}>
          <Text style={styles.quickActionIcon}>{icon}</Text>
        </View>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionDescription}>{description}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const AnimatedSeeAllButton = React.memo(({onPress, children}: {
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  return (
    <Animated.View style={{transform: [{scale: scaleAnim}]}}>
      <TouchableOpacity
        style={styles.seeAllButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
});

const AnimatedInquiryCard = React.memo(({
  item,
  index,
  navigation,
}: {
  item: RecentInquiry;
  index: number;
  navigation: any;
}) => {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [{scale: scaleAnim}],
      }}>
      <TouchableOpacity
        style={styles.inquiryCard}
        onPress={() => navigation.navigate('Leads')}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}>
        <View style={styles.inquiryCardHeader}>
          {item.buyer_profile_image ? (
            <Image
              source={{uri: fixImageUrl(item.buyer_profile_image)}}
              style={styles.inquiryAvatar}
            />
          ) : (
            <View style={styles.inquiryAvatarPlaceholder}>
              <Text style={styles.inquiryAvatarText}>
                {(item.buyer_name ? String(item.buyer_name).charAt(0).toUpperCase() : '?')}
              </Text>
            </View>
          )}
          <View style={styles.inquiryCardInfo}>
            <Text style={styles.inquiryBuyerName} numberOfLines={1}>
              {item.buyer_name ?? 'Unknown'}
            </Text>
            <Text style={styles.inquiryTime}>
              {formatters.timeAgo(item.created_at ?? '')}
            </Text>
          </View>
        </View>
        <Text style={styles.inquiryPropertyTitle} numberOfLines={1}>
          {item.property_title ?? ''}
        </Text>
        <Text style={styles.inquiryMessage} numberOfLines={2}>
          {item.message ?? ''}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const SellerDashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout, switchUserRole} = useAuth();
  const [switchingRole, setSwitchingRole] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Performance optimization: cache timestamp to prevent excessive API calls
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const hasAnimatedRef = useRef<boolean>(false);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const CACHE_DURATION = 30000; // 30 seconds cache
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[DEBUG RoleSwitch] 12. SellerDashboardScreen MOUNTED - user:', !!user, 'user_type:', user?.user_type, 'DEBUG_SELLER_CRASH:', DEBUG_SELLER_CRASH, 'SELLER_DASHBOARD_SAFE_MODE:', SELLER_DASHBOARD_SAFE_MODE);
  }, [user?.user_type]);

  // DEBUG: Static placeholder when isolating crash (no API, no SellerHeader, minimal hooks already run above)
  if (DEBUG_SELLER_CRASH) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface}}>
        <Text style={{fontSize: 16, color: colors.textSecondary}}>Seller Dashboard placeholder (APIs disabled)</Text>
      </View>
    );
  }

  useEffect(() => {
    // Only run entrance animations once
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400, // Reduced for faster perceived load
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(statsAnim, {
          toValue: 1,
          duration: 500,
          delay: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  // Check user type access (agent cannot use seller dashboard). navigation.reset only in callback, not during render.
  useEffect(() => {
    if (!user || user.user_type !== 'agent') return;
    CustomAlert.alert(
      'Access Denied',
      'You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.',
      [
        {
          text: 'OK',
          onPress: () => {
            try {
              (navigation as any).reset({
                index: 0,
                routes: [{name: 'Agent'}],
              });
            } catch (e: any) {
              console.warn('[SellerDashboard] Agent redirect reset failed:', e?.message);
            }
          },
        },
      ],
      {cancelable: false}
    );
  }, [user, navigation]);

  const loadDashboardData = useCallback(async (showLoading: boolean = true, forceRefresh: boolean = false) => {
    if (!user || user?.user_type !== 'seller') {
      if (showLoading) setLoading(false);
      return;
    }
    // Prevent duplicate fetches and implement caching
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    // Skip if already fetching or if data is still fresh (unless force refresh)
    if (isFetchingRef.current) {
      return;
    }
    
    if (!forceRefresh && timeSinceLastFetch < CACHE_DURATION && hasLoadedOnceRef.current) {
      return; // Use cached data
    }
    
    isFetchingRef.current = true;
    
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Try to get stats first - if successful, we only need 3 properties for display
      let apiStats: DashboardStats | null = null;
      let statsSuccess = false;
      
      try {
        console.log('[SellerDashboard] Before getDashboardStats');
        const statsResponse: any = await sellerService.getDashboardStats();
        console.log('[SellerDashboard] After getDashboardStats success:', !!statsResponse?.success, 'hasData:', !!statsResponse?.data);
        if (statsResponse && statsResponse.success && statsResponse.data) {
          apiStats = statsResponse.data;
          const inquiries = statsResponse.data.recent_inquiries;
          setRecentInquiries(Array.isArray(inquiries) ? inquiries : []);
          statsSuccess = true;
        }
      } catch (statsError: any) {
        // Silent fail for 404 errors
        if (__DEV__ && statsError?.status !== 404 && statsError?.response?.status !== 404) {
          console.warn('[SellerDashboard] Error loading API stats:', statsError);
        }
      }

      // Load properties - wrap in try/catch so 401/403 or network errors don't crash the app
      let propertiesResponse: any = null;
      try {
        console.log('[SellerDashboard] Before getProperties');
        const propertiesLimit = statsSuccess ? 10 : 20;
        propertiesResponse = await sellerService.getProperties({
          page: 1,
          limit: propertiesLimit,
        });
        console.log('[SellerDashboard] After getProperties success:', !!propertiesResponse?.success, 'hasData:', !!propertiesResponse?.data);
      } catch (propertiesError: any) {
        if (__DEV__) {
          console.warn('[SellerDashboard] Error loading properties:', propertiesError);
        }
        setDashboardStats({
          total_properties: 0,
          active_properties: 0,
          total_inquiries: 0,
          new_inquiries: 0,
          total_views: 0,
          views_percentage_change: 0,
          properties_by_status: {sale: 0, rent: 0},
          recent_inquiries: [],
          subscription: null,
        });
        setRecentProperties([]);
        hasLoadedOnceRef.current = true;
        return;
      }

      const response = propertiesResponse as any;
      
      if (response && response.success && response.data) {
        // Handle different response structures
        let properties: any[] = [];
        
        const data = response.data;
        if (data?.properties && Array.isArray(data.properties)) {
          properties = data.properties;
        } else if (Array.isArray(data)) {
          properties = data;
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
          const dataKeys = Object.keys(data);
          for (const key of dataKeys) {
            const val = data[key];
            if (Array.isArray(val)) {
              properties = val;
              break;
            }
          }
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
        
        // Use views_count as primary field (backend standard), fallback to views or view_count
        // IMPORTANT: views_count = unique users who viewed this property (1 view per user per property)
        // This count updates when properties are fetched from backend, NOT in real-time.
        // Dashboard auto-refreshes every 60 seconds, so views may appear to increase when refresh happens.
        const totalViews = properties.reduce((sum: number, prop: any) => {
          // Priority: views_count > views > view_count
          const propViews = prop.views_count ?? prop.views ?? prop.view_count ?? 0;
          return sum + (typeof propViews === 'number' ? propViews : 0);
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
          
          return {
            id: propId,
            title: prop.title || prop.property_title || 'Untitled Property',
            location: prop.location || prop.city || 'Location not specified',
            price: parseFloat(prop.price || '0') || 0,
            status: (prop.status === 'rent' ? 'rent' : 'sale') as 'sale' | 'rent',
            cover_image: imageUrl || undefined,
            // Use views_count as primary (backend standard), fallback to views or view_count
            // NOTE: Each user counts as 1 view per property, even with multiple clicks
            views: prop.views_count ?? prop.views ?? prop.view_count ?? 0,
            inquiries: prop.inquiries || prop.inquiry_count || 0,
          };
        });
        
        setRecentProperties(formattedProperties);
        hasLoadedOnceRef.current = true;
      } else {
        // No properties found - set empty stats to allow screen to render
        setRecentProperties([]);
        hasLoadedOnceRef.current = true;
        const emptyStats: DashboardStats = {
          total_properties: 0,
          active_properties: 0,
          total_inquiries: 0,
          new_inquiries: 0,
          total_views: 0,
          views_percentage_change: 0,
          properties_by_status: {sale: 0, rent: 0},
          recent_inquiries: [],
          subscription: null,
        };
        setDashboardStats(emptyStats);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error loading dashboard data:', error);
      }
      // Set empty stats even on error to allow screen to render
      const emptyStats: DashboardStats = {
        total_properties: 0,
        active_properties: 0,
        total_inquiries: 0,
        new_inquiries: 0,
        total_views: 0,
        views_percentage_change: 0,
        properties_by_status: {sale: 0, rent: 0},
        recent_inquiries: [],
        subscription: null,
      };
      setDashboardStats(emptyStats);
      setRecentProperties([]);
      // Only show alert for non-404 errors
      if (showLoading && error?.status !== 404 && error?.response?.status !== 404) {
        CustomAlert.alert('Error', error?.message || 'Failed to load dashboard data');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
      isFetchingRef.current = false;
      lastFetchTimeRef.current = Date.now();
    }
  }, []);

  // Load data when screen is focused (e.g., returning from AddProperty)
  // Uses caching to prevent unnecessary API calls. Skip when safe mode (no API).
  useFocusEffect(
    useCallback(() => {
      if (SELLER_DASHBOARD_SAFE_MODE) return;
      if (user && user.user_type === 'seller') {
        // Wait for navigation animation to complete before fetching
        const task = InteractionManager.runAfterInteractions(() => {
          loadDashboardData(false, false); // Silent refresh with caching
        });
        return () => task.cancel();
      }
    }, [user, loadDashboardData])
  );

  // Initial load on mount and auto-refresh setup. Skip when safe mode (no API).
  useEffect(() => {
    if (SELLER_DASHBOARD_SAFE_MODE) return;
    if (user && user.user_type === 'seller') {
      console.log('[SellerDashboard] Initial load starting (before API)');
      // Defer first fetch by one frame so Seller screen paints immediately when switching from Buyer
      const rafId = requestAnimationFrame(() => {
        InteractionManager.runAfterInteractions(() => {
          loadDashboardData(true, true);
        });
      });

      const interval = setInterval(() => {
        loadDashboardData(false, true);
      }, 60000);
      refreshIntervalRef.current = interval;

      return () => {
        cancelAnimationFrame(rafId);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [user?.user_type, loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(false, true); // Force refresh on pull-to-refresh
  };

  // Property Image Card Component with error handling (defined first so AnimatedPropertyCard can use it)
  const PropertyImageCard: React.FC<{
    imageUrl: string | null;
    propertyId: number | string;
    onPress: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    style: any;
    children: React.ReactNode;
  }> = ({imageUrl, propertyId, onPress, onPressIn, onPressOut, style, children}) => {
    const [hasError, setHasError] = useState(false);

    React.useEffect(() => {
      setHasError(false);
    }, [imageUrl]);

    return (
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}>
        {imageUrl && !hasError ? (
          <Image
            source={{uri: imageUrl}}
            style={styles.propertyImage}
            resizeMode="cover"
            onError={() => setHasError(true)}
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

  // Animated Property Card - stable component reference to prevent list item remount/opacity blink
  const AnimatedPropertyCard = useMemo(() => React.memo(({
    item,
    index,
    navigation,
  }: {
    item: RecentProperty;
    index: number;
    navigation: SellerDashboardScreenNavigationProp;
  }) => {
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
    
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const hasAnimated = useRef(false);

    useEffect(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: 0,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        friction: 3,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }).start();
    };

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [{scale: scaleAnim}],
        }}>
        <PropertyImageCard
          imageUrl={imageUrl}
          propertyId={String(item.id)}
          onPress={() => navigation.navigate('PropertyDetails', {propertyId: String(item.id)})}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
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
                <View style={styles.locationIconContainer}>
                  <Text style={styles.locationIcon}>📍</Text>
                </View>
                <Text style={styles.propertyCardLocation} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.propertyCardStats}>
            <View style={styles.propertyStatItem}>
              <View style={styles.propertyStatIconContainer}>
                <Text style={styles.propertyStatIcon}>👁</Text>
              </View>
              <Text style={styles.propertyStatText}>
                {item.views} people interested
              </Text>
            </View>
            <View style={styles.propertyStatItem}>
              <View style={styles.propertyStatIconContainer}>
                <Text style={styles.propertyStatIcon}>💬</Text>
              </View>
              <Text style={styles.propertyStatText}>
                {item.inquiries} inquiries
              </Text>
            </View>
          </View>
          <Text style={styles.propertyCardPrice}>
            {formatters.price(item.price, item.status === 'rent')}
          </Text>
        </View>
        </PropertyImageCard>
      </Animated.View>
    );
  }), []);

  const renderPropertyCard = useCallback(({item, index}: {item: RecentProperty; index: number}) => (
    <AnimatedPropertyCard
      item={item}
      index={index}
      navigation={navigation}
    />
  ), [navigation]);

  const getInitials = (name: string): string => {
    if (!name || typeof name !== 'string') return '';
    return name
      .split(' ')
      .map(n => (n && n[0]) || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Safe mode: render only static JSX (no API, no SellerHeader). Must be after ALL hooks (useMemo, useCallback above).
  if (SELLER_DASHBOARD_SAFE_MODE) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface}}>
        <Text style={{fontSize: 16, color: colors.textSecondary}}>Seller Home Safe</Text>
      </View>
    );
  }

  // Defensive: do not render seller content until user is present (avoids crash on role-switch race)
  if (!user) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show access denied message if user is an agent
  if (user.user_type === 'agent') {
    return (
      <View style={styles.container}>
        <SellerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onSubscriptionPress={() => navigation.navigate('Subscription' as never)}
          onBuyPropertyPress={async () => {
            // Set dashboard preference and navigate to Buyer dashboard
            await AsyncStorage.setItem('@target_dashboard', 'buyer');
            await AsyncStorage.setItem('@user_dashboard_preference', 'buyer');
            (navigation as any).reset({
              index: 0,
              routes: [{name: 'MainTabs'}],
            });
          }}
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
          onBuyPropertyPress={async () => {
            // Set dashboard preference and navigate to Buyer dashboard
            await AsyncStorage.setItem('@target_dashboard', 'buyer');
            await AsyncStorage.setItem('@user_dashboard_preference', 'buyer');
            (navigation as any).reset({
              index: 0,
              routes: [{name: 'MainTabs'}],
            });
          }}
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

  const stats: DashboardStats = dashboardStats ?? {
    total_properties: 0,
    active_properties: 0,
    total_inquiries: 0,
    new_inquiries: 0,
    total_views: 0,
    views_percentage_change: 0,
    properties_by_status: {sale: 0, rent: 0},
    recent_inquiries: [],
    subscription: null,
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
        onBuyPropertyPress={async () => {
          // Switch role to buyer and navigate to Buyer dashboard
          if (switchingRole) return; // Prevent multiple clicks
          
          try {
            setSwitchingRole(true);
            await switchUserRole('buyer');
          } catch (error: any) {
            console.error('[SellerDashboard] Error switching role:', error);
            CustomAlert.alert(
              'Role Switch Failed',
              error?.message || 'Failed to switch to buyer dashboard. Please try again.',
            );
          } finally {
            setSwitchingRole(false);
          }
        }}
        onLogoutPress={async () => {
          await logout();
        }}
        subscriptionDays={daysRemaining}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true}
        )}
        scrollEventThrottle={16}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          }}>
          {/* Seller Header Box */}
          <View style={styles.sellerHeaderContainer}>
            <View style={styles.sellerHeaderBox}>
              <View style={styles.sellerHeaderContent}>
                <Text style={styles.sellerGreeting}>
                  Welcome{user?.full_name ? `, ${String(user.full_name).split(' ')[0] ?? ''}` : ''} ❤️
                </Text>
                <Text style={styles.sellerSubtitle}>
                  Here's what's happening with your properties today
                </Text>
              </View>
              <AnimatedAddPropertyButton
                onPress={async () => {
                  // Check property limit before navigating (free: 3, basic/pro/premium: 10)
                  try {
                    const statsResponse: any = await sellerService.getDashboardStats();
                    if (statsResponse && statsResponse.success && statsResponse.data) {
                      const currentCount = statsResponse.data.total_properties || 0;
                      const planType = statsResponse.data.subscription?.plan_type || 'free';
                      const limits: {[key: string]: number} = {
                        free: 3,
                        basic: 10,
                        pro: 10,
                        premium: 10,
                      };
                      const limit = limits[planType] || limits.free;
                      if (limit > 0 && currentCount >= limit) {
                        CustomAlert.alert(
                          'Property limit reached',
                          `Property limit reached. You can list up to ${limit} properties in your current plan.`,
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
                }}
              />
            </View>
          </View>

        {/* Statistics Cards (2x2 Grid) with Animations */}
        <Animated.View 
          style={[
            styles.statsGrid,
            {
              opacity: statsAnim,
            },
          ]}>
          {/* Card 1: Total Properties */}
          <AnimatedStatCard
            icon="🏠"
            number={stats.total_properties}
            label="Total Properties"
            badge={`${stats.active_properties} Active`}
            badgeColor="#D1FAE5"
            onPress={() => navigation.navigate('MyProperties')}
            delay={0}
          />

          {/* Card 2: People Showed Interest (Views) */}
          <AnimatedStatCard
            icon="👁"
            number={formatters.formatNumber(stats.total_views)}
            label="Views"
            badge={stats.views_percentage_change > 0 
              ? `+${stats.views_percentage_change}%` 
              : stats.views_percentage_change < 0 
              ? `${stats.views_percentage_change}%` 
              : 'Active'}
            badgeColor={stats.views_percentage_change > 0 ? '#D1FAE5' : stats.views_percentage_change < 0 ? '#FEE2E2' : '#E3F6FF'}
            delay={100}
          />

          {/* Card 3: Total Leads */}
          <AnimatedStatCard
            icon="💬"
            number={stats.total_inquiries}
            label="Total Leads"
            badge={stats.new_inquiries > 0 ? `${stats.new_inquiries} New` : 'No New'}
            badgeColor={stats.new_inquiries > 0 ? '#FEE2E2' : '#F3F4F6'}
            onPress={() => navigation.navigate('Leads')}
            delay={200}
          />

          {/* Card 4: Listing Status */}
          <AnimatedStatCard
            icon="📊"
            number={(stats.properties_by_status?.sale ?? 0) + (stats.properties_by_status?.rent ?? 0)}
            label="Listing Status"
            statusPills={{
              sale: stats.properties_by_status?.sale ?? 0,
              rent: stats.properties_by_status?.rent ?? 0,
            }}
            delay={300}
          />
        </Animated.View>

        {/* Quick Actions Grid (2x2) with Animations */}
        <View style={styles.quickActionsGrid}>
          <AnimatedQuickActionCard
            icon="➕"
            title="Add New Property"
            description="List a new property for sale or rent"
            onPress={async () => {
              // Check property limit before navigating (free: 3, basic/pro/premium: 10)
              try {
                const statsResponse: any = await sellerService.getDashboardStats();
                if (statsResponse && statsResponse.success && statsResponse.data) {
                  const currentCount = statsResponse.data.total_properties || 0;
                  const planType = statsResponse.data.subscription?.plan_type || 'free';
                  const limits: {[key: string]: number} = {
                    free: 3,
                    basic: 10,
                    pro: 10,
                    premium: 10,
                  };
                  const limit = limits[planType] || limits.free;
                  if (limit > 0 && currentCount >= limit) {
                    CustomAlert.alert(
                      'Property limit reached',
                      `Property limit reached. You can list up to ${limit} properties in your current plan.`,
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
            }}
            delay={0}
          />

          <AnimatedQuickActionCard
            icon="✏"
            title="Manage Properties"
            description="Edit, update or remove listings"
            onPress={() => navigation.navigate('MyProperties')}
            delay={100}
          />

          <AnimatedQuickActionCard
            icon="💬"
            title="View Leads"
            description="See leads from buyers who viewed contact"
            onPress={() => navigation.navigate('Leads')}
            delay={200}
          />

          <AnimatedQuickActionCard
            icon="👤"
            title="Update Profile"
            description="Manage your account settings"
            onPress={() => navigation.navigate('Profile')}
            delay={300}
          />
        </View>

        {/* Recent Properties Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>🏠</Text>
              </View>
              <Text style={styles.sectionTitle}>Your Properties</Text>
            </View>
            <AnimatedSeeAllButton
              onPress={() => navigation.navigate('MyProperties')}>
              <Text style={styles.viewAllText}>View All</Text>
              <Text style={styles.viewAllArrow}>›</Text>
            </AnimatedSeeAllButton>
          </View>
          {(recentProperties?.length ?? 0) > 0 ? (
            <FlatList
              data={recentProperties ?? []}
              renderItem={renderPropertyCard}
              keyExtractor={(item: RecentProperty) => String(item.id)}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <Text style={styles.emptyStateIcon}>🏠</Text>
              </View>
              <Text style={styles.emptyStateTitle}>No Properties Listed</Text>
              <Text style={styles.emptyStateText}>
                Start by adding your first property to get started
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('AddProperty')}
                activeOpacity={0.8}>
                <Text style={styles.emptyStateButtonText}>+ Add Property</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Leads Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>💬</Text>
              </View>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Recent Leads</Text>
                {stats.new_inquiries > 0 && (
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>
                      {stats.new_inquiries} New
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <AnimatedSeeAllButton
              onPress={() => navigation.navigate('Leads')}>
              <Text style={styles.viewAllText}>View All</Text>
              <Text style={styles.viewAllArrow}>›</Text>
            </AnimatedSeeAllButton>
          </View>
          {(recentInquiries?.length ?? 0) > 0 ? (
            <FlatList
              data={(recentInquiries ?? []).slice(0, 4)}
              renderItem={({item, index}: {item: RecentInquiry; index: number}) => (
                <AnimatedInquiryCard item={item} index={index} navigation={navigation} />
              )}
              keyExtractor={(item: RecentInquiry) => String(item.id)}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <Text style={styles.emptyStateIcon}>💬</Text>
              </View>
              <Text style={styles.emptyStateTitle}>No New Leads</Text>
              <Text style={styles.emptyStateText}>
                You'll see leads here when buyers view your contact
              </Text>
            </View>
          )}
        </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Clean off-white background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 22,
    color: colors.secondary, // Navy heading
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: '#6B7280', // Refined gray
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.lg,
    ...typography.body,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl, // Minimal top padding since header starts hidden
    paddingBottom: spacing.xxl,
  },
  sellerHeaderContainer: {
    marginBottom: spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  sellerHeaderBox: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.xl + spacing.md,
    minHeight: 180,
    justifyContent: 'space-between',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sellerHeaderContent: {
    marginBottom: spacing.lg,
    zIndex: 1,
  },
  sellerGreeting: {
    fontSize: 26,
    color: '#1D242B',
    fontWeight: '700',
    marginBottom: spacing.xs,
    lineHeight: 34,
  },
  sellerSubtitle: {
    ...typography.body,
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 22,
  },
  addPropertyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  addPropertyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 180, // Ensure equal height for all stat cards
    justifyContent: 'flex-start',
  },
  statCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E3F6FF', // Light blue background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statIcon: {
    fontSize: 22,
  },
  statNumber: {
    fontSize: 32,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: spacing.xs,
    lineHeight: 40,
  },
  statLabel: {
    ...typography.caption,
    color: '#6B7280', // Refined gray
    fontSize: 12,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5', // Light green tint
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  activeBadgeText: {
    ...typography.caption,
    color: '#059669', // Green text
    fontSize: 11,
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: '#FEE2E2', // Light red tint
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  newBadgeText: {
    ...typography.caption,
    color: '#DC2626', // Red text
    fontSize: 11,
    fontWeight: '600',
  },
  statusPills: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusPill: {
    backgroundColor: '#E3F6FF', // Light blue
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
  },
  statusPillRent: {
    backgroundColor: '#FEF3C7', // Light orange tint
  },
  statusPillText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 130,
    justifyContent: 'center',
  },
  quickActionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E3F6FF', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  quickActionIcon: {
    fontSize: 20,
  },
  quickActionTitle: {
    ...typography.body,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontSize: 14,
  },
  quickActionDescription: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  section: {
    marginBottom: spacing.xl + spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm + 2,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E3F6FF', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    lineHeight: 26,
  },
  sectionBadge: {
    backgroundColor: '#FEE2E2', // Light red tint
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: spacing.xs,
  },
  sectionBadgeText: {
    ...typography.caption,
    color: '#DC2626', // Red text
    fontSize: 11,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: '#E3F6FF', // Light blue
    gap: spacing.xs,
  },
  viewAllText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  viewAllArrow: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
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
    maxWidth: '100%',
  },
  propertyImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    backgroundColor: '#F3F4F6',
  },
  propertyImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyImagePlaceholderText: {
    fontSize: 44,
    opacity: 0.4,
  },
  propertyCardContent: {
    padding: spacing.lg,
  },
  propertyCardHeader: {
    marginBottom: spacing.sm,
  },
  propertyBadgeContainer: {
    marginBottom: spacing.sm,
  },
  propertyStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: 20,
  },
  propertyStatusText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  propertyCardTitle: {
    fontSize: 18,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: spacing.xs,
    lineHeight: 24,
  },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  locationIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E3F6FF', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 10,
  },
  propertyCardLocation: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 13,
    flex: 1,
  },
  propertyCardStats: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
  },
  propertyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: '45%',
  },
  propertyStatIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#E3F6FF', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyStatIcon: {
    fontSize: 13,
  },
  propertyStatText: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },
  propertyCardPrice: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 28,
  },
  inquiryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inquiryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  inquiryAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  inquiryAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  inquiryAvatarText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  inquiryCardInfo: {
    flex: 1,
  },
  inquiryBuyerName: {
    ...typography.body,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '600',
    marginBottom: 3,
    fontSize: 15,
  },
  inquiryTime: {
    ...typography.caption,
    color: '#9CA3AF',
    fontSize: 12,
  },
  inquiryPropertyTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    fontSize: 14,
  },
  inquiryMessage: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl + spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: spacing.md,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#E3F6FF', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 36,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyStateText: {
    ...typography.body,
    color: '#6B7280',
    marginBottom: spacing.lg,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default SellerDashboardScreen;
