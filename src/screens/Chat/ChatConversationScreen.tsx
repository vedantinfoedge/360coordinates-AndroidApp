import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerStackParamList} from '../../navigation/BuyerNavigator';
import {ChatStackParamList} from '../../navigation/ChatNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {TabIcon} from '../../components/navigation/TabIcons';
import {useAuth} from '../../context/AuthContext';
import {chatService} from '../../services/chat.service';
import {buyerService} from '../../services/buyer.service';
import {sellerService} from '../../services/seller.service';
import {propertyService} from '../../services/property.service';
import CustomAlert from '../../utils/alertHelper';
import {generateChatRoomId, markChatAsRead} from '../../services/firebase.service';

type ChatConversationScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList, 'ChatConversation'>,
  CompositeNavigationProp<
    NativeStackNavigationProp<BuyerStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

type ChatConversationScreenRouteProp = RouteProp<
  ChatStackParamList,
  'ChatConversation'
>;

type Props = {
  navigation: ChatConversationScreenNavigationProp;
  route: ChatConversationScreenRouteProp;
};

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  isSent: boolean; // true if sent by current user
}

type FlatListScrollRef = {
  scrollToEnd: (options?: {animated?: boolean}) => void;
};

const QUICK_REPLIES_BUYER = [
  'Can we negotiate price?',
  'Is it still available?',
  'I need more information',
  'When can I visit?',
];

const QUICK_REPLIES_SELLER_AGENT = [
  'When would you like to schedule a visit?',
  'I can share more details',
  'The property is available for viewing',
  'Let me know your preferred time',
];

