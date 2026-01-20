import React, {useState, useEffect, useMemo} from 'react';
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
import {formatters} from '../../utils/formatters';

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

  const renderInquiry = ({item}: {item: Inquiry}) => (
    <TouchableOpacity
      style={styles.inquiryCard}
      onPress={() => handleMarkAsRead(item.id)}>
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
        <SellerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onSubscriptionPress={() => navigation.navigate('Subscription')}
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
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
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
            <FlatList
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
    backgroundColor: colors.background,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.md,
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

export default SellerInquiriesScreen;

