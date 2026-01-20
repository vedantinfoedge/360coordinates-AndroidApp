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
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {AgentTabParamList} from '../../components/navigation/AgentTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import {sellerService} from '../../services/seller.service';
import {inquiryService} from '../../services/inquiry.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';

type AgentInquiriesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AgentTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: AgentInquiriesScreenNavigationProp;
};

interface Inquiry {
  id: string | number;
  property_id: string | number;
  buyer_id?: string | number;
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
          
          return {
            id: inq.id || inq.inquiry_id,
            property_id: inq.property_id,
            buyer_id: inq.buyer_id || inq.buyer?.id || inq.user_id || inq.buyer_id,
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
              
              return {
                id: inq.id || inq.inquiry_id,
                property_id: inq.property_id,
                buyer_id: inq.buyer_id || inq.buyer?.id || inq.user_id || inq.buyer_id,
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
      Alert.alert('Error', 'Failed to load inquiries');
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

  const handleReply = async (inquiry: Inquiry) => {
    // Mark inquiry as read when opening chat
    if (inquiry.id && inquiry.status === 'new') {
      try {
        await handleMarkAsRead(inquiry.id);
      } catch (error) {
        console.error('[AgentInquiries] Error marking inquiry as read:', error);
        // Continue anyway - don't block navigation
      }
    }
    
    // Navigate to chat conversation with the buyer
    const buyerId = inquiry.buyer_id || inquiry.id || inquiry.property_id;
    
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
    
    navigation.navigate('Chat' as any, {
      screen: 'ChatConversation',
      params: {
        userId: Number(buyerId),
        userName: buyerName, // Ensure this is always a name, never an ID
        propertyId: Number(propertyId),
        propertyTitle: propertyTitle,
        receiverRole: 'agent', // Agent is the receiver role in this context
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
        <AgentHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
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

export default AgentInquiriesScreen;
