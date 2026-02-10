import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuilderStackParamList} from '../../navigation/BuilderNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuilderHeader from '../../components/BuilderHeader';
import {sellerService} from '../../services/seller.service';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type BuilderInquiriesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<BuilderStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: BuilderInquiriesScreenNavigationProp;
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
}

type StatusFilter =
  | 'all'
  | 'new'
  | 'contacted'
  | 'viewed'
  | 'interested'
  | 'not_interested'
  | 'closed';

const BuilderInquiriesScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response: any = await sellerService.getInquiries({page: 1, limit: 100});
      if (response && response.success) {
        const inquiriesData = response.data?.inquiries || response.data || [];

        const isLikelyId = (value: any): boolean => {
          if (!value) return false;
          const str = String(value).trim();
          return /^\d+$/.test(str) && str.length < 10;
        };

        const formatted: Inquiry[] = inquiriesData.map((inq: any) => {
          let buyerName = inq.buyer?.name || inq.buyer?.full_name || inq.name;
          if (inq.buyer_name) {
            const buyerNameStr = String(inq.buyer_name).trim();
            if (!isLikelyId(buyerNameStr)) buyerName = buyerName || buyerNameStr;
          }
          buyerName = buyerName || 'Buyer';

          const buyerId =
            inq.buyer_id !== null && inq.buyer_id !== undefined
              ? (inq.buyer_id || inq.buyer?.id || inq.user_id)
              : null;

          return {
            id: inq.id || inq.inquiry_id,
            property_id: inq.property_id,
            buyer_id: buyerId,
            property_title: inq.property_title || inq.property?.title || 'Property',
            buyer_name: buyerName,
            buyer_email: inq.buyer_email || inq.email || inq.buyer?.email,
            buyer_phone: inq.buyer_phone || inq.mobile || inq.buyer?.phone,
            message: inq.message || '',
            status: inq.status || 'new',
            created_at: inq.created_at || inq.created_date || '',
          };
        });

        setAllInquiries(formatted);
        setInquiries(formatted);
      } else {
        setAllInquiries([]);
        setInquiries([]);
      }
    } catch (error: any) {
      console.error('[BuilderInquiries] Error loading inquiries:', error);
      CustomAlert.alert('Error', 'Failed to load inquiries');
      setAllInquiries([]);
      setInquiries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredInquiries = useMemo(() => {
    let filtered = [...allInquiries];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(inq =>
        (inq.buyer_name || '').toLowerCase().includes(q) ||
        (inq.message || '').toLowerCase().includes(q) ||
        (inq.property_title || '').toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inq => inq.status === statusFilter);
    }
    filtered.sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });
    return filtered;
  }, [allInquiries, searchQuery, statusFilter]);

  const inquiryStats = useMemo(() => {
    const total = allInquiries.length;
    const newPending = allInquiries.filter(i => i.status === 'new').length;
    const read = allInquiries.filter(i => i.status === 'viewed').length;
    const replied = allInquiries.filter(i => i.status !== 'new' && i.status !== 'viewed').length;
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
      const response = await sellerService.updateInquiryStatus(inquiryId, 'viewed');
      if (response && response.success) loadInquiries();
    } catch (error) {
      console.error('[BuilderInquiries] Error marking as viewed:', error);
      CustomAlert.alert('Error', 'Failed to update inquiry status');
    }
  };

  const handleReply = async (inquiry: Inquiry) => {
    if (inquiry.id && inquiry.status === 'new') {
      try {
        await handleMarkAsViewed(inquiry.id);
      } catch (_) {}
    }
    if (!inquiry.buyer_id) {
      CustomAlert.alert(
        'Guest Inquiry',
        'This inquiry is from a guest user. Chat functionality is not available for guest inquiries.',
        [{text: 'OK'}],
      );
      return;
    }
    (navigation as any).navigate('BuilderTabs', {
      screen: 'Chat',
      params: {
        screen: 'ChatConversation',
        params: {
          userId: Number(inquiry.buyer_id),
          userName: inquiry.buyer_name?.trim() || 'Buyer',
          propertyId: Number(inquiry.property_id),
          propertyTitle: inquiry.property_title || 'Property',
          receiverRole: 'agent',
        },
      },
    });
  };

  const renderInquiry = ({item}: {item: Inquiry}) => (
    <TouchableOpacity
      style={styles.inquiryCard}
      onPress={() => {
        if (item.status === 'new') handleMarkAsViewed(item.id);
      }}
      activeOpacity={0.85}>
      <View style={styles.inquiryHeader}>
        <View style={styles.inquiryInfo}>
          <Text style={styles.buyerName}>{item.buyer_name}</Text>
          <Text style={styles.propertyTitle}>{item.property_title}</Text>
          <Text style={styles.inquiryDate}>{formatters.timeAgo(item.created_at)}</Text>
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
        <TouchableOpacity style={[styles.actionButton, styles.replyButton]} onPress={() => handleReply(item)}>
          <Text style={[styles.actionButtonText, styles.replyButtonText]}>💬 Chat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && inquiries.length === 0) {
    return (
      <View style={styles.container}>
        <BuilderHeader
          onProfilePress={() => (navigation as any).navigate('BuilderTabs', {screen: 'Profile'})}
          onSupportPress={() => (navigation as any).navigate('Support')}
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
      <BuilderHeader
        onProfilePress={() => (navigation as any).navigate('BuilderTabs', {screen: 'Profile'})}
        onSupportPress={() => (navigation as any).navigate('Support')}
        onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
        onLogoutPress={logout}
      />

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
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

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

      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
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
                {(['all', 'new', 'contacted', 'viewed', 'interested', 'not_interested', 'closed'] as StatusFilter[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.filterOption, statusFilter === st && styles.filterOptionActive]}
                    onPress={() => setStatusFilter(st)}
                    activeOpacity={0.8}>
                    <Text style={[styles.filterOptionText, statusFilter === st && styles.filterOptionTextActive]}>
                      {st.charAt(0).toUpperCase() + st.slice(1).replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {inquiries.length === 0 ? (
        <View style={[styles.centerContainer, {flex: 1}]}>
          <Text style={styles.emptyText}>No inquiries yet</Text>
          <Text style={styles.emptySubtext}>Inquiries from buyers will appear here</Text>
        </View>
      ) : filteredInquiries.length === 0 && searchQuery ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No inquiries found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredInquiries}
          renderItem={renderInquiry}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {useNativeDriver: true})}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
        />
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
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
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
    fontWeight: '600',
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
  searchBar: {
    flexDirection: 'row',
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
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
  emptyText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
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

export default BuilderInquiriesScreen;

