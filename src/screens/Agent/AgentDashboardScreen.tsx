import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Dimensions,
  Easing,
  InteractionManager,
  StatusBar,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AgentTabParamList } from '../../components/navigation/AgentTabNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon, TabIconName } from '../../components/navigation/TabIcons';
import { useAuth } from '../../context/AuthContext';
import { sellerService, DashboardStats } from '../../services/seller.service';
import { fixImageUrl } from '../../utils/imageHelper';
import { formatters } from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';
import { getLeads, Lead } from '../../services/leadsService';
import { chatService } from '../../services/chat.service';
import { propertyService } from '../../services/property.service';
import LoadingScreen from '../../components/common/LoadingScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RecentChatItem {
  id: string;
  chatRoomId: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  propertyTitle?: string;
  propertyId?: string;
  buyerId?: string;
}

// Reference UI colors (360 Coordinates - same as Seller)
const REF = {
  navy: '#0B1F3A',
  blue: '#1565C0',
  blueLight: '#1E88E5',
  grayBg: '#F2F5FA',
  grayText: '#8A97A8',
  textDark: '#0D1B2E',
  purple: '#7C4DFF',
  yellow: '#FFB300',
  green: '#00C48C',
  siBlue: '#E3F2FD',
  siPurple: '#EDE7F6',
  siYellow: '#FFF8E1',
  siGreen: '#E8F5E9',
  aiIndigo: '#E8EAF6',
  aiTeal: '#E0F2F1',
  badgeSale: '#E3F2FD',
  badgeRent: '#FFF8E1',
};

type AgentDashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabScreenProps<AgentTabParamList, 'Home'>['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: AgentDashboardScreenNavigationProp;
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

type DashboardLead = Lead;

// Add Property / Add Project gradient buttons (reference style)
const AnimatedAddButtons = React.memo(({
  onAddProperty,
  onAddProject,
}: { onAddProperty: () => void; onAddProject: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, friction: 3 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }).start();
  return (
    <Animated.View style={[styles.addButtonsRow, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity style={styles.addBtnWrap} onPress={onAddProperty} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.9}>
        {/* @ts-expect-error - LinearGradient children types */}
        <LinearGradient colors={[REF.blueLight, REF.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtnGradient}>
          <TabIcon name="home" color="#fff" size={16} />
          <Text style={styles.addBtnText}>Add Property</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={styles.addBtnWrap} onPress={onAddProject} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.9}>
        {/* @ts-expect-error - LinearGradient children types */}
        <LinearGradient colors={[REF.blueLight, REF.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtnGradient}>
          <TabIcon name="building" color="#fff" size={16} />
          <Text style={styles.addBtnText}>Add Project</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Animated Stat Card Component
const AnimatedStatCard = React.memo(({
  iconName,
  iconColor = colors.primary,
  iconBgColor = colors.surfaceSecondary,
  number,
  label,
  badge,
  badgeColor,
  statusPills,
  onPress,
  delay = 0,
}: {
  iconName: TabIconName;
  iconColor?: string;
  iconBgColor?: string;
  number?: string | number;
  label: string;
  badge?: string;
  badgeColor?: string;
  statusPills?: { sale: number; rent: number };
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

  const getBadgeTextColor = () => {
    if (!badgeColor) return REF.blue;
    if (badgeColor === REF.siGreen) return '#059669';
    if (badgeColor === '#FEE2E2') return '#DC2626';
    if (badgeColor === REF.siBlue || badgeColor === REF.badgeSale) return REF.blue;
    if (badgeColor === REF.badgeRent) return '#F9A825';
    if (badgeColor === '#F1F3F5') return REF.grayText;
    return REF.blue;
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
        { opacity: cardAnim, transform: [{ scale: scaleAnim }] },
        { width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 3) / 2 },
      ]}>
      <CardWrapper style={styles.statCard} {...cardProps}>
        <View style={[styles.statCardIcon, { backgroundColor: iconBgColor }]}>
          <TabIcon name={iconName} color={iconColor} size={24} />
        </View>
        {number !== undefined && (
          <Text style={styles.statNumber}>{number}</Text>
        )}
        <Text style={styles.statLabel}>{label}</Text>
        {badge && (
          <View style={[styles.activeBadge, badgeColor && { backgroundColor: badgeColor }]}>
            <Text style={[styles.activeBadgeText, { color: getBadgeTextColor() }]}>{badge}</Text>
          </View>
        )}
        {statusPills && (
          <View style={styles.statusPills}>
            <View style={styles.statusPill}>
              <Text style={[styles.statusPillText, { color: REF.blue }]}>{statusPills.sale} Sale</Text>
            </View>
            <View style={[styles.statusPill, styles.statusPillRent]}>
              <Text style={[styles.statusPillText, { color: '#F9A825' }]}>{statusPills.rent} Rent</Text>
            </View>
          </View>
        )}
      </CardWrapper>
    </Animated.View>
  );
});

// Animated Quick Action Card
const AnimatedQuickActionCard = React.memo(({
  iconName,
  title,
  description,
  onPress,
  delay = 0,
  iconColor = REF.blue,
  iconBgColor = REF.siBlue,
}: {
  iconName: TabIconName;
  title: string;
  description: string;
  onPress: () => void;
  delay?: number;
  iconColor?: string;
  iconBgColor?: string;
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
          transform: [{ scale: scaleAnim }],
          width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 3) / 2,
        },
      ]}>
      <TouchableOpacity
        style={styles.quickActionCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}>
        <View style={[styles.quickActionIconContainer, { backgroundColor: iconBgColor }]}>
          <TabIcon name={iconName} color={iconColor} size={20} />
        </View>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionDescription}>{description}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Animated See All Button
const AnimatedSeeAllButton = React.memo(({ onPress, children }: {
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
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
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

// Animated Inquiry Card
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
        transform: [{ scale: scaleAnim }],
      }}>
      <TouchableOpacity
        style={styles.inquiryCard}
        onPress={() => navigation.getParent()?.navigate('Inquiries' as never, { inquiryId: item.id } as never)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}>
        <View style={styles.inquiryCardHeader}>
          {item.buyer_profile_image ? (
            <Image
              source={{ uri: fixImageUrl(item.buyer_profile_image) }}
              style={styles.inquiryAvatar}
            />
          ) : (
            <View style={styles.inquiryAvatarPlaceholder}>
              <Text style={styles.inquiryAvatarText}>
                {((item.buyer_name || '').charAt(0) || '?').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.inquiryCardInfo}>
            <Text style={styles.inquiryBuyerName} numberOfLines={1}>
              {item.buyer_name || 'Unknown'}
            </Text>
            <Text style={styles.inquiryTime}>
              {item.created_at ? formatters.timeAgo(item.created_at) : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.inquiryPropertyTitle} numberOfLines={1}>
          {item.property_title || '—'}
        </Text>
        <Text style={styles.inquiryMessage} numberOfLines={2}>
          {item.message || ''}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Animated Property Card
const AnimatedPropertyCard = React.memo(({
  item,
  index,
  navigation,
}: {
  item: RecentProperty;
  index: number;
  navigation: AgentDashboardScreenNavigationProp;
}) => {
  let imageUrl: string | null = null;

  if (item.cover_image) {
    const trimmed = String(item.cover_image).trim();
    if (trimmed && trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          new URL(trimmed);
          imageUrl = trimmed;
        } catch (e) {
          const fixed = fixImageUrl(trimmed);
          if (fixed) imageUrl = fixed;
        }
      } else {
        const fixed = fixImageUrl(trimmed);
        if (fixed && (fixed.startsWith('http://') || fixed.startsWith('https://'))) {
          imageUrl = fixed;
        }
      }
    }
  }

  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [index]);

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
        transform: [{ scale: scaleAnim }],
      }}>
      <TouchableOpacity
        style={styles.propertyCard}
        onPress={() => (navigation.getParent() as any)?.navigate(item.project_type === 'upcoming' ? 'UpcomingProjectDetails' : 'PropertyDetails', { propertyId: String(item.id) })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}>
        {imageUrl && !hasImageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.propertyImage}
            resizeMode="cover"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <View style={styles.propertyImagePlaceholder}>
            <TabIcon name="image" color={colors.textSecondary} size={44} />
          </View>
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
                {item.project_type === 'upcoming' && (
                  <View style={styles.projectTypeBadge}>
                    <Text style={styles.projectTypeText}>Upcoming</Text>
                  </View>
                )}
              </View>
              <Text style={styles.propertyCardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.propertyLocationRow}>
                <View style={styles.locationIconContainer}>
                  <TabIcon name="location" color={colors.textSecondary} size={14} />
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
                <TabIcon name="eye" color={colors.primary} size={14} />
              </View>
              <Text style={styles.propertyStatText}>
                {item.views} interested
              </Text>
            </View>
            <View style={styles.propertyStatItem}>
              <View style={styles.propertyStatIconContainer}>
                <TabIcon name="inquiries" color={colors.primary} size={14} />
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
      </TouchableOpacity>
    </Animated.View>
  );
});

const AgentDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChatItem[]>([]);
  const [recentLeads, setRecentLeads] = useState<DashboardLead[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Performance optimization
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const hasAnimatedRef = useRef<boolean>(false);
  const CACHE_DURATION = 30000;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
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

  const loadDashboardData = useCallback(async (showLoading: boolean = true, forceRefresh: boolean = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;

    if (isFetchingRef.current) return;

    if (!forceRefresh && timeSinceLastFetch < CACHE_DURATION && dashboardStats) {
      return;
    }

    isFetchingRef.current = true;

    try {
      if (showLoading) setLoading(true);

      let apiStats: DashboardStats | null = null;

      try {
        const statsResponse: any = await sellerService.getDashboardStats();
        if (statsResponse && statsResponse.success && statsResponse.data) {
          apiStats = statsResponse.data;
          const raw = statsResponse.data.recent_inquiries || [];
          setRecentInquiries(raw.map((inq: any) => ({
            ...inq,
            buyer_name: inq.buyer_name ?? '',
            property_title: inq.property_title ?? '',
            message: inq.message ?? '',
            created_at: inq.created_at ?? '',
            status: inq.status ?? '',
          })));
        }
      } catch (statsError: any) {
        if (statsError?.status !== 404 && statsError?.response?.status !== 404) {
          console.warn('[AgentDashboard] Error loading API stats:', statsError);
        }
      }

      // Leads (buyers who clicked "View Contact")
      try {
        const leads = await getLeads();
        const list = Array.isArray(leads) ? leads : [];
        setLeadsCount(list.length);
        setRecentLeads(list.slice(0, 4));

        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const newCount = list.filter(l => {
          const ts = l?.created_at ? new Date(l.created_at).getTime() : 0;
          return ts > 0 && now - ts <= oneDayMs;
        }).length;
        setNewLeadsCount(newCount);
      } catch (leadErr: any) {
        // Don't crash dashboard if leads endpoint isn't available for agent.
        setLeadsCount(0);
        setNewLeadsCount(0);
        setRecentLeads([]);
      }

      // Load recent chats (same data as Chat screen)
      try {
        const chatResponse: any = await chatService.getConversations(user?.id as number);
        const rooms = (chatResponse?.data || [])
          .filter((r: any) => String(r.receiverId || '') === String(user?.id))
          .slice(0, 5);
        const chats: RecentChatItem[] = await Promise.all(
          rooms.map(async (r: any) => {
            let propertyTitle = r.propertyTitle || r.property_title || 'Property';
            if (r.propertyId) {
              try {
                const pr: any = await propertyService.getPropertyDetails(r.propertyId);
                if (pr?.success && pr?.data?.property?.title) {
                  propertyTitle = pr.data.property.title;
                }
              } catch (_) {}
            }
            const name = r.buyerName || r.buyer_name || `Buyer ${r.buyerId || ''}`;
            const updatedAt = r.updatedAt;
            const ts = updatedAt instanceof Date ? updatedAt : (updatedAt?.toDate?.() || new Date());
            const timestamp = formatters.timeAgo(ts.toISOString?.() || ts.toString?.() || '');
            return {
              id: r.chatRoomId || r.id,
              chatRoomId: r.chatRoomId || r.id,
              name,
              lastMessage: r.lastMessage || 'No messages yet',
              timestamp,
              unreadCount: (r.readStatus || {})[String(user?.id)] === 'new' ? 1 : 0,
              propertyTitle,
              propertyId: r.propertyId,
              buyerId: r.buyerId,
            };
          })
        );
        setRecentChats(chats);
      } catch (_) {
        setRecentChats([]);
      }

      const propertiesResponse: any = await sellerService.getProperties({
        page: 1,
        limit: 100,
      });

      if (propertiesResponse && propertiesResponse.success && propertiesResponse.data) {
        const properties = propertiesResponse.data.properties || propertiesResponse.data || [];

        setAllProperties(properties);

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

        const finalStats: DashboardStats = apiStats ? {
          ...apiStats,
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

        const formattedProperties: RecentProperty[] = properties.slice(0, 3).map((prop: any) => ({
          id: prop.id || prop.property_id,
          title: prop.title || prop.property_title || 'Untitled Property',
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
      if (showLoading && error?.status !== 404 && error?.response?.status !== 404) {
        CustomAlert.alert('Error', error?.message || 'Failed to load dashboard data');
      }
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
      lastFetchTimeRef.current = Date.now();
    }
  }, [dashboardStats]);

  const isAgentOrBuilder = user && ['agent', 'builder'].includes((user.user_type || '').toLowerCase());

  useFocusEffect(
    useCallback(() => {
      if (isAgentOrBuilder) {
        const task = InteractionManager.runAfterInteractions(() => {
          loadDashboardData(false, false);
        });
        return () => task.cancel();
      }
    }, [user, loadDashboardData, isAgentOrBuilder])
  );

  useEffect(() => {
    if (isAgentOrBuilder) {
      const task = InteractionManager.runAfterInteractions(() => {
        loadDashboardData(true, true);
      });

      refreshIntervalRef.current = setInterval(() => {
        loadDashboardData(false, true);
      }, 60000);

      return () => {
        task.cancel();
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [user?.user_type, loadDashboardData, isAgentOrBuilder]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(false, true);
  };

  const getInitials = (name: string): string => {
    if (!name || typeof name !== 'string') return '';
    return name.split(' ').map(n => (n && n[0]) || '').join('').toUpperCase().slice(0, 2);
  };

  if (loading && !dashboardStats) {
    return <LoadingScreen variant="dashboard" />;
  }

  const stats = dashboardStats || {
    total_properties: 0,
    active_properties: 0,
    total_inquiries: 0,
    new_inquiries: 0,
    total_views: 0,
    views_percentage_change: 0,
    properties_by_status: { sale: 0, rent: 0 },
    recent_inquiries: [],
  };

  const firstName = user?.full_name ? String(user.full_name).split(' ')[0] ?? '' : '';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={REF.navy} />

      <Modal visible={avatarMenuVisible} transparent animationType="fade" onRequestClose={() => setAvatarMenuVisible(false)}>
        <TouchableOpacity style={styles.avatarMenuOverlay} activeOpacity={1} onPress={() => setAvatarMenuVisible(false)}>
          <View style={styles.avatarMenu}>
            <TouchableOpacity style={styles.avatarMenuItem} onPress={() => { setAvatarMenuVisible(false); navigation.navigate('Profile'); }} activeOpacity={0.7}>
              <TabIcon name="profile" color={REF.blue} size={20} />
              <Text style={styles.avatarMenuItemText}>Profile</Text>
            </TouchableOpacity>
            <View style={styles.avatarMenuDivider} />
            <TouchableOpacity style={styles.avatarMenuItem} onPress={async () => { setAvatarMenuVisible(false); await logout(); }} activeOpacity={0.7}>
              <TabIcon name="logout" color="#DC2626" size={20} />
              <Text style={[styles.avatarMenuItemText, styles.avatarMenuLogoutText]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 0 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Navy welcome section - scrolls with content */}
        <View style={[styles.navyHeader, { paddingTop: insets.top + 14, marginHorizontal: -16 }]}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeLeft}>
              <Text style={styles.welcomeGreeting}>{greeting.toUpperCase()}</Text>
              <Text style={styles.welcomeName}>
                Welcome, <Text style={styles.welcomeNameHighlight}>{firstName || 'Agent'}</Text>
              </Text>
              <Text style={styles.welcomeSub}>Manage your properties and track your leads</Text>
            </View>
            <TouchableOpacity onPress={() => setAvatarMenuVisible(true)} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {/* @ts-expect-error - LinearGradient children types */}
              <LinearGradient colors={[REF.blueLight, REF.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.welcomeAvatar}>
                <Text style={styles.welcomeAvatarText}>{getInitials(user?.full_name || 'A')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.addButtonsRowWrap}>
            <AnimatedAddButtons
              onAddProperty={() => (navigation.getParent() as any)?.navigate('AddProperty')}
              onAddProject={() => (navigation.getParent() as any)?.navigate('AddProject')}
            />
          </View>
        </View>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>OVERVIEW</Text>
          <Animated.View style={[styles.statsGrid, { opacity: statsAnim }]}>
            <AnimatedStatCard iconName="building" number={dashboardStats?.active_properties || 0} label="Active Properties" iconBgColor={REF.siBlue} iconColor={REF.blue} badge={`${dashboardStats?.active_properties || 0} Active`} badgeColor={REF.siBlue} onPress={() => navigation.navigate('Listings')} delay={0} />
            <AnimatedStatCard iconName="chats" number={dashboardStats?.total_inquiries || 0} label="View Inquiries" iconBgColor={REF.siPurple} iconColor={REF.purple} badge={dashboardStats?.new_inquiries && dashboardStats.new_inquiries > 0 ? `${dashboardStats.new_inquiries} New` : 'No New'} badgeColor={dashboardStats?.new_inquiries && dashboardStats.new_inquiries > 0 ? '#FEE2E2' : '#F1F3F5'} onPress={() => navigation.navigate('Chat', { screen: 'ChatList' })} delay={100} />
            <AnimatedStatCard iconName="leads" number={leadsCount} label="Total Leads" badge={newLeadsCount > 0 ? `+${newLeadsCount} New` : 'No New'} badgeColor={newLeadsCount > 0 ? '#FEE2E2' : '#F1F3F5'} iconBgColor={REF.siYellow} iconColor={REF.yellow} onPress={() => (navigation as any).navigate('Leads')} delay={200} />
            <AnimatedStatCard iconName="inquiries" number={dashboardStats?.total_inquiries || 0} label="Total Inquiries" iconBgColor={REF.siGreen} iconColor={REF.green} statusPills={{ sale: dashboardStats?.properties_by_status?.sale || 0, rent: dashboardStats?.properties_by_status?.rent || 0 }} onPress={() => navigation.navigate('Chat', { screen: 'ChatList' })} delay={300} />
          </Animated.View>

          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            <AnimatedQuickActionCard iconName="plus" title="Add New Property" description="List a new property for sale or rent" iconColor={REF.blue} iconBgColor={REF.siBlue} onPress={() => (navigation.getParent() as any)?.navigate('AddProperty')} delay={0} />
            <AnimatedQuickActionCard iconName="list" title="Manage Properties" description="Edit, update or remove listings" iconColor="#5C6BC0" iconBgColor={REF.aiIndigo} onPress={() => navigation.navigate('Listings')} delay={100} />
            <AnimatedQuickActionCard iconName="leads" title="View Leads" description="See buyers who viewed contact" iconColor={REF.yellow} iconBgColor={REF.siYellow} onPress={() => (navigation as any).navigate('Leads')} delay={200} />
            <AnimatedQuickActionCard iconName="inquiries" title="View Inquiries" description="Respond to buyer inquiries" iconColor="#009688" iconBgColor={REF.aiTeal} onPress={() => navigation.navigate('Chat', { screen: 'ChatList' })} delay={300} />
          </View>

          {/* My Chats Section - same UI as Chat screen (reference) */}
          <View style={styles.myChatsSection}>
            <View style={styles.myChatsHeader}>
              <Text style={styles.myChatsTitle}>
                My <Text style={styles.myChatsTitleAccent}>Chats</Text>
              </Text>
              {recentChats.some(c => c.unreadCount > 0) && (
                <View style={styles.myChatsUnreadBadge}>
                  <Text style={styles.myChatsUnreadText}>
                    {recentChats.filter(c => c.unreadCount > 0).length} Unread
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.myChatsStatsRow}>
              <View style={[styles.myChatsStatPill, styles.myChatsStatPillActive]}>
                <Text style={[styles.myChatsStatNum, styles.myChatsStatNumActive]}>{recentChats.length}</Text>
                <Text style={[styles.myChatsStatLbl, styles.myChatsStatLblActive]}>Total</Text>
              </View>
              <View style={styles.myChatsStatPill}>
                <Text style={[styles.myChatsStatNum, { color: '#FF5252' }]}>
                  {recentChats.filter(c => c.unreadCount > 0).length}
                </Text>
                <Text style={styles.myChatsStatLbl}>Unread</Text>
              </View>
              <View style={styles.myChatsStatPill}>
                <Text style={styles.myChatsStatNum}>
                  {recentChats.filter(c => c.unreadCount === 0).length}
                </Text>
                <Text style={styles.myChatsStatLbl}>Read</Text>
              </View>
            </View>
            <View style={styles.myChatsList}>
              {recentChats.length > 0 ? (
                recentChats.slice(0, 4).map((chat, idx) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={[
                      styles.myChatsCard,
                      chat.unreadCount > 0 && styles.myChatsCardUnread,
                    ]}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        screen: 'ChatConversation',
                        params: {
                          conversationId: chat.chatRoomId,
                          userId: chat.buyerId,
                          userName: chat.name,
                          propertyId: chat.propertyId,
                          propertyTitle: chat.propertyTitle,
                        },
                      })
                    }
                    activeOpacity={0.8}>
                    {chat.unreadCount > 0 && <View style={styles.myChatsUnreadBar} />}
                    <View style={styles.myChatsAvatar}>
                      <Text style={styles.myChatsAvatarText}>
                        {(chat.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.myChatsBody}>
                      <View style={styles.myChatsRow}>
                        <Text style={[styles.myChatsName, chat.unreadCount > 0 && styles.myChatsNameUnread]} numberOfLines={1}>
                          {chat.name}
                        </Text>
                        <Text style={styles.myChatsTime}>{chat.timestamp}</Text>
                      </View>
                      {chat.propertyTitle && (
                        <View style={styles.myChatsPropertyTag}>
                          <TabIcon name="home" color={REF.blue} size={9} />
                          <Text style={styles.myChatsPropertyText} numberOfLines={1}>
                            {chat.propertyTitle}
                          </Text>
                        </View>
                      )}
                      <View style={styles.myChatsBottom}>
                        <Text
                          style={[styles.myChatsPreview, chat.unreadCount > 0 && styles.myChatsPreviewUnread]}
                          numberOfLines={1}>
                          {chat.lastMessage}
                        </Text>
                        {chat.unreadCount > 0 && (
                          <View style={styles.myChatsBadge}>
                            <Text style={styles.myChatsBadgeText}>{chat.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.myChatsEmpty}>
                  <TabIcon name="chats" color={REF.grayText} size={32} />
                  <Text style={styles.myChatsEmptyText}>No chats yet</Text>
                  <Text style={styles.myChatsEmptySub}>Start a conversation when buyers inquire</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.myChatsViewAll}
              onPress={() => navigation.navigate('Chat', { screen: 'ChatList' })}
              activeOpacity={0.8}>
              <Text style={styles.myChatsViewAllText}>View All Chats</Text>
              <Text style={styles.myChatsViewAllArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.yourPropsHeader}>
              <View style={styles.yourPropsTitle}>
                <TabIcon name="home" size={18} color={REF.blue} />
                <Text style={styles.yourPropsTitleText}>Your Properties</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Listings')} style={styles.viewAllBtn} activeOpacity={0.7}>
                <Text style={styles.viewAllBtnText}>View All ›</Text>
              </TouchableOpacity>
            </View>
            {recentProperties.length > 0 ? (
              <FlatList
                data={recentProperties}
                renderItem={({ item, index }: { item: RecentProperty; index: number }) => (
                  <AnimatedPropertyCard item={item} index={index} navigation={navigation} />
                )}
                keyExtractor={(item: RecentProperty) => String(item.id)}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyProps}>
                <View style={styles.emptyIll}>
                  <TabIcon name="home" size={32} color={REF.blue} />
                </View>
                <Text style={styles.emptyPropsTitle}>No Properties Listed</Text>
                <Text style={styles.emptyPropsSub}>Start by adding your first property to get started</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => (navigation.getParent() as any)?.navigate('AddProperty')} activeOpacity={0.8}>
                  {/* @ts-expect-error - LinearGradient children types */}
                  <LinearGradient colors={[REF.blueLight, REF.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyAddBtnGradient}>
                    <TabIcon name="plus" color="#fff" size={14} />
                    <Text style={styles.emptyAddBtnText}>Add Property</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.yourPropsHeader}>
              <View style={styles.yourPropsTitle}>
                <TabIcon name="clipboard" size={18} color={REF.blue} />
                <Text style={styles.yourPropsTitleText}>Recent Leads</Text>
                {newLeadsCount > 0 && <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{newLeadsCount} New</Text></View>}
              </View>
              <TouchableOpacity onPress={() => (navigation as any).navigate('Leads')} style={styles.viewAllBtn} activeOpacity={0.7}>
                <Text style={styles.viewAllBtnText}>View All ›</Text>
              </TouchableOpacity>
            </View>

            {recentLeads.length > 0 ? (
              <View>
                {recentLeads.map((lead, idx) => (
                  <View key={`${lead.created_at}-${idx}`} style={styles.inquiryCard}>
                    <Text style={styles.inquiryBuyerName} numberOfLines={1}>
                      {lead.buyer_name || 'Buyer'}
                    </Text>
                    <Text style={styles.inquiryPropertyTitle} numberOfLines={1}>
                      {lead.property_title || '—'}
                    </Text>
                    <Text style={styles.inquiryTime}>
                      {lead.created_at ? formatters.timeAgo(lead.created_at) : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIconContainer}>
                  <TabIcon name="clipboard" color="#9CA3AF" size={48} />
                </View>
                <Text style={styles.emptyStateTitle}>No Leads Yet</Text>
                <Text style={styles.emptyStateText}>
                  When buyers click "View Contact" on your listings, they will appear here.
                </Text>
              </View>
            )}
          </View>

        </Animated.View>
      </Animated.ScrollView>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: REF.grayBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorIconWrap: {
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 22,
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: '#6B7280',
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
    backgroundColor: REF.grayBg,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  navyHeader: {
    backgroundColor: REF.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  welcomeCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeLeft: { flex: 1 },
  welcomeGreeting: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 3 },
  welcomeName: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  welcomeNameHighlight: { color: '#60B4FF' },
  welcomeSub: { color: 'rgba(255,255,255,0.45)', fontSize: 11.5, lineHeight: 16 },
  welcomeAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: REF.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 4 },
  welcomeAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  addButtonsRowWrap: { marginTop: 12 },
  addButtonsRow: { flexDirection: 'row', gap: 10 },
  addBtnWrap: { flex: 1, borderRadius: 14, overflow: 'hidden', shadowColor: REF.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 4 },
  addBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: REF.grayText, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, paddingHorizontal: 4 },
  sectionLabelFirst: { paddingTop: 16 },
  yourPropsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  yourPropsTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  yourPropsTitleText: { fontSize: 14, fontWeight: '800', color: REF.textDark },
  viewAllBtn: { paddingVertical: 4 },
  viewAllBtnText: { fontSize: 12, fontWeight: '600', color: REF.blueLight },
  emptyProps: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 2, borderColor: '#D0E4F7', borderStyle: 'dashed', padding: 28, alignItems: 'center', marginBottom: 20 },
  emptyIll: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#D0E8FB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyPropsTitle: { fontSize: 15, fontWeight: '800', color: REF.textDark, marginBottom: 5 },
  emptyPropsSub: { fontSize: 12, color: REF.grayText, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  emptyAddBtn: { borderRadius: 12, overflow: 'hidden', shadowColor: REF.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 4 },
  emptyAddBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 24, gap: 6 },
  emptyAddBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  avatarMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 20 },
  avatarMenu: { backgroundColor: colors.surface, borderRadius: 12, minWidth: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: 'hidden' },
  avatarMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  avatarMenuItemText: { fontSize: 15, fontWeight: '500', color: colors.text },
  avatarMenuLogoutText: { color: '#DC2626' },
  avatarMenuDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 12 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIcon: {
    fontSize: 22,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: REF.textDark,
    lineHeight: 28,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: REF.grayText,
    fontWeight: '500',
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  activeBadgeText: {
    ...typography.caption,
    color: '#059669',
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
    backgroundColor: REF.badgeSale,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
  },
  statusPillRent: {
    backgroundColor: REF.badgeRent,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    justifyContent: 'space-between',
    gap: 10,
  },
  // My Chats section - same UI as Chat screen (reference)
  myChatsSection: {
    backgroundColor: REF.navy,
    borderRadius: 20,
    padding: 16,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  myChatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  myChatsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  myChatsTitleAccent: {
    color: '#60B4FF',
  },
  myChatsUnreadBadge: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  myChatsUnreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myChatsStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  myChatsStatPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  myChatsStatPillActive: {
    backgroundColor: REF.siBlue,
    borderWidth: 1,
    borderColor: REF.blue,
  },
  myChatsStatNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  myChatsStatLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  myChatsStatNumActive: {
    color: REF.blue,
  },
  myChatsStatLblActive: {
    color: REF.blue,
  },
  myChatsList: {
    marginBottom: 8,
  },
  myChatsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  myChatsCardUnread: {
    borderWidth: 1.5,
    borderColor: 'rgba(21,101,192,0.3)',
  },
  myChatsUnreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: REF.blue,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  myChatsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: REF.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myChatsAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  myChatsBody: {
    flex: 1,
    minWidth: 0,
  },
  myChatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  myChatsName: {
    fontSize: 13,
    fontWeight: '600',
    color: REF.textDark,
    flex: 1,
  },
  myChatsNameUnread: {
    fontWeight: '800',
  },
  myChatsTime: {
    fontSize: 10,
    color: REF.grayText,
  },
  myChatsPropertyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: REF.siBlue,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 3,
    alignSelf: 'flex-start',
  },
  myChatsPropertyText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: REF.blue,
  },
  myChatsBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  myChatsPreview: {
    fontSize: 12,
    color: REF.grayText,
    flex: 1,
  },
  myChatsPreviewUnread: {
    color: REF.textDark,
    fontWeight: '700',
  },
  myChatsBadge: {
    backgroundColor: REF.blue,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  myChatsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  myChatsEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  myChatsEmptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: REF.textDark,
    marginTop: 8,
  },
  myChatsEmptySub: {
    fontSize: 12,
    color: REF.grayText,
    marginTop: 4,
  },
  myChatsViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  myChatsViewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60B4FF',
  },
  myChatsViewAllArrow: {
    fontSize: 16,
    color: '#60B4FF',
    fontWeight: 'bold',
  },
  quickActionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quickActionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionIcon: {
    fontSize: 20,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: REF.textDark,
    marginBottom: 3,
  },
  quickActionDescription: {
    fontSize: 10.5,
    color: REF.grayText,
    lineHeight: 15,
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
    backgroundColor: '#E3F6FF',
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
    color: '#1D242B',
    fontWeight: '700',
    lineHeight: 26,
  },
  sectionBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: spacing.xs,
  },
  sectionBadgeText: {
    ...typography.caption,
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: '#E3F6FF',
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
    shadowOffset: { width: 0, height: 2 },
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
  propertyCardInfo: {},
  propertyBadgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
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
  projectTypeBadge: {
    backgroundColor: colors.accent || '#FF9800',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: 20,
  },
  projectTypeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  propertyCardTitle: {
    fontSize: 18,
    color: '#1D242B',
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
    backgroundColor: '#E3F6FF',
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
    backgroundColor: '#E3F6FF',
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
    shadowOffset: { width: 0, height: 2 },
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
    color: '#1D242B',
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
    backgroundColor: '#E3F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 36,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#1D242B',
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
    shadowOffset: { width: 0, height: 3 },
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

export default AgentDashboardScreen;