const ChatConversationScreen: React.FC<Props> = ({navigation, route}) => {
  const {conversationId, userId, userName, propertyId, propertyTitle, receiverRole, counterpartyPhone: paramCounterpartyPhone} = route.params || {};
  const {user} = useAuth();
  const insets = useSafeAreaInsets();
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatConversationScreen.tsx:mount',message:'Route params',data:{conversationId,userId,userName,propertyId,propertyTitle,receiverRole,hasUser:!!user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
  }, [conversationId, userId, userName, propertyId, propertyTitle, receiverRole, user?.id]);
  // #endregion
  console.log('[ChatConversation] Route params:', {
    conversationId,
    userId,
    userName,
    propertyId,
    propertyTitle,
    receiverRole,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actualConversationId, setActualConversationId] = useState<string | number | null>(null);
  const [firebaseUnsubscribe, setFirebaseUnsubscribe] = useState<(() => void) | null>(null);
  const [participantName, setParticipantName] = useState<string>(userName || '');
  const [counterpartyPhone, setCounterpartyPhone] = useState<string | null>(null);
  const [counterpartyEmail, setCounterpartyEmail] = useState<string | null>(null);
  const [contactInfoVisible, setContactInfoVisible] = useState(false);
  const flatListRef = useRef<FlatListScrollRef | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inquirySentForPropertyRef = useRef<number | null>(null);

  useEffect(() => {
    let unsubscribeFn: (() => void) | null = null;
    
    const init = async () => {
      unsubscribeFn = await initializeConversation();
    };
    
    init();
    
    // Cleanup Firebase listener and polling on unmount
    return () => {
      if (unsubscribeFn && typeof unsubscribeFn === 'function') {
        unsubscribeFn();
      }
      if (firebaseUnsubscribe && typeof firebaseUnsubscribe === 'function') {
        firebaseUnsubscribe();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // This effect intentionally depends only on navigation params + user id.
    // initializeConversation creates Firestore listeners and we don't want to re-init
    // on every internal state change (like firebaseUnsubscribe).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userId, propertyId, user?.id]);

  // Update participant name when route params change
  useEffect(() => {
    if (userName && userName.trim()) {
      setParticipantName(userName);
    } else {
      // Determine default name based on user role
      const isBuyer = user?.user_type === 'buyer';
      setParticipantName(isBuyer ? 'Property Owner' : 'Buyer');
    }
  }, [userName, user?.user_type]);

  // Use passed-in counterparty phone (e.g. buyer coming from property details with seller phone)
  useEffect(() => {
    const raw = (paramCounterpartyPhone ?? '').trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10) setCounterpartyPhone(raw);
  }, [paramCounterpartyPhone]);

  // Fetch counterparty phone when not provided: buyer → seller/agent phone; agent/seller → buyer phone
  useEffect(() => {
    if (paramCounterpartyPhone?.trim()) return;
    let cancelled = false;
    const currentUserType = (user?.user_type || '').toLowerCase();
    const isBuyer = currentUserType === 'buyer';

    const fetchContact = async () => {
      try {
        if (isBuyer && propertyId) {
          const res = await buyerService.getPropertyDetails(propertyId);
          const data = (res as any)?.data;
          const property = data?.property ?? data;
          const phone =
            property?.seller_phone ||
            property?.owner?.phone ||
            property?.seller?.phone ||
            null;
          const email =
            property?.seller_email ||
            property?.owner?.email ||
            property?.seller?.email ||
            null;
          if (!cancelled) {
            setCounterpartyPhone(phone ? String(phone).trim() || null : null);
            setCounterpartyEmail(email ? String(email).trim() || null : null);
          }
        } else if (!isBuyer && userId) {
          const res: any = await sellerService.getBuyer(userId);
          const payload = res?.data?.buyer ?? res?.data?.user ?? res?.data ?? res?.buyer ?? res ?? null;
          const phone =
            payload?.phone || payload?.mobile || payload?.buyer_phone || null;
          const email = payload?.email || payload?.buyer_email || null;
          if (!cancelled) {
            setCounterpartyPhone(phone ? String(phone).trim() || null : null);
            setCounterpartyEmail(email ? String(email).trim() || null : null);
          }
        } else if (!cancelled && !paramCounterpartyPhone) {
          setCounterpartyPhone(null);
          setCounterpartyEmail(null);
        }
      } catch (_) {
        if (!cancelled) {
          setCounterpartyPhone(null);
          setCounterpartyEmail(null);
        }
      }
    };
    fetchContact();
    return () => {
      cancelled = true;
    };
  }, [user?.user_type, userId, propertyId, paramCounterpartyPhone]);

  const handlePhonePress = () => {
    const raw = counterpartyPhone?.trim();
    const digits = raw?.replace(/\D/g, '') || '';
    if (digits.length >= 10) {
      Linking.openURL(`tel:${raw}`);
    } else {
      CustomAlert.alert('Info', 'Phone number not available.');
    }
  };

  const initializeConversation = async (): Promise<(() => void) | null> => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        CustomAlert.alert('Error', 'User not authenticated');
        setLoading(false);
        return null;
      }

      const currentUserType = (user.user_type || '').toLowerCase();
      const isBuyer = currentUserType === 'buyer';

      // Resolve propertyId from params or from conversationId (format: minId_maxId_propertyId)
      let resolvedPropertyId: number | null = propertyId ? Number(propertyId) : null;
      const convIdStr = conversationId ? String(conversationId) : '';
      if ((!resolvedPropertyId || Number.isNaN(resolvedPropertyId)) && convIdStr.includes('_')) {
        const parts = convIdStr.split('_');
        if (parts.length >= 3) {
          const parsed = Number(parts[2]);
          if (!Number.isNaN(parsed) && parsed > 0) {
            resolvedPropertyId = parsed;
          }
        }
      }

      const counterpartyId = userId ? Number(userId) : NaN;
      if (!resolvedPropertyId || Number.isNaN(resolvedPropertyId) || resolvedPropertyId <= 0) {
        CustomAlert.alert('Error', 'Unable to open chat: missing propertyId');
        setLoading(false);
        return null;
      }
      if (!counterpartyId || Number.isNaN(counterpartyId) || counterpartyId <= 0) {
        CustomAlert.alert('Error', 'Unable to open chat: missing userId');
        setLoading(false);
        return null;
      }

      // Website-style deterministic room id:
      // chatRoomId = min(buyerId, posterId)_max(buyerId, posterId)_propertyId
      const buyerIdNum = isBuyer ? Number(user.id) : counterpartyId;
      const posterIdNum = isBuyer ? counterpartyId : Number(user.id);
      const posterRole: 'agent' | 'seller' =
        isBuyer
          ? (receiverRole === 'agent' ? 'agent' : 'seller')
          : (currentUserType === 'agent' ? 'agent' : 'seller');

      let roomIdToUse: string;
      try {
        roomIdToUse = generateChatRoomId(buyerIdNum, posterIdNum, resolvedPropertyId);
      } catch (err: any) {
        console.error('[Chat] Failed to generate chatRoomId:', err?.message || err);
        CustomAlert.alert('Error', 'Unable to open chat (invalid chat room id).');
        setLoading(false);
        return null;
      }

      setActualConversationId(roomIdToUse);
      
      let mysqlConversationId: string | number | null = null;
      
      // Step 1: Create backend chat room (creates inquiry in database) - as per guide
      // IMPORTANT: Backend id is NOT used as Firestore doc id. We store it as mysqlConversationId if present.
      if (isBuyer && userId && resolvedPropertyId) {
        try {
          console.log('[Chat] Creating backend chat room with:', {
            receiverId: userId,
            propertyId: resolvedPropertyId,
            buyerId: user.id
          });
          
          const roomResponse: any = await chatService.createRoom(Number(userId), Number(resolvedPropertyId));
          
          console.log('[Chat] Backend chat room API response:', JSON.stringify(roomResponse, null, 2));
          
          // Extract backend conversation/inquiry id (if any) for linkage/debug
          if (roomResponse) {
            if (roomResponse.success && roomResponse.data) {
              mysqlConversationId =
                roomResponse.data.conversation_id ||
                roomResponse.data.inquiryId ||
                roomResponse.data.id ||
                null;
            } else if (roomResponse.data) {
              mysqlConversationId =
                roomResponse.data.conversation_id ||
                roomResponse.data.inquiryId ||
                roomResponse.data.id ||
                null;
            } else {
              mysqlConversationId = (roomResponse as any).conversation_id || (roomResponse as any).inquiryId || (roomResponse as any).id || null;
            }
          }
        } catch (error: any) {
          console.error('[Chat] ❌ Error creating backend chat room:', {
            message: error?.message,
            error: error?.error,
            status: error?.status,
            response: error?.response,
            fullError: error
          });
          
          // Check if error indicates room already exists
          const errorMsg = String(error?.message || error?.error || '');
          if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
            console.log('[Chat] Chat room may already exist, continuing...');
          }
          
          // Continue anyway - room might already exist, try to use conversationId
          // No-op: Firestore room id is deterministic; backend linkage is optional.
        }

        // Ensure seller/agent receives an inquiry: send inquiry when buyer starts a new chat
        // (Seller Inquiries list reads from inquiry API; chat create-room may not create an inquiry record)
        if (
          isBuyer &&
          resolvedPropertyId &&
          !conversationId &&
          inquirySentForPropertyRef.current !== Number(resolvedPropertyId)
        ) {
          try {
            await buyerService.sendInquiry(Number(resolvedPropertyId), 'Interested in this property.');
            inquirySentForPropertyRef.current = Number(resolvedPropertyId);
            console.log('[Chat] Sent inquiry for property so seller receives it in Inquiries list');
          } catch (e) {
            console.warn('[Chat] Could not send inquiry (seller may still see chat):', e);
          }
        }
      }

      // Step 2: Ensure deterministic Firebase room exists (unless using legacy room id)
      try {
        await chatService.createFirebaseChatRoom(
          buyerIdNum,
          posterIdNum,
          posterRole,
          resolvedPropertyId,
          mysqlConversationId ? String(mysqlConversationId) : undefined,
        );
      } catch {
        console.warn('[Chat] Could not create/verify chat room');
      }

      // Mark as read when conversation is opened
      try {
        await markChatAsRead(roomIdToUse, user.id);
      } catch {
        console.warn('[Chat] Could not mark chat as read');
      }

      // Listen to messages
      const unsubscribe = chatService.listenToMessages(roomIdToUse, (newMessages) => {
        const formattedMessages: Message[] = newMessages.map((msg: any) => {
          let timestampStr = new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });

          if (msg.timestamp) {
            try {
              if (msg.timestamp.toDate && typeof msg.timestamp.toDate === 'function') {
                timestampStr = msg.timestamp.toDate().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });
              } else if (msg.timestamp instanceof Date) {
                timestampStr = msg.timestamp.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });
              }
            } catch {}
          }

          return {
            id: msg.id,
            text: msg.text || msg.message || '',
            senderId: msg.senderId || '',
            timestamp: timestampStr,
            isSent: msg.senderId === String(user.id),
          };
        });

        setMessages(formattedMessages);
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({animated: true});
        }, 100);
      });

      if (unsubscribe) {
        setFirebaseUnsubscribe(() => unsubscribe);
        setLoading(false);
        return unsubscribe;
      }

      setLoading(false);
      return null;
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatConversationScreen.tsx:initializeConversation',message:'Init error',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('[Chat] Error initializing conversation:', {
        message: error?.message,
        code: error?.code,
      });
      setLoading(false);
      return null;
    }
  };

  const sendMessage = async (messageText: string, restoreInput?: string) => {
    if (!messageText.trim() || sending || !user?.id) return;
    setSending(true);
    if (!actualConversationId) {
      CustomAlert.alert('Error', 'Conversation not initialized. Please try again.');
      setSending(false);
      if (restoreInput !== undefined) setInputText(restoreInput);
      return;
    }
    try {
      const senderRole: 'buyer' | 'seller' | 'agent' =
        user.user_type === 'buyer' || user.user_type === 'seller' || user.user_type === 'agent'
          ? user.user_type
          : 'buyer';
      const firebaseSuccess = await chatService.sendChatMessage(
        String(actualConversationId),
        Number(user.id),
        senderRole,
        messageText.trim(),
      );
      if (!firebaseSuccess) {
        CustomAlert.alert(
          'Cannot Send Message',
          'Firebase is not available. Please rebuild the app to enable chat functionality.\n\nRun: cd android && ./gradlew clean && cd .. && npm run android',
        );
        if (restoreInput !== undefined) setInputText(restoreInput);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      CustomAlert.alert('Error', error.message || 'Failed to send message. Please try again.');
      if (restoreInput !== undefined) setInputText(restoreInput);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending || !user?.id) return;
    const messageText = inputText.trim();
    setInputText('');
    await sendMessage(messageText, messageText);
  };

  const handleQuickReply = (text: string) => {
    if (sending || !user?.id) return;
    sendMessage(text);
  };

  const handleDeleteMessage = (item: Message) => {
    if (!actualConversationId || !item.id) return;
    CustomAlert.alert(
      'Delete message?',
      'This message will be removed for everyone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await chatService.deleteMessage(String(actualConversationId), item.id);
            if (!ok) CustomAlert.alert('Error', 'Could not delete message.');
          },
        },
      ],
    );
  };

  const handleDeleteConversation = () => {
    if (!actualConversationId) return;
    CustomAlert.alert(
      'Delete conversation?',
      'This will remove the entire chat and all messages for both participants. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await chatService.deleteConversation(String(actualConversationId));
            if (ok) {
              navigation.goBack();
            } else {
              CustomAlert.alert('Error', 'Could not delete conversation.');
            }
          },
        },
      ],
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Refresh is handled by Firebase listener - messages update automatically
    // Just reset refreshing state after a short delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderMessage = ({item}: {item: Message}) => {
    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          item.isSent ? styles.sentMessage : styles.receivedMessage,
        ]}
        onLongPress={() => item.isSent && handleDeleteMessage(item)}
        activeOpacity={1}
        delayLongPress={400}>
        <View
          style={[
            styles.messageBubble,
            item.isSent ? styles.sentBubble : styles.receivedBubble,
          ]}>
          <Text
            style={[
              styles.messageText,
              item.isSent ? styles.sentText : styles.receivedText,
            ]}>
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              item.isSent ? styles.sentTime : styles.receivedTime,
            ]}>
            {item.timestamp}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Update participant name when route params change
  useEffect(() => {
    console.log('[ChatConversation] Updating participant name:', {
      userName,
      userType: user?.user_type,
    });
    
    if (userName && userName.trim() && userName !== 'Buyer' && userName !== 'Property Owner') {
      setParticipantName(userName.trim());
    } else {
      // Determine default name based on user role
      const isBuyer = user?.user_type === 'buyer';
      const defaultName = isBuyer ? 'Property Owner' : 'Buyer';
      setParticipantName(defaultName);
      console.log('[ChatConversation] Using default name:', defaultName);
    }
  }, [userName, user?.user_type]);

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom}]}>
      {/* Custom Header: extends to top (no white space), back, avatar, name, call, more */}
      <View style={[styles.chatHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerAvatarWrap}
          onPress={() => setContactInfoVisible(true)}
          activeOpacity={0.8}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText} numberOfLines={1}>
              {participantName
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => (w[0] || '').toUpperCase())
                .join('') || '?'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => setContactInfoVisible(true)}
          activeOpacity={0.8}>
          <Text style={styles.headerName} numberOfLines={1}>
            {participantName}
          </Text>
          <Text style={styles.headerStatus}>
            {(receiverRole === 'agent' ? 'Agent' : receiverRole === 'seller' ? 'Seller' : 'Buyer')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={handlePhonePress}
          accessibilityLabel="Call">
          <Text style={styles.headerActionText}>📞</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => setContactInfoVisible(true)}
          accessibilityLabel="Contact Info">
          <Text style={styles.headerActionText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef as any}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item: Message) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({animated: true})
            }
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
              </View>
            }
          />
        )}

        {/* Quick replies when conversation is new (same UI for buyer/seller/agent) */}
        {!loading && messages.length === 0 && (
          <View style={styles.quickRepliesContainer}>
            {(user?.user_type === 'buyer' ? QUICK_REPLIES_BUYER : QUICK_REPLIES_SELLER_AGENT).map(
              (text) => (
                <TouchableOpacity
                  key={text}
                  style={styles.quickReplyChip}
                  onPress={() => handleQuickReply(text)}
                  disabled={sending}>
                  <Text style={styles.quickReplyText} numberOfLines={1}>
                    {text}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}>
            {sending ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Contact Info modal - Call, Delete, Email only */}
      <Modal
        visible={contactInfoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactInfoVisible(false)}>
        <View style={[styles.contactInfoModal, { paddingTop: insets.top }]}>
          <View style={styles.contactInfoHeader}>
            <TouchableOpacity
              style={styles.contactInfoBackBtn}
              onPress={() => setContactInfoVisible(false)}
              activeOpacity={0.7}>
              <Text style={styles.contactInfoBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.contactInfoTitle}>Contact Info</Text>
          </View>
          <View style={styles.contactInfoHero}>
            <View style={styles.contactInfoBigAvatar}>
              <Text style={styles.contactInfoBigAvatarText}>
                {participantName
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => (w[0] || '').toUpperCase())
                  .join('') || '?'}
              </Text>
            </View>
            <Text style={styles.contactInfoName}>{participantName}</Text>
            <Text style={styles.contactInfoSince}>📅 Member since</Text>
            <View style={styles.ownerActions}>
              <TouchableOpacity
                style={styles.ownerActionItem}
                onPress={() => {
                  setContactInfoVisible(false);
                  handlePhonePress();
                }}
                activeOpacity={0.7}>
                <View style={styles.ownerActionIcon}>
                  <Text style={styles.ownerActionEmoji}>📞</Text>
                </View>
                <Text style={styles.ownerActionLabel}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ownerActionItem}
                onPress={() => {
                  setContactInfoVisible(false);
                  handleDeleteConversation();
                }}
                activeOpacity={0.7}>
                <View style={styles.ownerActionIcon}>
                  <Text style={styles.ownerActionEmoji}>🗑️</Text>
                </View>
                <Text style={styles.ownerActionLabel}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ownerActionItem}
                onPress={() => {
                  const email = counterpartyEmail?.trim();
                  if (email) Linking.openURL(`mailto:${email}`);
                  else CustomAlert.alert('Info', 'Email not available.');
                  setContactInfoVisible(false);
                }}
                activeOpacity={0.7}>
                <View style={styles.ownerActionIcon}>
                  <Text style={styles.ownerActionEmoji}>✉️</Text>
                </View>
                <Text style={styles.ownerActionLabel}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.contactInfoScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.contactInfoSection}>
              <Text style={styles.contactInfoSectionLabel}>CONTACT DETAILS</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Text>📞</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Mobile Number</Text>
                  <TouchableOpacity
                    onPress={() => counterpartyPhone && Linking.openURL(`tel:${counterpartyPhone}`)}>
                    <Text style={[styles.infoValue, styles.infoValueLink]}>
                      {counterpartyPhone || '—'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Text>✉️</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <TouchableOpacity
                    onPress={() => counterpartyEmail && Linking.openURL(`mailto:${counterpartyEmail}`)}>
                    <Text style={[styles.infoValue, styles.infoValueLink]}>
                      {counterpartyEmail || '—'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 18,
    minHeight: 72,
    backgroundColor: colors.secondary,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerAvatarWrap: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    ...typography.h3,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerStatus: {
    fontSize: 11,
    color: 'rgba(199,238,255,0.65)',
    marginTop: 1,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.surface,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerActionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  propBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryXlight || '#e8f7ff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border || colors.borderRef,
  },
  propBarIcon: {
    fontSize: 20,
  },
  propBarText: {
    flex: 1,
  },
  propBarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 14,
    paddingBottom: spacing.sm,
    backgroundColor: '#f0f4f8',
  },
  messageContainer: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: colors.primary,
  },
  receivedBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  sentText: {
    color: colors.surface,
  },
  receivedText: {
    color: colors.text,
  },
  messageTime: {
    ...typography.small,
    alignSelf: 'flex-end',
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.text,
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  sendButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 200,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickReplyChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  quickReplyText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  // Contact Info modal (Call, Delete, Email only)
  contactInfoModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contactInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.secondary,
  },
  contactInfoBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfoBackText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contactInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(199,238,255,0.8)',
  },
  contactInfoHero: {
    backgroundColor: colors.secondary,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  contactInfoBigAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(199,238,255,0.3)',
  },
  contactInfoBigAvatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  contactInfoName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  contactInfoSince: {
    fontSize: 12,
    color: 'rgba(199,238,255,0.6)',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 18,
  },
  ownerActionItem: {
    alignItems: 'center',
    gap: 6,
  },
  ownerActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(199,238,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(199,238,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerActionEmoji: {
    fontSize: 20,
  },
  ownerActionLabel: {
    fontSize: 11,
    color: 'rgba(199,238,255,0.7)',
    fontWeight: '600',
  },
  contactInfoScroll: {
    flex: 1,
  },
  contactInfoSection: {
    backgroundColor: colors.surface,
    paddingTop: 8,
  },
  contactInfoSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderRef || colors.border,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.primaryXlight || '#e8f7ff',
    borderWidth: 1,
    borderColor: colors.borderRef || colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  infoValueLink: {
    color: colors.primary,
  },
});

export default ChatConversationScreen;

