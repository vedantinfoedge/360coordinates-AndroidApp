import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {ChatStackParamList} from '../../navigation/ChatNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import {chatService} from '../../services/chat.service';

type ChatConversationScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList, 'ChatConversation'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<BuyerTabParamList>,
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

const ChatConversationScreen: React.FC<Props> = ({navigation, route}) => {
  const {conversationId, userId, userName, propertyId, propertyTitle} = route.params || {};
  const {logout, user} = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actualConversationId, setActualConversationId] = useState<string | number | null>(null);
  const [firebaseUnsubscribe, setFirebaseUnsubscribe] = useState<(() => void) | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let unsubscribeFn: (() => void) | null = null;
    
    const init = async () => {
      unsubscribeFn = await initializeConversation();
    };
    
    init();
    
    // Cleanup Firebase listener on unmount
    return () => {
      if (unsubscribeFn && typeof unsubscribeFn === 'function') {
        unsubscribeFn();
      }
      if (firebaseUnsubscribe && typeof firebaseUnsubscribe === 'function') {
        firebaseUnsubscribe();
      }
    };
  }, [conversationId, userId, propertyId, user?.id]);

  const initializeConversation = async (): Promise<(() => void) | null> => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }
      
      // Step 1: Create backend chat room (creates inquiry in database) - as per guide
      if (userId && propertyId) {
        try {
          await chatService.createRoom(Number(userId), Number(propertyId));
        } catch (error) {
          console.error('Error creating backend chat room:', error);
          // Continue anyway - room might already exist
        }
      }
      
      // Step 2: Create Firebase chat room - as per guide
      if (userId && propertyId) {
        try {
          const firebaseRoomId = await chatService.createFirebaseChatRoom(
            Number(user?.id),
            Number(userId),
            Number(propertyId),
          );
          
          if (firebaseRoomId) {
            setActualConversationId(firebaseRoomId);
            
            // Step 3: Listen to messages via Firebase - as per guide
            const unsubscribe = chatService.listenToMessages(firebaseRoomId, (newMessages) => {
              const formattedMessages: Message[] = newMessages.map((msg: any) => ({
                id: msg.id,
                text: msg.message || '',
                senderId: msg.senderId || '',
                timestamp: msg.timestamp?.toDate?.().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                }) || new Date().toLocaleTimeString(),
                isSent: msg.senderId === String(user.id),
              }));
              setMessages(formattedMessages);
              
              // Scroll to bottom when new messages arrive
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({animated: true});
              }, 100);
            });
            
            // Return unsubscribe function for cleanup
            if (unsubscribe) {
              setFirebaseUnsubscribe(() => unsubscribe);
              setLoading(false);
              return unsubscribe;
            }
          }
        } catch (error) {
          console.error('Error initializing Firebase chat:', error);
          // Fallback to API-based chat if Firebase fails
          if (conversationId) {
            setActualConversationId(conversationId);
            await loadMessages(conversationId);
          }
        }
      } else if (conversationId) {
        // Use provided conversationId
        setActualConversationId(conversationId);
        await loadMessages(conversationId);
      } else {
        Alert.alert('Error', 'Unable to initialize conversation. Missing required parameters.');
        setLoading(false);
      }
      
      setLoading(false);
      return null;
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setLoading(false);
      return null;
    }
  };

  useEffect(() => {
    initializeConversation();
    // Cleanup will be handled by the unsubscribe function returned from initializeConversation
  }, [conversationId, userId, propertyId, user?.id]);

  const loadMessages = async (convId: string | number | null, showLoading: boolean = true) => {
    if (!convId) {
      console.warn('Cannot load messages: conversation ID is missing');
      if (showLoading) {
        setLoading(false);
      }
      return;
    }
    
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const response = await chatService.getMessages(convId);
      
      if (response && response.success) {
        const messagesData = response.data?.messages || response.data || [];
        
        // Format messages
        const formatted = messagesData.map((msg: any) => {
          const isSent = String(msg.sender_id || msg.senderId) === String(user?.id || user?.user_id);
          
          // Format timestamp
          let timestamp = 'Just now';
          if (msg.timestamp || msg.created_at) {
            const date = new Date(msg.timestamp || msg.created_at);
            timestamp = date.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });
          }
          
          return {
            id: msg.id?.toString() || msg.message_id?.toString() || Date.now().toString(),
            text: msg.message || msg.text || '',
            senderId: String(msg.sender_id || msg.senderId || ''),
            timestamp,
            isSent,
          };
        });
        
        setMessages(formatted);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      if (showLoading) {
        Alert.alert('Error', error.message || 'Failed to load messages');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending || !user?.id) return;
    
    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    
    if (!actualConversationId) {
      Alert.alert('Error', 'Conversation not initialized. Please try again.');
      setSending(false);
      setInputText(messageText); // Restore message
      return;
    }
    
    try {
      // Try Firebase first (as per guide - Step 3: Send message)
      const firebaseSuccess = await chatService.sendChatMessage(
        String(actualConversationId),
        Number(user.id),
        messageText,
      );
      
      if (!firebaseSuccess) {
        // Fallback to API if Firebase fails
        const response = await chatService.sendMessage(actualConversationId, messageText);
        if (!response || !response.success) {
          Alert.alert('Error', 'Failed to send message. Please try again.');
          setInputText(messageText); // Restore text
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
      setInputText(messageText); // Restore text
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMessages(false);
  };

  const renderMessage = ({item}: {item: Message}) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.isSent ? styles.sentMessage : styles.receivedMessage,
        ]}>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />

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
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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

