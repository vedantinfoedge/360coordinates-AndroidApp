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
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {sellerService} from '../../services/seller.service';
import {inquiryService} from '../../services/inquiry.service';
import {fixImageUrl} from '../../utils/imageHelper';
import CustomAlert from '../../utils/alertHelper';
import {formatters, capitalize} from '../../utils/formatters';

type SellerInquiriesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<SellerTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SellerInquiriesScreenNavigationProp;
};

interface Inquiry {
  id: string | number;
  property_id: string | number;
  property_title?: string;
  buyer_name: string;
  buyer_email?: string;
  buyer_phone?: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'contacted' | 'interested' | 'not_interested' | 'closed';
  created_at: string;
  property_image?: string;
}

type StatusFilter = 'all' | 'new' | 'read' | 'replied' | 'contacted' | 'interested' | 'not_interested' | 'closed';

const SellerInquiriesScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [propertyFilter, setPropertyFilter] = useState<number | null>(null);
  
  // Scroll animation for header hide/show
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      // Use seller service endpoint for inquiries
      const response: any = await sellerService.getInquiries({
        page: 1,
        limit: 100,
      });
      
      if (response && response.success) {
        const inquiriesData = response.data?.inquiries || response.data || [];
        
        const formattedInquiries = inquiriesData.map((inq: any) => ({
          id: inq.id || inq.inquiry_id,
          property_id: inq.property_id,
          property_title: inq.property_title || inq.property?.title || 'Property',
          buyer_name: inq.buyer_name || inq.name || inq.buyer?.full_name || 'Buyer',
          buyer_email: inq.buyer_email || inq.email || inq.buyer?.email,
          buyer_phone: inq.buyer_phone || inq.mobile || inq.buyer?.phone,
          message: inq.message || '',
          status: inq.status || 'new',
          created_at: inq.created_at || inq.created_date || '',
          property_image: fixImageUrl(inq.property_image || inq.property?.cover_image || ''),
        }));
        
        setAllInquiries(formattedInquiries);
        setInquiries(formattedInquiries);
      } else {
        setAllInquiries([]);
        setInquiries([]);
      }
    } catch (error: any) {
      console.error('Error loading inquiries:', error);
      // Try fallback endpoint
      try {
        const fallbackResponse = await inquiryService.getInbox();
        if (fallbackResponse && fallbackResponse.success) {
          const inquiriesData = fallbackResponse.data?.inquiries || fallbackResponse.data || [];
          const formattedInquiries = inquiriesData.map((inq: any) => ({
            id: inq.id || inq.inquiry_id,
            property_id: inq.property_id,
            property_title: inq.property_title || inq.property?.title || 'Property',
            buyer_name: inq.buyer_name || inq.buyer?.full_name || inq.name || 'Buyer',
            buyer_email: inq.buyer_email || inq.buyer?.email,
            buyer_phone: inq.buyer_phone || inq.buyer?.phone,
            message: inq.message || '',
            status: inq.status || 'new',
            created_at: inq.created_at || inq.created_date || '',
            property_image: fixImageUrl(inq.property_image || inq.property?.cover_image || ''),
          }));
          setAllInquiries(formattedInquiries);
          setInquiries(formattedInquiries);
        } else {
          setAllInquiries([]);
          setInquiries([]);
        }
      } catch (fallbackError) {
        CustomAlert.alert('Error', 'Failed to load inquiries');
        setAllInquiries([]);
        setInquiries([]);
      }
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

  const handleRefresh = () => {
    setRefreshing(true);
    loadInquiries();
  };

  const handleMarkAsRead = async (inquiryId: string | number) => {
    try {
      const response = await sellerService.updateInquiryStatus(inquiryId, 'read');
      if (response && response.success) {
        loadInquiries(); // Reload to update status
      }
    } catch (error) {
      console.error('Error marking inquiry as read:', error);
      // Try fallback
      try {
        const fallbackResponse = await inquiryService.markAsRead(inquiryId);
        if (fallbackResponse.success) {
          loadInquiries();
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  const handleReply = (inquiry: Inquiry) => {
    // Navigate to chat conversation with the buyer
    const buyerId = inquiry.id || inquiry.property_id;
    const buyerName = inquiry.buyer_name || 'Buyer';
    const propertyId = inquiry.property_id;
    const propertyTitle = inquiry.property_title || 'Property';
    
    navigation.navigate('Chat' as any, {
      screen: 'ChatConversation',
      params: {
        userId: Number(buyerId),
        userName: buyerName,
        propertyId: Number(propertyId),
        propertyTitle: propertyTitle,
      },
    });
  };

  const renderInquiry = ({item}: {item: Inquiry}) => {
    const [expanded, setExpanded] = React.useState(false);
    const messageLines = item.message.split('\n').length;
    const shouldTruncate = !expanded && messageLines > 2;
    
    return (
      <TouchableOpacity
        style={styles.inquiryCard}
        onPress={() => handleMarkAsRead(item.id)}
        activeOpacity={0.9}>
        <View style={styles.inquiryHeader}>
          <View style={styles.inquiryHeaderLeft}>
            <View style={styles.buyerAvatarPlaceholder}>
              <Text style={styles.buyerAvatarText}>
                {item.buyer_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.inquiryInfo}>
              <Text style={styles.buyerName}>{item.buyer_name}</Text>
              <Text style={styles.propertyTitle}>{capitalize(item.property_title)}</Text>
              <Text style={styles.inquiryDate}>
                {formatters.timeAgo(item.created_at)}
              </Text>
            </View>
          </View>
          {item.status === 'new' && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          )}
        </View>
        <Text style={styles.inquiryMessage} numberOfLines={expanded ? undefined : 2}>
          {item.message}
        </Text>
        {shouldTruncate && (
          <TouchableOpacity
            onPress={() => setExpanded(true)}
            style={styles.readMoreButton}>
            <Text style={styles.readMoreText}>Read more</Text>
          </TouchableOpacity>
        )}
        <View style={styles.inquiryActions}>
          {item.buyer_phone && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Handle phone call
              }}
              activeOpacity={0.7}>
              <Text style={styles.actionButtonText}>📞 Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.replyButton]}
            onPress={() => handleReply(item)}
            activeOpacity={0.7}>
            <Text style={[styles.actionButtonText, styles.replyButtonText]}>💬 Chat</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && inquiries.length === 0) {
    return (
      <View style={styles.container}>
        <SellerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onSubscriptionPress={() => navigation.navigate('Subscription')}
          onLogoutPress={logout}
          scrollY={scrollY}
        />
        <View style={[styles.centerContainer, {flex: 1, marginTop: spacing.md}]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading inquiries...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
        scrollY={scrollY}
      />
      
      {/* Search and Filter Bar */}
      <View style={[styles.searchBar, {marginTop: spacing.md}]}>
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
                {(['all', 'new', 'read', 'replied', 'contacted', 'interested', 'not_interested', 'closed'] as StatusFilter[]).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      statusFilter === status && styles.filterOptionActive,
                    ]}
                    onPress={() => setStatusFilter(status)}
                    activeOpacity={0.7}>
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
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
          </View>
          <Text style={styles.emptyTitle}>No Inquiries Yet</Text>
          <Text style={styles.emptySubtext}>
            Inquiries from buyers will appear here when they contact you about your properties
          </Text>
        </View>
      ) : (
        <>
          {filteredInquiries.length === 0 && searchQuery ? (
            <View style={styles.centerContainer}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
              </View>
              <Text style={styles.emptyTitle}>No Inquiries Found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search terms or filters to find what you're looking for
              </Text>
            </View>
          ) : (
            <Animated.FlatList
              data={filteredInquiries}
              renderItem={renderInquiry}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                />
              }
              onScroll={Animated.event(
                [{nativeEvent: {contentOffset: {y: scrollY}}}],
                {useNativeDriver: true}
              )}
              scrollEventThrottle={16}
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
    backgroundColor: '#FAFAFA', // Clean off-white
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
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
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inquiryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  buyerAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerAvatarText: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 17,
  },
  inquiryInfo: {
    flex: 1,
  },
  buyerName: {
    fontSize: 16,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '600',
    marginBottom: 3,
    lineHeight: 22,
  },
  propertyTitle: {
    ...typography.body,
    color: colors.primary,
    marginBottom: 3,
    fontSize: 13,
  },
  inquiryDate: {
    ...typography.caption,
    color: '#9CA3AF',
    fontSize: 12,
  },
  newBadge: {
    backgroundColor: '#E3F6FF', // Light blue background
    borderRadius: 20,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  inquiryMessage: {
    ...typography.body,
    color: '#374151',
    marginBottom: spacing.sm,
    lineHeight: 22,
    fontSize: 14,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  readMoreText: {
    ...typography.body,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  inquiryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  replyButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    ...typography.caption,
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  replyButtonText: {
    color: colors.surface,
  },
  loadingText: {
    ...typography.body,
    color: '#6B7280',
    marginTop: spacing.md,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#E3F6FF', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
    lineHeight: 28,
  },
  emptySubtext: {
    ...typography.body,
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: spacing.sm,
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
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
    fontSize: 14,
    height: 46,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#E3F6FF', // Light blue
    borderRadius: 12,
    justifyContent: 'center',
    height: 46,
  },
  filterButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
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
  modalTitle: {
    fontSize: 20,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
  },
  filterLabel: {
    ...typography.body,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '600',
    marginBottom: spacing.md,
    fontSize: 15,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
  },
  filterOptionText: {
    ...typography.body,
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  applyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default SellerInquiriesScreen;

