import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {inquiryService} from '../../services/inquiry.service';
import {fixImageUrl} from '../../utils/imageHelper';

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
  status: 'new' | 'read' | 'replied';
  created_at: string;
  property_image?: string;
}

const SellerInquiriesScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await inquiryService.getInbox();
      
      if (response && response.success) {
        const inquiriesData = response.data?.inquiries || response.data || [];
        
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
        
        setInquiries(formattedInquiries);
      } else {
        setInquiries([]);
      }
    } catch (error) {
      console.error('Error loading inquiries:', error);
      Alert.alert('Error', 'Failed to load inquiries');
      setInquiries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInquiries();
  };

  const handleMarkAsRead = async (inquiryId: string | number) => {
    try {
      const response = await inquiryService.markAsRead(inquiryId);
      if (response.success) {
        loadInquiries(); // Reload to update status
      }
    } catch (error) {
      console.error('Error marking inquiry as read:', error);
    }
  };

  const handleReply = (inquiryId: string | number) => {
    // Navigate to reply screen or show reply modal
    Alert.alert('Reply', 'Reply functionality will be implemented');
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
            {new Date(item.created_at).toLocaleDateString()}
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
          onPress={() => handleReply(item.id)}>
          <Text style={[styles.actionButtonText, styles.replyButtonText]}>Reply</Text>
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
      {inquiries.length === 0 ? (
        <View style={[styles.centerContainer, {flex: 1}]}>
          <Text style={styles.emptyText}>No inquiries yet</Text>
          <Text style={styles.emptySubtext}>
            Inquiries from buyers will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={inquiries}
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
});

export default SellerInquiriesScreen;

