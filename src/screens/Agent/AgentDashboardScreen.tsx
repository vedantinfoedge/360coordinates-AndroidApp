import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import SearchBar from '../../components/SearchBar';
import PropertyCard from '../../components/PropertyCard';
import ProjectCard from '../../components/ProjectCard';
import {propertyService} from '../../services/property.service';
import {inquiryService} from '../../services/inquiry.service';
import {fixImageUrl} from '../../utils/imageHelper';

type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
> & {
  navigate: (screen: string, params?: any) => void;
};

type Props = {
  navigation: DashboardScreenNavigationProp;
};

const DashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [searchType, setSearchType] = useState<'buy' | 'rent'>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [upcomingProjects, setUpcomingProjects] = useState<any[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'buyer':
        return 'Buyer / Tenant';
      case 'seller':
        return 'Seller / Owner';
      case 'agent':
        return 'Agent / Builder';
      default:
        return 'User';
    }
  };

  const getGreeting = () => {
    if (user) {
      return `Hello, ${user.full_name || 'User'}`;
    }
    return 'Welcome to PropertyApp';
  };

  // Load properties for buyer view
  useEffect(() => {
    if (user?.role === 'buyer') {
      loadBuyerProperties();
      loadBuyerProjects();
    }
  }, [user?.role, searchType]);

  const loadBuyerProperties = async () => {
    try {
      setPropertiesLoading(true);
      const response = await propertyService.getProperties({
        status: 'approved',
        limit: 10,
        property_type: searchType === 'buy' ? 'sale' : 'rent',
      });
      
      if (response && response.success) {
        const propertiesData = response.data?.properties || response.data || [];
        const formatted = propertiesData.map((prop: any) => ({
          id: prop.id?.toString() || prop.property_id?.toString() || '',
          name: prop.title || prop.property_title || 'Untitled Property',
          location: prop.location || prop.city || 'Location not specified',
          price: typeof prop.price === 'number'
            ? `₹${prop.price.toLocaleString('en-IN')}${prop.status === 'rent' ? '/month' : ''}`
            : prop.price || 'Price not available',
          type: (prop.status === 'sale' || prop.property_status === 'sale') ? 'buy' : 'rent',
        }));
        setFeaturedProperties(formatted);
      }
    } catch (error) {
      console.error('Error loading buyer properties:', error);
      setFeaturedProperties([]);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const loadBuyerProjects = async () => {
    try {
      const response = await propertyService.getProperties({
        status: 'approved',
        limit: 5,
        sort_by: 'newest',
      });
      
      if (response && response.success) {
        const propertiesData = response.data?.properties || response.data || [];
        const formatted = propertiesData.map((prop: any) => ({
          id: prop.id?.toString() || prop.property_id?.toString() || '',
          name: prop.title || prop.property_title || 'Untitled Property',
          city: prop.city || prop.location || 'Location not specified',
        }));
        setUpcomingProjects(formatted);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setUpcomingProjects([]);
    }
  };

  // Filter properties based on selected type
  const filteredProperties = featuredProperties.filter(
    p => p.type === searchType,
  );

  // If user is buyer, show new Buyer Home Page
  if (user?.role === 'buyer') {
    return (
      <View style={styles.buyerContainer}>
        {/* Custom Header */}
        <AgentHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onLogoutPress={logout}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              {user ? `Hello, ${(user.full_name || '').split(' ')[0]}` : 'Welcome'}
            </Text>
            <Text style={styles.welcomeSubtext}>
              Find your dream property in India
            </Text>
          </View>

          {/* Buy/Rent Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                searchType === 'buy' && styles.toggleButtonActive,
              ]}
              onPress={() => setSearchType('buy')}>
              <Text
                style={[
                  styles.toggleText,
                  searchType === 'buy' && styles.toggleTextActive,
                ]}>
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                searchType === 'rent' && styles.toggleButtonActive,
              ]}
              onPress={() => setSearchType('rent')}>
              <Text
                style={[
                  styles.toggleText,
                  searchType === 'rent' && styles.toggleTextActive,
                ]}>
                Rent
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <SearchBar
            placeholder="Search by city, locality, project"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSearchPress={() => {
              // Handle search
            }}
          />

          {/* Quick Filters */}
          <View style={styles.quickFiltersSection}>
            <Text style={styles.sectionTitleSmall}>Quick Filters</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickFiltersContainer}>
              {['Apartments', 'Villas', 'Plots', 'Commercial', 'PG/Hostel'].map(
                (filter, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickFilterChip}>
                    <Text style={styles.quickFilterText}>{filter}</Text>
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          </View>

          {/* Featured Properties Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Properties</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('PropertyList')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.horizontalScrollContainer}>
              <FlatList
                data={filteredProperties}
                renderItem={({item}) => (
                  <PropertyCard
                    name={item.name}
                    location={item.location}
                    price={item.price}
                    type={item.type}
                    onPress={() =>
                      navigation.navigate('PropertyDetails', {propertyId: item.id})
                    }
                  />
                )}
                keyExtractor={item => item.id}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                scrollEnabled={true}
                bounces={false}
                decelerationRate="fast"
                snapToInterval={296}
                snapToAlignment="start"
              />
            </View>
          </View>

          {/* Upcoming Projects Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Projects</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.horizontalScrollContainer}>
              <FlatList
                data={upcomingProjects}
                renderItem={({item}) => (
                  <ProjectCard
                    name={item.name}
                    city={item.city}
                    onPress={() => {
                      // Handle project press
                    }}
                  />
                )}
                keyExtractor={item => item.id}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                scrollEnabled={true}
                bounces={false}
                decelerationRate="fast"
                snapToInterval={276}
                snapToAlignment="start"
              />
            </View>
          </View>

          {/* Bottom padding for tab bar */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    );
  }

  // Seller Dashboard
  if (user?.role === 'seller') {
    // Dummy data for seller dashboard
    const sellerProperties = [
      {
        id: '1',
        name: 'Villa in Lonavala',
        location: 'Lonavala, Maharashtra',
        price: '₹2.5 Cr',
        image: '🏡',
      },
      {
        id: '2',
        name: '3BHK Apartment',
        location: 'Mumbai, Maharashtra',
        price: '₹1.8 Cr',
        image: '🏢',
      },
    ];

    const recentInquiries = [
      {
        id: '1',
        name: 'Tejas Vilas KUMBHARKAR',
        time: '9h ago',
        property: 'Villa in Lonavala',
        avatar: '👤',
      },
      {
        id: '2',
        name: 'Rajesh Kumar',
        time: '2d ago',
        property: '3BHK Apartment',
        avatar: '👤',
      },
    ];

    return (
      <View style={styles.sellerContainer}>
        {/* Custom Header */}
        <AgentHeader
          onProfilePress={() => (navigation as any).navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onLogoutPress={logout}
        />
        <ScrollView
          style={styles.sellerScrollView}
          showsVerticalScrollIndicator={false}>
          {/* Welcome Banner */}
          <View style={styles.sellerWelcomeBanner}>
          <View style={styles.sellerWelcomeContent}>
            <Text style={styles.sellerWelcomeText}>
              Welcome back, {(user.full_name || '').split(' ')[0]}! 👋
            </Text>
            <Text style={styles.sellerWelcomeSubtext}>
              Here's what's happening with your properties today
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sellerAddPropertyButton}
            onPress={() => (navigation as any).navigate('AddProperty')}>
            <Text style={styles.sellerAddPropertyIcon}>+</Text>
            <Text style={styles.sellerAddPropertyText}>Add Property</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.sellerSummaryCards}>
          {/* Total Properties Card */}
          <View style={[styles.sellerSummaryCard, styles.sellerSummaryCardPrimary]}>
            <View style={styles.sellerSummaryCardContent}>
              <Text style={styles.sellerSummaryIcon}>🏠</Text>
              <View style={styles.sellerSummaryInfo}>
                <Text style={[styles.sellerSummaryLabel, styles.sellerSummaryLabelPrimary]}>
                  Total Properties
                </Text>
                <Text style={[styles.sellerSummaryNumber, styles.sellerSummaryNumberPrimary]}>
                  2
                </Text>
              </View>
            </View>
            <View style={[styles.sellerBadgeActive, {backgroundColor: 'rgba(255, 255, 255, 0.3)'}]}>
              <Text style={[styles.sellerBadgeText, {color: colors.surface}]}>ACTIVE</Text>
            </View>
          </View>

          {/* People Showed Interest Card */}
          <View style={styles.sellerSummaryCard}>
            <View style={styles.sellerSummaryCardContent}>
              <Text style={styles.sellerSummaryIcon}>👁️</Text>
              <View style={styles.sellerSummaryInfo}>
                <Text style={styles.sellerSummaryLabel}>People Showed Interest</Text>
                <Text style={styles.sellerSummaryNumber}>167</Text>
                <Text style={styles.sellerSummaryDescription}>
                  167 people have viewed your properties
                </Text>
              </View>
            </View>
            <View style={styles.sellerBadgeSuccess}>
              <Text style={styles.sellerBadgeText}>Active ↑</Text>
            </View>
          </View>

          {/* Total Inquiries Card */}
          <View style={styles.sellerSummaryCard}>
            <View style={styles.sellerSummaryCardContent}>
              <Text style={styles.sellerSummaryIcon}>💬</Text>
              <View style={styles.sellerSummaryInfo}>
                <Text style={styles.sellerSummaryLabel}>Total Inquiries</Text>
                <Text style={styles.sellerSummaryNumber}>2</Text>
              </View>
            </View>
            <View style={styles.sellerBadgeWarning}>
              <Text style={styles.sellerBadgeText}>2 NEW</Text>
            </View>
          </View>

          {/* Listing Status Card */}
          <View style={styles.sellerSummaryCard}>
            <View style={styles.sellerSummaryCardContent}>
              <Text style={styles.sellerSummaryIcon}>⭐</Text>
              <View style={styles.sellerSummaryInfo}>
                <Text style={styles.sellerSummaryLabel}>Listing Status</Text>
                <View style={styles.sellerStatusBadges}>
                  <View style={styles.sellerStatusBadge}>
                    <Text style={styles.sellerStatusBadgeText}>2 Sale</Text>
                  </View>
                  <View style={[styles.sellerStatusBadge, styles.sellerStatusBadgeInactive]}>
                    <Text style={[styles.sellerStatusBadgeText, styles.sellerStatusBadgeTextInactive]}>
                      0 Rent
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sellerQuickActionsSection}>
          <Text style={styles.sellerSectionTitle}>Quick Actions</Text>
          <View style={styles.sellerQuickActionsGrid}>
            <TouchableOpacity
              style={styles.sellerQuickActionCard}
              onPress={() => (navigation as any).navigate('AddProperty')}>
              <Text style={styles.sellerQuickActionIcon}>➕</Text>
              <Text style={styles.sellerQuickActionTitle}>Add New Property</Text>
              <Text style={styles.sellerQuickActionSubtitle}>
                List a new property for sale or rent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sellerQuickActionCard}
              onPress={() => (navigation as any).navigate('MyProperties')}>
              <Text style={styles.sellerQuickActionIcon}>✏️</Text>
              <Text style={styles.sellerQuickActionTitle}>Manage Properties</Text>
              <Text style={styles.sellerQuickActionSubtitle}>
                Edit, update or remove listings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sellerQuickActionCard}
              onPress={() => (navigation as any).navigate('Inquiries')}>
              <Text style={styles.sellerQuickActionIcon}>💬</Text>
              <Text style={styles.sellerQuickActionTitle}>View Inquiries</Text>
              <Text style={styles.sellerQuickActionSubtitle}>
                Respond to buyer inquiries
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sellerQuickActionCard}
              onPress={() => (navigation as any).navigate('Profile')}>
              <Text style={styles.sellerQuickActionIcon}>👤</Text>
              <Text style={styles.sellerQuickActionTitle}>Update Profile</Text>
              <Text style={styles.sellerQuickActionSubtitle}>
                Manage your account settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Your Properties Section */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerSectionHeader}>
            <Text style={styles.sellerSectionTitle}>Your Properties</Text>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('MyProperties')}>
              <Text style={styles.sellerSeeAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sellerHorizontalScrollContainer}>
            <FlatList
              data={sellerProperties}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.sellerPropertyCard}
                  onPress={() =>
                    (navigation as any).navigate('PropertyDetails', {
                      propertyId: item.id,
                    })
                  }>
                  <View style={styles.sellerPropertyImage}>
                    <Text style={styles.sellerPropertyImageIcon}>{item.image}</Text>
                  </View>
                  <View style={styles.sellerPropertyInfo}>
                    <Text style={styles.sellerPropertyName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.sellerPropertyLocation} numberOfLines={1}>
                      {item.location}
                    </Text>
                    <Text style={styles.sellerPropertyPrice}>{item.price}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sellerHorizontalList}
            />
          </View>
        </View>

        {/* Recent Inquiries Section */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerSectionHeader}>
            <View style={styles.sellerSectionTitleWithBadge}>
              <Text style={styles.sellerSectionTitle}>Recent Inquiries</Text>
              <View style={styles.sellerInquiryBadge}>
                <Text style={styles.sellerInquiryBadgeText}>2</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('Inquiries')}>
              <Text style={styles.sellerSeeAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          {recentInquiries.map(inquiry => (
            <TouchableOpacity
              key={inquiry.id}
              style={styles.sellerInquiryItem}
              onPress={() => (navigation as any).navigate('Inquiries')}>
              <View style={styles.sellerInquiryAvatar}>
                <Text style={styles.sellerInquiryAvatarText}>{inquiry.avatar}</Text>
              </View>
              <View style={styles.sellerInquiryInfo}>
                <Text style={styles.sellerInquiryName}>{inquiry.name}</Text>
                <Text style={styles.sellerInquiryProperty}>{inquiry.property}</Text>
              </View>
              <Text style={styles.sellerInquiryTime}>{inquiry.time}</Text>
            </TouchableOpacity>
          ))}
        </View>

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    );
  }

  // Agent Dashboard (similar to seller)
  if (user?.role === 'agent') {
    const [agentProperties, setAgentProperties] = useState<any[]>([]);
    const [agentStats, setAgentStats] = useState({
      totalListings: 0,
      totalViews: 0,
      totalInquiries: 0,
      activeListings: 0,
      pendingListings: 0,
    });
    const [recentInquiries, setRecentInquiries] = useState<any[]>([]);
    const [agentLoading, setAgentLoading] = useState(true);

    useEffect(() => {
      if (user?.role === 'agent') {
        loadAgentDashboardData();
      }
    }, [user?.role]);

    const loadAgentDashboardData = async () => {
      try {
        setAgentLoading(true);
        const [propertiesResponse, inquiriesResponse] = await Promise.all([
          propertyService.getMyProperties(),
          inquiryService.getInbox(),
        ]);

        // Process properties
        if (propertiesResponse && propertiesResponse.success) {
          const propertiesData = propertiesResponse.data?.properties || propertiesResponse.data || [];
          
          const formatted = propertiesData.slice(0, 5).map((prop: any) => ({
            id: prop.id?.toString() || prop.property_id?.toString() || '',
            name: prop.title || prop.property_title || 'Untitled Property',
            location: prop.location || prop.city || 'Location not specified',
            price: typeof prop.price === 'number'
              ? `₹${prop.price.toLocaleString('en-IN')}${prop.status === 'rent' ? '/month' : ''}`
              : prop.price || 'Price not available',
            image: fixImageUrl(prop.cover_image || prop.image || ''),
          }));

          setAgentProperties(formatted);

          // Calculate stats
          const total = propertiesData.length;
          const active = propertiesData.filter((p: any) => 
            p.status === 'active' || p.property_status === 'active'
          ).length;
          const pending = propertiesData.filter((p: any) => 
            p.status === 'pending' || p.property_status === 'pending'
          ).length;
          const totalViews = propertiesData.reduce((sum: number, p: any) => 
            sum + (p.views || p.view_count || 0), 0
          );

          setAgentStats({
            totalListings: total,
            totalViews: totalViews,
            activeListings: active,
            pendingListings: pending,
            totalInquiries: 0, // Will be set from inquiries
          });
        }

        // Process inquiries
        if (inquiriesResponse && inquiriesResponse.success) {
          const inquiries = inquiriesResponse.data?.inquiries || inquiriesResponse.data || [];
          
          const formattedInquiries = inquiries.slice(0, 5).map((inq: any) => {
            let time = 'Just now';
            if (inq.created_at || inq.timestamp) {
              const date = new Date(inq.created_at || inq.timestamp);
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);
              
              if (diffHours < 1) time = 'Just now';
              else if (diffHours < 24) time = `${diffHours}h ago`;
              else if (diffDays === 1) time = 'Yesterday';
              else if (diffDays < 7) time = `${diffDays}d ago`;
              else time = date.toLocaleDateString();
            }

            return {
              id: inq.id?.toString() || inq.inquiry_id?.toString() || '',
              name: inq.sender_name || inq.buyer_name || 'Buyer',
              time,
              property: inq.property_title || inq.property_name || 'Property',
              avatar: '👤',
            };
          });

          setRecentInquiries(formattedInquiries);
          setAgentStats(prev => ({
            ...prev,
            totalInquiries: Array.isArray(inquiries) ? inquiries.length : 0,
          }));
        }
      } catch (error) {
        console.error('Error loading agent dashboard:', error);
        setAgentProperties([]);
        setRecentInquiries([]);
      } finally {
        setAgentLoading(false);
      }
    };

    return (
      <View style={styles.sellerContainer}>
        {/* Custom Header */}
        <AgentHeader
          onProfilePress={() => (navigation as any).navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onLogoutPress={logout}
        />
        <ScrollView
          style={styles.sellerScrollView}
          showsVerticalScrollIndicator={false}>
          {/* Welcome Banner */}
          <View style={styles.sellerWelcomeBanner}>
            <View style={styles.sellerWelcomeContent}>
              <Text style={styles.sellerWelcomeText}>
                Welcome back, {(user.full_name || '').split(' ')[0]}! 👋
              </Text>
              <Text style={styles.sellerWelcomeSubtext}>
                Here's what's happening with your listings today
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sellerAddPropertyButton}
              onPress={() => (navigation as any).navigate('AddProperty')}>
              <Text style={styles.sellerAddPropertyIcon}>+</Text>
              <Text style={styles.sellerAddPropertyText}>Add Property</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          <View style={styles.sellerSummaryCards}>
            {/* Total Listings Card */}
            <View style={[styles.sellerSummaryCard, styles.sellerSummaryCardPrimary]}>
              <View style={styles.sellerSummaryCardContent}>
                <Text style={styles.sellerSummaryIcon}>📋</Text>
                <View style={styles.sellerSummaryInfo}>
                  <Text style={[styles.sellerSummaryLabel, styles.sellerSummaryLabelPrimary]}>
                    Total Listings
                  </Text>
                  <Text style={[styles.sellerSummaryNumber, styles.sellerSummaryNumberPrimary]}>
                    {agentStats.totalListings}
                  </Text>
                </View>
              </View>
              <View style={[styles.sellerBadgeActive, {backgroundColor: 'rgba(255, 255, 255, 0.3)'}]}>
                <Text style={[styles.sellerBadgeText, {color: colors.surface}]}>ACTIVE</Text>
              </View>
            </View>

            {/* People Showed Interest Card */}
            <View style={styles.sellerSummaryCard}>
              <View style={styles.sellerSummaryCardContent}>
                <Text style={styles.sellerSummaryIcon}>👁️</Text>
                <View style={styles.sellerSummaryInfo}>
                  <Text style={styles.sellerSummaryLabel}>People Showed Interest</Text>
                  <Text style={styles.sellerSummaryNumber}>{agentStats.totalViews}</Text>
                  <Text style={styles.sellerSummaryDescription}>
                    {agentStats.totalViews} people have viewed your listings
                  </Text>
                </View>
              </View>
              <View style={styles.sellerBadgeSuccess}>
                <Text style={styles.sellerBadgeText}>Active ↑</Text>
              </View>
            </View>

            {/* Total Inquiries Card */}
            <View style={styles.sellerSummaryCard}>
              <View style={styles.sellerSummaryCardContent}>
                <Text style={styles.sellerSummaryIcon}>💬</Text>
                <View style={styles.sellerSummaryInfo}>
                  <Text style={styles.sellerSummaryLabel}>Total Inquiries</Text>
                  <Text style={styles.sellerSummaryNumber}>{agentStats.totalInquiries}</Text>
                </View>
              </View>
              <View style={styles.sellerBadgeWarning}>
                <Text style={styles.sellerBadgeText}>
                  {agentStats.totalInquiries > 0 ? `${agentStats.totalInquiries} NEW` : '0 NEW'}
                </Text>
              </View>
            </View>

            {/* Listing Status Card */}
            <View style={styles.sellerSummaryCard}>
              <View style={styles.sellerSummaryCardContent}>
                <Text style={styles.sellerSummaryIcon}>⭐</Text>
                <View style={styles.sellerSummaryInfo}>
                  <Text style={styles.sellerSummaryLabel}>Listing Status</Text>
                  <View style={styles.sellerStatusBadges}>
                    <View style={styles.sellerStatusBadge}>
                      <Text style={styles.sellerStatusBadgeText}>{agentStats.activeListings} Active</Text>
                    </View>
                    <View style={[styles.sellerStatusBadge, styles.sellerStatusBadgeInactive]}>
                      <Text style={[styles.sellerStatusBadgeText, styles.sellerStatusBadgeTextInactive]}>
                        {agentStats.pendingListings} Pending
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.sellerQuickActionsSection}>
            <Text style={styles.sellerSectionTitle}>Quick Actions</Text>
            <View style={styles.sellerQuickActionsGrid}>
              <TouchableOpacity
                style={styles.sellerQuickActionCard}
                onPress={() => (navigation as any).navigate('AddProperty')}>
                <Text style={styles.sellerQuickActionIcon}>➕</Text>
                <Text style={styles.sellerQuickActionTitle}>Add New Property</Text>
                <Text style={styles.sellerQuickActionSubtitle}>
                  List a new property for sale or rent
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sellerQuickActionCard}
                onPress={() => (navigation as any).navigate('Listings')}>
                <Text style={styles.sellerQuickActionIcon}>📋</Text>
                <Text style={styles.sellerQuickActionTitle}>View Listings</Text>
                <Text style={styles.sellerQuickActionSubtitle}>
                  Manage all your property listings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sellerQuickActionCard}
                onPress={() => (navigation as any).navigate('Inquiries')}>
                <Text style={styles.sellerQuickActionIcon}>💬</Text>
                <Text style={styles.sellerQuickActionTitle}>View Inquiries</Text>
                <Text style={styles.sellerQuickActionSubtitle}>
                  Respond to buyer inquiries
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sellerQuickActionCard}
                onPress={() => (navigation as any).navigate('Profile')}>
                <Text style={styles.sellerQuickActionIcon}>👤</Text>
                <Text style={styles.sellerQuickActionTitle}>Update Profile</Text>
                <Text style={styles.sellerQuickActionSubtitle}>
                  Manage your account settings
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Your Listings Section */}
          <View style={styles.sellerSection}>
            <View style={styles.sellerSectionHeader}>
              <Text style={styles.sellerSectionTitle}>Your Listings</Text>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('Listings')}>
                <Text style={styles.sellerSeeAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            {agentLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading properties...</Text>
              </View>
            ) : agentProperties.length > 0 ? (
              <View style={styles.sellerHorizontalScrollContainer}>
                <FlatList
                  data={agentProperties}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.sellerPropertyCard}
                      onPress={() =>
                        (navigation as any).navigate('PropertyDetails', {
                          propertyId: item.id,
                        })
                      }>
                      {item.image && item.image !== '🏢' && item.image !== '🏡' ? (
                        <Image source={{uri: item.image}} style={styles.sellerPropertyImage} />
                      ) : (
                        <View style={styles.sellerPropertyImage}>
                          <Text style={styles.sellerPropertyImageIcon}>🏠</Text>
                        </View>
                      )}
                      <View style={styles.sellerPropertyInfo}>
                        <Text style={styles.sellerPropertyName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.sellerPropertyLocation} numberOfLines={1}>
                          {item.location}
                        </Text>
                        <Text style={styles.sellerPropertyPrice}>{item.price}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  keyExtractor={item => item.id}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sellerHorizontalList}
                />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No properties listed yet</Text>
              </View>
            )}
          </View>

          {/* Recent Inquiries Section */}
          <View style={styles.sellerSection}>
            <View style={styles.sellerSectionHeader}>
                <View style={styles.sellerSectionTitleWithBadge}>
                <Text style={styles.sellerSectionTitle}>Recent Inquiries</Text>
                {agentStats.totalInquiries > 0 && (
                  <View style={styles.sellerInquiryBadge}>
                    <Text style={styles.sellerInquiryBadgeText}>{agentStats.totalInquiries}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('Inquiries')}>
                <Text style={styles.sellerSeeAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            {recentInquiries.length > 0 ? (
              recentInquiries.map(inquiry => (
              <TouchableOpacity
                key={inquiry.id}
                style={styles.sellerInquiryItem}
                onPress={() => (navigation as any).navigate('Inquiries')}>
                <View style={styles.sellerInquiryAvatar}>
                  <Text style={styles.sellerInquiryAvatarText}>{inquiry.avatar}</Text>
                </View>
                <View style={styles.sellerInquiryInfo}>
                  <Text style={styles.sellerInquiryName}>{inquiry.name}</Text>
                  <Text style={styles.sellerInquiryProperty}>{inquiry.property}</Text>
                </View>
                <Text style={styles.sellerInquiryTime}>{inquiry.time}</Text>
              </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No inquiries yet</Text>
              </View>
            )}
          </View>

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    );
  }

  // Default dashboard for other roles
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        {user && (
          <Text style={styles.roleText}>Role: {getRoleLabel(user.role)}</Text>
        )}
        <Text style={styles.subtitle}>Manage your listings</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>150+</Text>
          <Text style={styles.statLabel}>Properties</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>50+</Text>
          <Text style={styles.statLabel}>Agents</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>200+</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('PropertyList')}>
          <Text style={styles.actionButtonText}>Browse Properties</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => (navigation as any).navigate('AddProperty')}>
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Add Property
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => (navigation as any).navigate('Profile')}>
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            View Profile
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Properties</Text>
        <View style={styles.propertyCard}>
          <View style={styles.propertyImagePlaceholder}>
            <Text style={styles.placeholderText}>Property Image</Text>
          </View>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle}>Modern Apartment</Text>
            <Text style={styles.propertyLocation}>New York, NY</Text>
            <Text style={styles.propertyPrice}>$250,000</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  buyerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  welcomeText: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  welcomeSubtext: {
    ...typography.body,
    color: colors.textSecondary,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    shadowColor: colors.propertyCardShadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.cta,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.surface,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  sectionTitleSmall: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  seeAllText: {
    ...typography.caption,
    color: colors.cta,
    fontWeight: '600',
  },
  quickFiltersSection: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  quickFiltersContainer: {
    paddingHorizontal: spacing.md,
    paddingRight: spacing.lg,
  },
  quickFilterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickFilterText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  horizontalScrollContainer: {
    height: 280,
  },
  horizontalList: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  roleText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  statNumber: {
    ...typography.h2,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionsContainer: {
    padding: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.cta,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.accent,
  },
  recentSection: {
    padding: spacing.lg,
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
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
  // Seller Dashboard Styles
  sellerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sellerScrollView: {
    flex: 1,
  },
  sellerWelcomeBanner: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerWelcomeContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  sellerWelcomeText: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sellerWelcomeSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sellerAddPropertyButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  sellerAddPropertyIcon: {
    ...typography.h3,
    color: colors.surface,
    marginRight: spacing.xs,
  },
  sellerAddPropertyText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  sellerSummaryCards: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sellerSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.propertyCardShadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sellerSummaryCardPrimary: {
    backgroundColor: colors.primary,
  },
  sellerSummaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sellerSummaryIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  sellerSummaryInfo: {
    flex: 1,
  },
  sellerSummaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sellerSummaryNumber: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
  },
  sellerSummaryLabelPrimary: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  sellerSummaryNumberPrimary: {
    ...typography.h1,
    color: colors.surface,
    fontWeight: '700',
  },
  sellerSummaryDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sellerBadgeActive: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sellerBadgeSuccess: {
    backgroundColor: colors.success,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sellerBadgeWarning: {
    backgroundColor: colors.warning,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sellerBadgeText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
  },
  sellerStatusBadges: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  sellerStatusBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sellerStatusBadgeInactive: {
    backgroundColor: colors.border,
  },
  sellerStatusBadgeText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
  },
  sellerStatusBadgeTextInactive: {
    color: colors.textSecondary,
  },
  sellerQuickActionsSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sellerQuickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  sellerQuickActionCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  sellerQuickActionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  sellerQuickActionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  sellerQuickActionSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sellerSection: {
    marginBottom: spacing.lg,
  },
  sellerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sellerSectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sellerSectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  sellerSeeAllText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  sellerHorizontalScrollContainer: {
    height: 200,
  },
  sellerHorizontalList: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  sellerPropertyCard: {
    width: 260,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.propertyCardShadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sellerPropertyImage: {
    height: 120,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerPropertyImageIcon: {
    fontSize: 48,
  },
  sellerPropertyInfo: {
    padding: spacing.md,
  },
  sellerPropertyName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sellerPropertyLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sellerPropertyPrice: {
    ...typography.body,
    color: colors.cta,
    fontWeight: '600',
  },
  sellerInquiryBadge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.round,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  sellerInquiryBadgeText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
  },
  sellerInquiryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    shadowColor: colors.propertyCardShadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sellerInquiryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sellerInquiryAvatarText: {
    fontSize: 24,
  },
  sellerInquiryInfo: {
    flex: 1,
  },
  sellerInquiryName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sellerInquiryProperty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sellerInquiryTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default DashboardScreen;

