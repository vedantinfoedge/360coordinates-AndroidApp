import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
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
import {createOrGetChatRoom, sendMessage, listenToMessages, Message} from '../../services/firebase.service';
import firestore from '@react-native-firebase/firestore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

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
  buyer_id: string | number;
  property_title?: string;
  buyer_name: string;
  buyer_email?: string;
  buyer_phone?: string;
  buyer_profile_image?: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'contacted' | 'interested' | 'not_interested' | 'closed';
  created_at: string;
  property_image?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'agent' | 'buyer';
  senderId: string;
  timestamp: Date;
}

const AgentInquiriesScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [chatMessage, setChatMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<Record<string, Date>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadInquiries();
  }, []);

  // Cleanup Firebase listener on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Listen to messages when inquiry is selected
  useEffect(() => {
    if (!selectedInquiry || !selectedChatRoomId || !user?.id) return;

    // Cleanup previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    console.log('[AgentInquiries] Setting up Firebase listener for chatRoomId:', selectedChatRoomId);

    const unsubscribe = listenToMessages(selectedChatRoomId, (firebaseMessages, error) => {
      if (error) {
        console.error('[AgentInquiries] Error listening to messages:', error);
        return;
      }

      // Transform Firebase messages to UI format
      const transformed: ChatMessage[] = firebaseMessages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.senderRole === 'agent' ? 'agent' : 'buyer',
        senderId: msg.senderId,
        timestamp: msg.timestamp,
      }));

      setChatMessages(prev => ({
        ...prev,
        [selectedInquiry.id]: transformed,
      }));

      // Update last read timestamp when viewing chat
      updateLastReadAt(selectedInquiry.id);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [selectedInquiry, selectedChatRoomId, user?.id]);

  // Calculate unread counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    
    Object.keys(chatMessages).forEach(inquiryId => {
      const inquiry = allInquiries.find(i => String(i.id) === inquiryId);
      if (!inquiry) return;

      const messages = chatMessages[inquiryId] || [];
      const readTimestamp = lastReadAt[inquiryId];
      
      if (readTimestamp) {
        const unread = messages.filter(msg => 
          msg.sender === 'buyer' && 
          new Date(msg.timestamp) > readTimestamp
        ).length;
        counts[inquiryId] = unread;
      } else {
        // Count all buyer messages if never read
        const unread = messages.filter(msg => msg.sender === 'buyer').length;
        counts[inquiryId] = unread;
      }
    });

    setUnreadCounts(counts);
  }, [chatMessages, lastReadAt, allInquiries]);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response: any = await sellerService.getInquiries({
        page: 1,
        limit: 100,
      });
      
      if (response && response.success) {
        const inquiriesData = response.data?.inquiries || response.data || [];
        
        const formattedInquiries = inquiriesData.map((inq: any) => ({
          id: inq.id || inq.inquiry_id,
          property_id: inq.property_id,
          buyer_id: inq.buyer_id || inq.buyer?.id || inq.user_id,
          property_title: inq.property_title || inq.property?.title || 'Property',
          buyer_name: inq.buyer_name || inq.name || inq.buyer?.full_name || 'Buyer',
          buyer_email: inq.buyer_email || inq.email || inq.buyer?.email,
          buyer_phone: inq.buyer_phone || inq.mobile || inq.buyer?.phone,
          buyer_profile_image: inq.buyer_profile_image || inq.buyer?.profile_image,
          message: inq.message || '',
          status: inq.status || 'new',
          created_at: inq.created_at || inq.created_date || '',
          property_image: fixImageUrl(inq.property_image || inq.property?.cover_image || ''),
        }));
        
        setAllInquiries(formattedInquiries);
        setInquiries(formattedInquiries);
      } else {
        // Try fallback endpoint
        try {
          const fallbackResponse = await inquiryService.getInbox();
          if (fallbackResponse && fallbackResponse.success) {
            const inquiriesData = fallbackResponse.data?.inquiries || fallbackResponse.data || [];
            const formattedInquiries = inquiriesData.map((inq: any) => ({
              id: inq.id || inq.inquiry_id,
              property_id: inq.property_id,
              buyer_id: inq.buyer_id || inq.buyer?.id || inq.user_id,
              property_title: inq.property_title || inq.property?.title || 'Property',
              buyer_name: inq.buyer_name || inq.buyer?.full_name || inq.name || 'Buyer',
              buyer_email: inq.buyer_email || inq.buyer?.email,
              buyer_phone: inq.buyer_phone || inq.buyer?.phone,
              buyer_profile_image: inq.buyer_profile_image || inq.buyer?.profile_image,
              message: inq.message || '',
              status: inq.status || 'new',
              created_at: inq.created_at || inq.created_date || '',
              property_image: fixImageUrl(inq.property_image || inq.property?.cover_image || ''),
            }));
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

  const handleSelectInquiry = async (inquiry: Inquiry) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setSelectedInquiry(inquiry);
      
      // Generate/retrieve chat room ID using website format: minId_maxId_propertyId
      const buyerId = Number(inquiry.buyer_id);
      const agentId = Number(user.id);
      const propertyId = Number(inquiry.property_id);

      if (!buyerId || !agentId || !propertyId) {
        Alert.alert('Error', 'Missing required information for chat');
        return;
      }

      console.log('[AgentInquiries] Creating/getting chat room:', {
        buyerId,
        agentId,
        propertyId,
      });

      const chatRoomId = await createOrGetChatRoom(
        buyerId,
        agentId,
        'agent',
        propertyId
      );

      console.log('[AgentInquiries] Chat room ID:', chatRoomId);
      setSelectedChatRoomId(chatRoomId);

      // Mark inquiry as read
      try {
        await sellerService.updateInquiryStatus(inquiry.id, 'read');
      } catch (error) {
        console.warn('Failed to mark inquiry as read:', error);
      }
    } catch (error: any) {
      console.error('[AgentInquiries] Error selecting inquiry:', error);
      Alert.alert('Error', error?.message || 'Failed to open chat');
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || sending || !selectedInquiry || !selectedChatRoomId || !user?.id) {
      return;
    }

    const messageText = chatMessage.trim();
    setChatMessage('');
    setSending(true);

    try {
      const buyerId = Number(selectedInquiry.buyer_id);
      const agentId = Number(user.id);
      const propertyId = Number(selectedInquiry.property_id);

      // Ensure chat room exists
      if (!selectedChatRoomId) {
        const chatRoomId = await createOrGetChatRoom(
          buyerId,
          agentId,
          'agent',
          propertyId
        );
        setSelectedChatRoomId(chatRoomId);
      }

      // Send message to Firebase
      await sendMessage(
        selectedChatRoomId,
        agentId,
        'agent',
        messageText
      );

      // Update inquiry status to 'replied'
      try {
        await sellerService.updateInquiryStatus(selectedInquiry.id, 'replied');
        // Update local state
        setInquiries(prev =>
          prev.map(i =>
            i.id === selectedInquiry.id ? {...i, status: 'replied'} : i
          )
        );
        setAllInquiries(prev =>
          prev.map(i =>
            i.id === selectedInquiry.id ? {...i, status: 'replied'} : i
          )
        );
      } catch (error) {
        console.warn('Failed to update inquiry status:', error);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    } catch (error: any) {
      console.error('[AgentInquiries] Error sending message:', error);
      Alert.alert('Error', error?.message || 'Failed to send message');
      setChatMessage(messageText); // Restore message
    } finally {
      setSending(false);
    }
  };

  const updateLastReadAt = async (inquiryId: string | number) => {
    const now = new Date();
    setLastReadAt(prev => ({
      ...prev,
      [inquiryId]: now,
    }));

    // Update in Firebase if we have chat room
    if (selectedChatRoomId && user?.id) {
      try {
        await firestore()
          .collection('chats')
          .doc(selectedChatRoomId)
          .update({
            [`lastReadAt.${user.id}`]: firestore.FieldValue.serverTimestamp(),
          });
      } catch (error) {
        console.warn('Failed to update lastReadAt in Firebase:', error);
      }
    }
  };

  const handleCloseChat = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setSelectedInquiry(null);
    setSelectedChatRoomId(null);
    setChatMessage('');
  };

  const renderInquiry = ({item}: {item: Inquiry}) => {
    const unreadCount = unreadCounts[String(item.id)] || 0;
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.inquiryCard}
        onPress={() => handleSelectInquiry(item)}>
        <View style={styles.inquiryHeader}>
          <View style={styles.inquiryInfo}>
            <Text style={styles.buyerName}>{item.buyer_name}</Text>
            <Text style={styles.propertyTitle}>{item.property_title}</Text>
            <Text style={styles.inquiryDate}>
              {formatters.timeAgo(item.created_at)}
            </Text>
          </View>
          <View style={styles.inquiryBadges}>
            {item.status === 'new' && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            )}
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.inquiryMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderChatMessage = ({item}: {item: ChatMessage}) => {
    const isAgent = item.sender === 'agent';
    const timeStr = formatters.timeAgo(item.timestamp.toISOString());

    return (
      <View
        style={[
          styles.chatMessageContainer,
          isAgent ? styles.chatMessageAgent : styles.chatMessageBuyer,
        ]}>
        <View
          style={[
            styles.chatBubble,
            isAgent ? styles.chatBubbleAgent : styles.chatBubbleBuyer,
          ]}>
          <Text style={styles.chatMessageText}>{item.text}</Text>
          <Text
            style={[
              styles.chatMessageTime,
              isAgent ? styles.chatMessageTimeAgent : styles.chatMessageTimeBuyer,
            ]}>
            {timeStr}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatContent = () => {
    if (!selectedInquiry) return null;

    const messages = chatMessages[selectedInquiry.id] || [];
    const allMessages = [
      // Initial inquiry message
      {
        id: 'initial-inquiry',
        text: selectedInquiry.message,
        sender: 'buyer' as const,
        senderId: String(selectedInquiry.buyer_id),
        timestamp: new Date(selectedInquiry.created_at),
      },
      // Chat messages
      ...messages,
    ];

    return (
      <Modal
        visible={!!selectedInquiry}
        animationType="slide"
        onRequestClose={handleCloseChat}>
        <SafeAreaView style={styles.chatContainer} edges={['top', 'bottom']}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleCloseChat} style={styles.chatBackButton}>
              <Text style={styles.chatBackIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName}>{selectedInquiry.buyer_name}</Text>
              <Text style={styles.chatHeaderProperty}>{selectedInquiry.property_title}</Text>
            </View>
          </View>

          {/* Messages Area */}
          <FlatList
            ref={flatListRef}
            data={allMessages}
            renderItem={renderChatMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatMessagesContent}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({animated: true});
            }}
            ListEmptyComponent={
              <View style={styles.chatEmptyContainer}>
                <Text style={styles.chatEmptyText}>No messages yet</Text>
              </View>
            }
          />

          {/* Input Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.textSecondary}
                value={chatMessage}
                onChangeText={setChatMessage}
                multiline
                maxLength={1000}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendButton,
                  (!chatMessage.trim() || sending) && styles.chatSendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!chatMessage.trim() || sending}>
                {sending ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.chatSendIcon}>➤</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading && inquiries.length === 0) {
    return (
      <View style={styles.container}>
        <AgentHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={logout}
        />
        <View style={styles.centerContainer}>
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
      
      {inquiries.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No inquiries yet</Text>
          <Text style={styles.emptySubtext}>
            Inquiries from potential buyers will appear here
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
              onRefresh={loadInquiries}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {renderChatContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
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
  inquiryBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
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
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    ...typography.small,
    color: colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  inquiryMessage: {
    ...typography.body,
    color: colors.text,
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
  // Chat Styles
  chatContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatBackButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  chatBackIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  chatHeaderProperty: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  chatMessagesContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  chatMessageContainer: {
    marginBottom: spacing.md,
  },
  chatMessageAgent: {
    alignItems: 'flex-end',
  },
  chatMessageBuyer: {
    alignItems: 'flex-start',
  },
  chatBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  chatBubbleAgent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  chatBubbleBuyer: {
    backgroundColor: colors.surfaceSecondary,
    borderBottomLeftRadius: borderRadius.xs,
  },
  chatMessageText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  chatMessageTime: {
    ...typography.caption,
    fontSize: 10,
  },
  chatMessageTimeAgent: {
    color: colors.surface,
    opacity: 0.8,
  },
  chatMessageTimeBuyer: {
    color: colors.textSecondary,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  chatSendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendButtonDisabled: {
    opacity: 0.5,
  },
  chatSendIcon: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  chatEmptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default AgentInquiriesScreen;
