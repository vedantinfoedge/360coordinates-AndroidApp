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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerStackParamList} from '../../navigation/BuyerNavigator';
import {ChatStackParamList} from '../../navigation/ChatNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import {chatService} from '../../services/chat.service';
import {buyerService} from '../../services/buyer.service';
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

const ChatConversationScreen: React.FC<Props> = ({navigation, route}) => {
  const {conversationId, userId, userName, propertyId, propertyTitle, receiverRole} = route.params || {};
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

  const handleSend = async () => {
    if (!inputText.trim() || sending || !user?.id) return;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatConversationScreen.tsx:handleSend',message:'handleSend entry',data:{hasActualConversationId:!!actualConversationId,actualConversationId,textLen:inputText.trim().length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
    // #endregion
    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    
    if (!actualConversationId) {
      CustomAlert.alert('Error', 'Conversation not initialized. Please try again.');
      setSending(false);
      setInputText(messageText); // Restore message
      return;
    }
    
    try {
      // Determine senderRole from user's role
      const senderRole: 'buyer' | 'seller' | 'agent' = (user.user_type === 'buyer' || user.user_type === 'seller' || user.user_type === 'agent')
        ? user.user_type
        : 'buyer'; // Default to buyer if not specified
      
      // Send message via Firebase only (no API fallback)
      const firebaseSuccess = await chatService.sendChatMessage(
        String(actualConversationId),
        Number(user.id),
        senderRole,
        messageText,
      );
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatConversationScreen.tsx:handleSend',message:'sendChatMessage result',data:{firebaseSuccess},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      if (!firebaseSuccess) {
        CustomAlert.alert(
          'Cannot Send Message',
          'Firebase is not available. Please rebuild the app to enable chat functionality.\n\nRun: cd android && ./gradlew clean && cd .. && npm run android',
        );
        setInputText(messageText); // Restore text
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatConversationScreen.tsx:handleSend',message:'send error',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Error sending message:', error);
      CustomAlert.alert('Error', error.message || 'Failed to send message. Please try again.');
      setInputText(messageText); // Restore text
    } finally {
      setSending(false);
    }
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
    const isBuyer = user?.user_type === 'buyer';
    
    // Determine sender label based on user role (like website)
    // Buyer: "You" vs "Property Owner"
    // Seller: "You" vs "Buyer Name"
    const senderLabel = item.isSent 
      ? 'You' 
      : (isBuyer 
          ? (userName || 'Property Owner')
          : (userName || 'Buyer'));
    
    return (
      <View
        style={[
          styles.messageContainer,
          item.isSent ? styles.sentMessage : styles.receivedMessage,
        ]}>
        {!item.isSent && (
          <Text style={styles.senderLabel}>{senderLabel}</Text>
        )}
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
      </View>
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
    <View style={[styles.container, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      {/* Custom Header with Owner Name */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {participantName}
          </Text>
          {receiverRole && (
            <Text style={styles.headerRole} numberOfLines={1}>
              {receiverRole === 'agent' ? 'Agent' : 'Seller'}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.headerActionText}>⚙️</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerRole: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionText: {
    fontSize: 20,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
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
  senderLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  sentBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  receivedBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xs,
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
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.text,
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
});

export default ChatConversationScreen;

