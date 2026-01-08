import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {sellerService, DashboardStats} from '../../services/seller.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';

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
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 60 seconds
    refreshIntervalRef.current = setInterval(() => {
      loadDashboardData(false); // Silent refresh
    }, 60000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const loadDashboardData = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Load dashboard stats
      const statsResponse = await sellerService.getDashboardStats();
      
      if (statsResponse.success && statsResponse.data) {
        setDashboardStats(statsResponse.data);
        setRecentInquiries(statsResponse.data.recent_inquiries || []);
      }

      // Load recent properties (first 3)
      const propertiesResponse = await sellerService.getProperties({
        page: 1,
        limit: 3,
      });

      if (propertiesResponse.success && propertiesResponse.data) {
        const properties = propertiesResponse.data.properties || propertiesResponse.data || [];
        const formattedProperties: RecentProperty[] = properties.slice(0, 3).map((prop: any) => ({
          id: prop.id || prop.property_id,
          title: prop.title || prop.property_title || 'Untitled Property',
          location: prop.location || prop.city || 'Location not specified',
          price: parseFloat(prop.price) || 0,
          status: prop.status === 'rent' ? 'rent' : 'sale',
          cover_image: prop.cover_image || prop.image || prop.images?.[0],
          views: prop.views || prop.view_count || 0,
          inquiries: prop.inquiries || prop.inquiry_count || 0,
        }));
        setRecentProperties(formattedProperties);
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      if (showLoading) {
        Alert.alert('Error', error?.message || 'Failed to load dashboard data');
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

  const renderPropertyCard = ({item}: {item: RecentProperty}) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() =>
        navigation.navigate('PropertyDetails', {propertyId: item.id})
      }>
      {item.cover_image && (
        <Image
          source={{uri: fixImageUrl(item.cover_image)}}
          style={styles.propertyImage}
        />
      )}
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
    </TouchableOpacity>
  );

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

  if (loading && !dashboardStats) {
    return (
      <View style={styles.container}>
        <SellerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support' as never)}
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
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.greeting}>
              Welcome back, {user?.name || 'Seller'}!
            </Text>
            <Text style={styles.subtitle}>
              Here's what's happening with your properties today
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addPropertyButton}
            onPress={() => navigation.navigate('AddProperty')}>
            <Text style={styles.addPropertyButtonText}>Add Property</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Cards (2x2 Grid) */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Properties */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('MyProperties')}>
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
            onPress={() => navigation.navigate('AddProperty')}>
            <Text style={styles.quickActionIcon}>➕</Text>
            <Text style={styles.quickActionTitle}>Add New Property</Text>
            <Text style={styles.quickActionDescription}>
              List a new property for sale or rent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('MyProperties')}>
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
              onPress={() => navigation.navigate('MyProperties')}>
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
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  addPropertyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addPropertyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
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
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
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
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
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
  },
  propertyImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
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
    gap: spacing.xs,
  },
  locationIcon: {
    fontSize: 12,
  },
  propertyCardLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  propertyCardStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  propertyStatText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
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
