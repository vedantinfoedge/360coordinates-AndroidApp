import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {propertyService} from '../../services/property.service';
import {inquiryService} from '../../services/inquiry.service';
import {fixImageUrl} from '../../utils/imageHelper';

type SellerDashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<SellerTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SellerDashboardScreenNavigationProp;
};

interface Property {
  id: string;
  title: string;
  location: string;
  price: string;
  status: 'active' | 'pending' | 'sold';
  views: number;
  inquiries: number;
}

const SellerDashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeProperties: 0,
    pendingProperties: 0,
    soldProperties: 0,
    totalViews: 0,
    totalInquiries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load properties and inquiries in parallel
      const [propertiesResponse, inquiriesResponse] = await Promise.all([
        propertyService.getMyProperties(),
        inquiryService.getInbox(),
      ]);

      // Process properties
      if (propertiesResponse && propertiesResponse.success) {
        const propertiesData = propertiesResponse.data?.properties || propertiesResponse.data || [];
        
        const formattedProperties = propertiesData.slice(0, 5).map((prop: any) => ({
          id: prop.id?.toString() || prop.property_id?.toString() || '',
          title: prop.title || prop.property_title || 'Untitled Property',
          location: prop.location || prop.city || prop.address || 'Location not specified',
          price: typeof prop.price === 'number'
            ? `₹${prop.price.toLocaleString('en-IN')}${prop.status === 'rent' ? '/month' : ''}`
            : prop.price || 'Price not available',
          status: (prop.status === 'active' || prop.property_status === 'active') ? 'active' :
                  (prop.status === 'pending' || prop.property_status === 'pending') ? 'pending' :
                  (prop.status === 'sold' || prop.property_status === 'sold') ? 'sold' : 'active',
          views: prop.views || prop.view_count || 0,
          inquiries: prop.inquiries || prop.inquiry_count || 0,
        }));

        setRecentProperties(formattedProperties);

        // Calculate stats
        const total = propertiesData.length;
        const active = propertiesData.filter((p: any) => 
          p.status === 'active' || p.property_status === 'active'
        ).length;
        const pending = propertiesData.filter((p: any) => 
          p.status === 'pending' || p.property_status === 'pending'
        ).length;
        const sold = propertiesData.filter((p: any) => 
          p.status === 'sold' || p.property_status === 'sold'
        ).length;
        const totalViews = propertiesData.reduce((sum: number, p: any) => 
          sum + (p.views || p.view_count || 0), 0
        );

        setStats(prev => ({
          ...prev,
          totalProperties: total,
          activeProperties: active,
          pendingProperties: pending,
          soldProperties: sold,
          totalViews: totalViews,
        }));
      }

      // Process inquiries
      if (inquiriesResponse && inquiriesResponse.success) {
        const inquiries = inquiriesResponse.data?.inquiries || inquiriesResponse.data || [];
        setStats(prev => ({
          ...prev,
          totalInquiries: Array.isArray(inquiries) ? inquiries.length : 0,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const renderProperty = ({item}: {item: Property}) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() =>
        navigation.navigate('PropertyDetails', {propertyId: item.id})
      }>
      <View style={styles.propertyHeader}>
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle}>{item.title}</Text>
          <Text style={styles.propertyLocation}>{item.location}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'active'
                  ? colors.success
                  : item.status === 'pending'
                  ? colors.warning
                  : colors.textSecondary,
            },
          ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.propertyFooter}>
        <Text style={styles.propertyPrice}>{item.price}</Text>
        <View style={styles.propertyStats}>
          <Text style={styles.statText}>👁️ {item.views}</Text>
          <Text style={styles.statText}>💬 {item.inquiries}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onLogoutPress={async () => {
          await logout();
        }}
      />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Welcome back, {user?.name || 'Seller'}!
          </Text>
          <Text style={styles.subtitle}>Manage your properties</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Add Property Button */}
        <TouchableOpacity
          style={styles.addPropertyButton}
          onPress={() => navigation.navigate('AddProperty')}>
          <Text style={styles.addPropertyIcon}>➕</Text>
          <View style={styles.addPropertyTextContainer}>
            <Text style={styles.addPropertyTitle}>Add New Property</Text>
            <Text style={styles.addPropertySubtitle}>
              List your property and reach more buyers
            </Text>
          </View>
          <Text style={styles.addPropertyArrow}>→</Text>
        </TouchableOpacity>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalProperties}</Text>
            <Text style={styles.statLabel}>Total Properties</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, {color: colors.success}]}>
              {stats.activeProperties}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, {color: colors.warning}]}>
              {stats.pendingProperties}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatIcon}>👁️</Text>
            <View style={styles.quickStatInfo}>
              <Text style={styles.quickStatNumber}>{stats.totalViews}</Text>
              <Text style={styles.quickStatLabel}>Total Views</Text>
            </View>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatIcon}>💬</Text>
            <View style={styles.quickStatInfo}>
              <Text style={styles.quickStatNumber}>
                {stats.totalInquiries}
              </Text>
              <Text style={styles.quickStatLabel}>Inquiries</Text>
            </View>
          </View>
        </View>

        {/* Recent Properties */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Properties</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('MyProperties')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentProperties}
            renderItem={renderProperty}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('AddProperty')}>
              <Text style={styles.quickActionIcon}>➕</Text>
              <Text style={styles.quickActionText}>Add Property</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('MyProperties')}>
              <Text style={styles.quickActionIcon}>🏘️</Text>
              <Text style={styles.quickActionText}>My Properties</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Inquiries')}>
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Inquiries</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  addPropertyButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  addPropertyIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  addPropertyTextContainer: {
    flex: 1,
  },
  addPropertyTitle: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  addPropertySubtitle: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.8,
    fontSize: 12,
  },
  addPropertyArrow: {
    fontSize: 24,
    color: colors.surface,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
  },
  quickStatsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickStatIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  quickStatInfo: {
    flex: 1,
  },
  quickStatNumber: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  quickStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  seeAllText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  propertyInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  propertyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  propertyLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
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
    fontSize: 10,
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  propertyPrice: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  propertyStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  quickActionText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default SellerDashboardScreen;
