import React, {useState, useEffect, useRef} from 'react';
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
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BuilderTabParamList} from '../../components/navigation/BuilderTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuilderHeader from '../../components/BuilderHeader';
import {sellerService, DashboardStats} from '../../services/seller.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type BuilderDashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuilderTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<any>
>;

type Props = {
  navigation: BuilderDashboardScreenNavigationProp;
};

interface RecentProperty {
  id: number | string;
  title: string;
  location: string;
  price: number;
  status: 'sale' | 'rent';
  project_type?: 'upcoming' | null;
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

const BuilderDashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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

  useEffect(() => {
    // Builder uses same API as agent
    if (user && (user.user_type === 'agent' || (user as any).user_type === 'builder')) {
      loadDashboardData();
    
      // Auto-refresh every 10 seconds
      refreshIntervalRef.current = setInterval(() => {
        loadDashboardData(false); // Silent refresh
      }, 10000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [user]);

  const loadDashboardData = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Builder uses same API endpoints as agent
      // Try to get stats from API, but we'll calculate from properties if not available
      let apiStats: DashboardStats | null = null;
      try {
        const statsResponse: any = await sellerService.getDashboardStats();
        
        if (statsResponse && statsResponse.success && statsResponse.data) {
          apiStats = statsResponse.data;
          setRecentInquiries(statsResponse.data.recent_inquiries || []);
        }
      } catch (statsError: any) {
        // If dashboard stats endpoint doesn't exist (404), we'll calculate from properties
        if (statsError?.status !== 404 && statsError?.response?.status !== 404) {
          console.warn('[BuilderDashboard] Error loading API stats:', statsError);
        }
      }

      // Load all properties to calculate dynamic stats
      const propertiesResponse = await sellerService.getProperties({
        page: 1,
        limit: 100, // Get all properties for stats calculation
      });

      const response = propertiesResponse as any;
      if (response && response.success && response.data) {
        const properties = response.data.properties || response.data || [];
        
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
        const formattedProperties: RecentProperty[] = properties.slice(0, 3).map((prop: any) => ({
          id: prop.id || prop.property_id,
          title: prop.title || prop.property_title || 'Untitled Project',
          location: prop.location || prop.city || 'Location not specified',
          price: parseFloat(prop.price) || 0,
          status: prop.status === 'rent' ? 'rent' : 'sale',
          project_type: prop.project_type === 'upcoming' ? 'upcoming' : null,
          cover_image: fixImageUrl(prop.cover_image || prop.image || prop.images?.[0]) || undefined,
          views: prop.views || prop.view_count || prop.views_count || 0,
          inquiries: prop.inquiries || prop.inquiry_count || 0,
        }));
        setRecentProperties(formattedProperties);
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
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(false);
  };

  const renderProjectCard = ({item}: {item: RecentProperty}) => {
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
          style={styles.projectCard}
          onPress={() =>
            navigation.navigate('PropertyDetails', {propertyId: String(item.id)})
          }>
          {imageUrl ? (
            <Image
              source={{uri: imageUrl}}
              style={styles.projectImage}
              resizeMode="cover"
              onError={(error) => {
                console.error(`[BuilderDashboard] Image load error for project ${item.id}:`, {
                  uri: imageUrl,
                  error: error.nativeEvent?.error || 'Unknown error',
                });
              }}
              onLoadStart={() => {
                console.log(`[BuilderDashboard] Loading image for project ${item.id}:`, imageUrl);
              }}
              onLoadEnd={() => {
                console.log(`[BuilderDashboard] Image loaded successfully for project ${item.id}`);
              }}
            />
          ) : (
            <View style={styles.projectImagePlaceholder}>
              <Text style={styles.projectImagePlaceholderText}>🏗️</Text>
            </View>
          )}
          <View style={styles.projectCardContent}>
            <View style={styles.projectBadgeContainer}>
              <View style={[styles.projectTypeBadge, {backgroundColor: colors.accent}]}>
                <Text style={styles.projectTypeText}>
                  {item.project_type === 'upcoming' ? 'Upcoming Project' : 'Active Project'}
                </Text>
              </View>
            </View>
            <Text style={styles.projectCardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.projectLocationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.projectCardLocation} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
            <View style={styles.projectStatsRow}>
              <View style={styles.projectStatItem}>
                <Text style={styles.projectStatIcon}>👁️</Text>
                <Text style={styles.projectStatText}>{item.views}</Text>
              </View>
              <View style={styles.projectStatItem}>
                <Text style={styles.projectStatIcon}>💬</Text>
                <Text style={styles.projectStatText}>{item.inquiries}</Text>
              </View>
            </View>
            <Text style={styles.projectCardPrice}>
              Starting from {formatters.price(item.price, item.status === 'rent')}
            </Text>
          </View>
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
            source={{uri: fixImageUrl(item.buyer_profile_image) || ''}}
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

  if (loading && !dashboardStats) {
    return (
      <View style={styles.container}>
        <BuilderHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={async () => {
            await logout();
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading builder dashboard...</Text>
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
      <BuilderHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
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
          {/* Builder Header */}
          <ImageBackground
            source={require('../../assets/sellproperty.jpg')}
            style={styles.builderHeader}
            imageStyle={styles.builderHeaderImage}>
            <View style={styles.builderHeaderOverlay}>
              <View style={styles.builderHeaderContent}>
                <Text style={styles.builderGreeting}>
                  Welcome, {user?.full_name?.split(' ')[0] || 'Builder'}!
                </Text>
                <Text style={styles.builderSubtitle}>
                  Manage your construction projects and track leads
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addProjectButton}
                onPress={() => navigation.navigate('AddProperty')}>
                <Text style={styles.addProjectButtonText}>+ New Project</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>

          {/* Statistics Cards (2x2 Grid) */}
          <View style={styles.statsGrid}>
            {/* Card 1: Total Projects */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Projects')}>
              <View style={styles.statCardIcon}>
                <Text style={styles.statIcon}>🏗️</Text>
              </View>
              <Text style={styles.statNumber}>{stats.total_properties}</Text>
              <Text style={styles.statLabel}>Total Projects</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>
                  {stats.active_properties} Active
                </Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Total Views */}
            <View style={styles.statCard}>
              <View style={styles.statCardIcon}>
                <Text style={styles.statIcon}>👁️</Text>
              </View>
              <Text style={styles.statNumber}>
                {formatters.formatNumber(stats.total_views)}
              </Text>
              <Text style={styles.statLabel}>Total Views</Text>
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

          {/* Recent Projects Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Projects</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Projects')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentProperties.length > 0 ? (
              <FlatList
                data={recentProperties}
                renderItem={renderProjectCard}
                keyExtractor={item => String(item.id)}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🏗️</Text>
                <Text style={styles.emptyStateText}>No Projects Listed</Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('AddProperty')}>
                  <Text style={styles.emptyStateButtonText}>Add Your First Project</Text>
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
  builderHeader: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    minHeight: 180,
  },
  builderHeaderImage: {
    borderRadius: borderRadius.xl,
  },
  builderHeaderOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: spacing.lg,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  builderHeaderContent: {
    marginBottom: spacing.md,
  },
  builderGreeting: {
    ...typography.h1,
    color: colors.surface,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  builderSubtitle: {
    ...typography.body,
    color: colors.surface,
    fontSize: 14,
    opacity: 0.9,
  },
  addProjectButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  addProjectButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
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
    fontWeight: '600',
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
  statusPills: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusPillRent: {
    backgroundColor: colors.secondary,
  },
  statusPillText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
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
    gap: spacing.sm,
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
  },
  sectionBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.accent + '30',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  projectImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  projectImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectImagePlaceholderText: {
    fontSize: 64,
    opacity: 0.5,
  },
  projectCardContent: {
    padding: spacing.md,
  },
  projectBadgeContainer: {
    marginBottom: spacing.sm,
  },
  projectTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  projectTypeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
  projectCardTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  projectLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationIcon: {
    fontSize: 14,
  },
  projectCardLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  projectStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  projectStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  projectStatIcon: {
    fontSize: 14,
  },
  projectStatText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  projectCardPrice: {
    ...typography.h3,
    color: colors.accent,
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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    backgroundColor: colors.accent,
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
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent + '30',
    borderStyle: 'dashed',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  emptyStateButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyStateButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
});

export default BuilderDashboardScreen;

