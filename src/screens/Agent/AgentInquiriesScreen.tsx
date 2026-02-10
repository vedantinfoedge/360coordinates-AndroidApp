import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {AgentStackParamList} from '../../navigation/AgentNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import {sellerService} from '../../services/seller.service';
import {inquiryService} from '../../services/inquiry.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type AgentInquiriesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AgentStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: AgentInquiriesScreenNavigationProp;
};

interface Inquiry {
  id: string | number;
  property_id: string | number;
  buyer_id?: string | number | null;
  property_title?: string;
  buyer_name: string;
  buyer_email?: string;
  buyer_phone?: string;
  message: string;
  status: 'new' | 'contacted' | 'viewed' | 'interested' | 'not_interested' | 'closed';
  created_at: string;
  property_image?: string;
}

type StatusFilter = 'all' | 'new' | 'contacted' | 'viewed' | 'interested' | 'not_interested' | 'closed';

const AgentInquiriesScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [propertyFilter, setPropertyFilter] = useState<number | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response: any = await sellerService.getInquiries({
        page: 1,
        limit: 100,
      });
      
      if (response && response.success) {
        const inquiriesData = response.data?.inquiries || response.data || [];
        
        const formattedInquiries = inquiriesData.map((inq: any) => {
          // Extract buyer name - match website implementation priority:
          // 1. inq.buyer?.name (from backend API buyer object - primary source from SQL JOIN)
          // 2. inq.buyer_name (direct field - fallback, but validate it's not an ID)
          // 3. inq.name (fallback)
          // 4. 'Buyer' (default)
          
          // Helper function to check if a value is likely an ID (numeric string or number)
          const isLikelyId = (value: any): boolean => {
            if (!value) return false;
            const str = String(value).trim();
            // Check if it's a pure number (ID) vs a name (has letters/spaces)
            return /^\d+$/.test(str) && str.length < 10; // IDs are usually short numbers
          };
          
          let buyerName = inq.buyer?.name || 
                         inq.buyer?.full_name ||
                         inq.name;
          
          // If buyer_name exists, check if it's actually a name or an ID
          if (inq.buyer_name) {
            const buyerNameStr = String(inq.buyer_name).trim();
            if (!isLikelyId(buyerNameStr)) {
              // It's a name, use it
              buyerName = buyerName || buyerNameStr;
            } else {
              // It's an ID, ignore it and use buyer object name instead
              console.warn('[AgentInquiries] buyer_name appears to be an ID, using buyer object name instead');
            }
          }
          
          // Final fallback
          buyerName = buyerName || 'Buyer';
          
          console.log('[AgentInquiries] Processing inquiry:', {
            id: inq.id || inq.inquiry_id,
            buyer_id: inq.buyer_id || inq.buyer?.id || inq.user_id,
            buyer_name: buyerName,
            buyerObject: inq.buyer,
            buyerObjectName: inq.buyer?.name,
            rawBuyerName: inq.buyer_name,
            isBuyerNameAnId: inq.buyer_name ? isLikelyId(inq.buyer_name) : false,
          });
          
          // Handle null buyer_id (guest inquiries)
          const buyerId = inq.buyer_id !== null && inq.buyer_id !== undefined 
            ? (inq.buyer_id || inq.buyer?.id || inq.user_id)
            : null;
          
          return {
            id: inq.id || inq.inquiry_id,
            property_id: inq.property_id,
            buyer_id: buyerId, // Can be null for guest inquiries
            property_title: inq.property_title || inq.property?.title || 'Property',
            buyer_name: buyerName,
            buyer_email: inq.buyer_email || inq.email || inq.buyer?.email,
            buyer_phone: inq.buyer_phone || inq.mobile || inq.buyer?.phone,
            message: inq.message || '',
            status: inq.status || 'new',
            created_at: inq.created_at || inq.created_date || '',
            property_image: fixImageUrl(inq.property_image || inq.property?.cover_image || ''),
          };
        });
        
        setAllInquiries(formattedInquiries);
        setInquiries(formattedInquiries);
      } else {
        // Try fallback endpoint
        try {
          const fallbackResponse = await inquiryService.getInbox();
          if (fallbackResponse && fallbackResponse.success) {
            const inquiriesData = fallbackResponse.data?.inquiries || fallbackResponse.data || [];
            const formattedInquiries = inquiriesData.map((inq: any) => {
              // Extract buyer name - match website implementation priority:
              // 1. inq.buyer?.name (from backend API buyer object - primary source from SQL JOIN)
              // 2. inq.buyer_name (direct field - fallback, but validate it's not an ID)
              // 3. inq.name (fallback)
              // 4. 'Buyer' (default)
              
              // Helper function to check if a value is likely an ID (numeric string or number)
              const isLikelyId = (value: any): boolean => {
                if (!value) return false;
                const str = String(value).trim();
                // Check if it's a pure number (ID) vs a name (has letters/spaces)
                return /^\d+$/.test(str) && str.length < 10; // IDs are usually short numbers
              };
              
              let buyerName = inq.buyer?.name || 
                             inq.buyer?.full_name ||
                             inq.name;
              
              // If buyer_name exists, check if it's actually a name or an ID
              if (inq.buyer_name) {
                const buyerNameStr = String(inq.buyer_name).trim();
                if (!isLikelyId(buyerNameStr)) {
                  // It's a name, use it
                  buyerName = buyerName || buyerNameStr;
                } else {
                  // It's an ID, ignore it and use buyer object name instead
                  console.warn('[AgentInquiries] buyer_name appears to be an ID, using buyer object name instead');
                }
              }
              
              // Final fallback
              buyerName = buyerName || 'Buyer';
              
              // Handle null buyer_id (guest inquiries)
              const buyerId = inq.buyer_id !== null && inq.buyer_id !== undefined 
                ? (inq.buyer_id || inq.buyer?.id || inq.user_id)
                : null;
              
              return {
                id: inq.id || inq.inquiry_id,
                property_id: inq.property_id,
                buyer_id: buyerId, // Can be null for guest inquiries
                property_title: inq.property_title || inq.property?.title || 'Property',
                buyer_name: buyerName,
                buyer_email: inq.buyer_email || inq.buyer?.email,
                buyer_phone: inq.buyer_phone || inq.buyer?.phone,
                message: inq.message || '',
                status: inq.status || 'new',
                created_at: inq.created_at || inq.created_date || '',
                property_image: fixImageUrl(inq.property_image || inq.property?.cover_image || ''),
              };
            });
            setAllInquiries(formattedInquiries);
            setInquiries(formattedInquiries);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    } catch (error: any) {
      console.error('Error loading inquiries:', error);
      CustomAlert.alert('Error', 'Failed to load inquiries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter and sort inquiries
  const filteredInquiries = useMemo(() => {
    let filtered = [...allInquiries];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inq => 
        (inq.buyer_name || '').toLowerCase().includes(query) ||
        (inq.message || '').toLowerCase().includes(query) ||
        (inq.property_title || '').toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inq => inq.status === statusFilter);
    }
    
    // Apply property filter
    if (propertyFilter !== null) {
      filtered = filtered.filter(inq => Number(inq.property_id) === propertyFilter);
    }
    
    // Sort by last activity (created_at)
    filtered.sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate; // Newest first
    });
    
    return filtered;
  }, [allInquiries, searchQuery, statusFilter, propertyFilter]);

  const inquiryStats = useMemo(() => {
    const total = allInquiries.length;
    const newPending = allInquiries.filter(i => i.status === 'new').length;
    const read = allInquiries.filter(i => i.status === 'viewed').length;
    const replied = allInquiries.filter(i =>
      i.status !== 'new' && i.status !== 'viewed'
    ).length;
    return {total, newPending, read, replied};
  }, [allInquiries]);

  const recentLeads = useMemo(() => {
    const sorted = [...allInquiries].sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });
    return sorted.slice(0, 5);
  }, [allInquiries]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInquiries();
  };

  const handleMarkAsViewed = async (inquiryId: string | number) => {
    try {
      // Backend requires: 'new', 'contacted', 'viewed', 'interested', 'not_interested', 'closed'
      const response = await sellerService.updateInquiryStatus(inquiryId, 'viewed');
      if (response && response.success) {
        loadInquiries(); // Reload to update status
      }
    } catch (error) {
      console.error('Error marking inquiry as viewed:', error);
      CustomAlert.alert('Error', 'Failed to update inquiry status');
    }
  };

  const handleReply = async (inquiry: Inquiry) => {
    // Mark inquiry as viewed when opening chat
    if (inquiry.id && inquiry.status === 'new') {
      try {
        await handleMarkAsViewed(inquiry.id);
      } catch (error) {
        console.error('[AgentInquiries] Error marking inquiry as viewed:', error);
        // Continue anyway - don't block navigation
      }
    }
    
    // Handle guest inquiries (null buyer_id)
    if (!inquiry.buyer_id) {
      CustomAlert.alert(
        'Guest Inquiry',
        'This inquiry is from a guest user. Chat functionality is not available for guest inquiries.',
        [{text: 'OK'}]
      );
      return;
    }
    
    // Navigate to chat conversation with the buyer
    const buyerId = inquiry.buyer_id;
    
    // Helper function to check if a value is likely an ID (numeric string or number)
    const isLikelyId = (value: any): boolean => {
      if (!value) return false;
      const str = String(value).trim();
      // Check if it's a pure number (ID) vs a name (has letters/spaces)
      return /^\d+$/.test(str) && str.length < 10; // IDs are usually short numbers
    };
    
    // Ensure we have a valid buyer name - validate it's not an ID
    let buyerName = inquiry.buyer_name;
    if (!buyerName || buyerName.trim() === '' || isLikelyId(buyerName)) {
      // If buyer_name is missing or is an ID, use fallback
      buyerName = 'Buyer';
      console.warn('[AgentInquiries] buyer_name is missing or appears to be an ID, using fallback:', {
        buyer_name: inquiry.buyer_name,
        buyerId: buyerId,
      });
    } else {
      buyerName = buyerName.trim();
    }
    
    const propertyId = inquiry.property_id;
    const propertyTitle = inquiry.property_title || 'Property';
    
    console.log('[AgentInquiries] Navigating to chat with:', {
      buyerId,
      buyerName,
      propertyId,
      propertyTitle,
      inquiryBuyerName: inquiry.buyer_name,
      isBuyerNameAnId: isLikelyId(inquiry.buyer_name),
    });
    
    // Double-check: ensure userName is never the buyerId
    if (String(buyerName) === String(buyerId)) {
      console.error('[AgentInquiries] ERROR: buyerName equals buyerId! Using fallback.');
      buyerName = 'Buyer';
    }
    
    navigation.navigate('AgentTabs' as any, {
      screen: 'Chat',
      params: {
        screen: 'ChatConversation',
        params: {
          userId: Number(buyerId),
          userName: buyerName,
          propertyId: Number(propertyId),
          propertyTitle: propertyTitle,
          receiverRole: 'agent',
        },
      },
    });
  };

  const renderInquiry = ({item}: {item: Inquiry}) => (
    <TouchableOpacity
      style={styles.inquiryCard}
      onPress={() => {
        if (item.status === 'new') {
          handleMarkAsViewed(item.id);
        }
      }}>
      <View style={styles.inquiryHeader}>
        <View style={styles.inquiryInfo}>
          <Text style={styles.buyerName}>{item.buyer_name}</Text>
          <Text style={styles.propertyTitle}>{item.property_title}</Text>
          <Text style={styles.inquiryDate}>
            {formatters.timeAgo(item.created_at)}
          </Text>
        </View>
        {item.status === 'new' && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        )}
      </View>
      <Text style={styles.inquiryMessage} numberOfLines={3}>
        {item.message}
      </Text>
      <View style={styles.inquiryActions}>
        {item.buyer_phone && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Handle phone call
            }}>
            <Text style={styles.actionButtonText}>📞 Call</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.replyButton]}
          onPress={() => handleReply(item)}>
          <Text style={[styles.actionButtonText, styles.replyButtonText]}>💬 Chat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && inquiries.length === 0) {
    return (
      <View style={styles.container}>
        <AgentHeader
          onProfilePress={() => navigation.navigate('AgentTabs' as never, {screen: 'Profile'} as never)}
          onSupportPress={() => navigation.navigate('Support')}
          onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
          onLogoutPress={logout}
        />
        <View style={[styles.centerContainer, {flex: 1}]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading inquiries...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AgentHeader
        onProfilePress={() => navigation.navigate('AgentTabs' as never, {screen: 'Profile'} as never)}
        onSupportPress={() => navigation.navigate('Support')}
        onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
        onLogoutPress={logout}
        scrollY={scrollY}
      />
      
      {/* Search and Filter Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by buyer, message, or property..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Inquiry Stats + Leads */}
      <ScrollView
        style={styles.topInsights}
        contentContainerStyle={styles.topInsightsContent}
        horizontal
        showsHorizontalScrollIndicator={false}>
        <View style={[styles.statPill, styles.statPillPrimary]}>
          <Text style={styles.statPillNumber}>{inquiryStats.total}</Text>
          <Text style={styles.statPillLabel}>Total</Text>
        </View>
        <View style={[styles.statPill, styles.statPillDanger]}>
          <Text style={styles.statPillNumber}>{inquiryStats.newPending}</Text>
          <Text style={styles.statPillLabel}>New / Pending</Text>
        </View>
        <View style={[styles.statPill, styles.statPillNeutral]}>
          <Text style={styles.statPillNumber}>{inquiryStats.read}</Text>
          <Text style={styles.statPillLabel}>Read</Text>
        </View>
        <View style={[styles.statPill, styles.statPillSuccess]}>
          <Text style={styles.statPillNumber}>{inquiryStats.replied}</Text>
          <Text style={styles.statPillLabel}>Replied</Text>
        </View>
      </ScrollView>

      <View style={styles.leadsSection}>
        <View style={styles.leadsHeader}>
          <Text style={styles.leadsTitle}>Recent Leads</Text>
          <Text style={styles.leadsSubtitle}>Buyer name • contact • property</Text>
        </View>
        {recentLeads.length === 0 ? (
          <View style={styles.leadsEmpty}>
            <Text style={styles.leadsEmptyText}>No leads yet</Text>
          </View>
        ) : (
          recentLeads.map(lead => (
            <View style={styles.leadRow} key={String(lead.id)}>
              <View style={styles.leadRowLeft}>
                <Text style={styles.leadBuyer} numberOfLines={1}>
                  {lead.buyer_name || 'Buyer'}
                </Text>
                <Text style={styles.leadMeta} numberOfLines={1}>
                  {(lead.buyer_phone || 'No phone')} • {(lead.property_title || 'Property')}
                </Text>
              </View>
              <Text style={styles.leadTime}>{formatters.timeAgo(lead.created_at)}</Text>
            </View>
          ))
        )}
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
              <Text style={styles.modalTitle}>Filter Inquiries</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {(['all', 'new', 'contacted', 'viewed', 'interested', 'not_interested', 'closed'] as StatusFilter[]).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      statusFilter === status && styles.filterOptionActive,
                    ]}
                    onPress={() => setStatusFilter(status)}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        statusFilter === status && styles.filterOptionTextActive,
                      ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {inquiries.length === 0 ? (
        <View style={[styles.centerContainer, {flex: 1}]}>
          <Text style={styles.emptyText}>No inquiries yet</Text>
          <Text style={styles.emptySubtext}>
            Inquiries from buyers will appear here
          </Text>
        </View>
      ) : (
        <>
          {filteredInquiries.length === 0 && searchQuery ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No inquiries found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            <Animated.FlatList
              data={filteredInquiries}
              renderItem={renderInquiry}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{nativeEvent: {contentOffset: {y: scrollY}}}],
                {useNativeDriver: true}
              )}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                />
              }
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
    backgroundColor: '#FAFAFA',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.md,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  inquiryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  inquiryInfo: {
    flex: 1,
  },
  buyerName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  propertyTitle: {
    ...typography.body,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  inquiryDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  newBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  newBadgeText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
  },
  inquiryMessage: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inquiryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
  },
  replyButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  replyButtonText: {
    color: colors.surface,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
  searchBar: {
    flexDirection: 'row',
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  topInsights: {
    maxHeight: 62,
    marginTop: spacing.md,
  },
  topInsightsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  statPill: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 120,
  },
  statPillPrimary: {
    backgroundColor: '#E3F6FF',
    borderColor: '#BFE7FF',
  },
  statPillDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statPillNeutral: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  statPillSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  statPillNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  statPillLabel: {
    ...typography.caption,
    color: colors.text,
    opacity: 0.8,
    marginTop: 2,
    fontWeight: '700',
    fontSize: 11,
  },
  leadsSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  leadsHeader: {
    marginBottom: spacing.sm,
  },
  leadsTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  leadsSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  leadsEmpty: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  leadsEmptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  leadRowLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  leadBuyer: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  leadMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  leadTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  filterButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  modalClose: {
    ...typography.h2,
    color: colors.textSecondary,
    fontSize: 24,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    ...typography.body,
    color: colors.text,
    fontSize: 12,
  },
  filterOptionTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  applyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
});

export default AgentInquiriesScreen;
