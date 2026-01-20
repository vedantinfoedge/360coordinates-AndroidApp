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
import {SafeAreaView} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {ChatStackParamList} from '../../navigation/ChatNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import {chatService} from '../../services/chat.service';
import CustomAlert from '../../utils/alertHelper';
import {markChatAsRead} from '../../services/firebase.service';
import firestore from '@react-native-firebase/firestore';

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
  const {conversationId, userId, userName, propertyId, propertyTitle, receiverRole} = route.params || {};
  const {logout, user} = useAuth();
  
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
  const flatListRef = useRef<FlatList>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // If we already have a conversationId (from chat list), ensure Firebase room exists
      if (conversationId) {
        console.log('[Chat] Using existing conversationId:', conversationId);
        const chatRoomId = String(conversationId);
        
        // Parse conversationId to extract propertyId if needed
        // Format: minId_maxId_propertyId (e.g., "5_12_123" for buyer 5, seller 12, property 123)
        // Note: Cannot determine receiverId from format alone (both IDs are in sorted order)
        // Use route params (userId) or chat list data instead
        let parsedPropertyId: number | undefined;
        
        const chatRoomIdParts = chatRoomId.split('_');
        if (chatRoomIdParts.length >= 3) {
          parsedPropertyId = Number(chatRoomIdParts[2]); // propertyId is always last
          console.log('[Chat] Parsed propertyId from conversationId:', parsedPropertyId);
          // Note: Cannot parse receiverId from minId_maxId format - use route params instead
        }
        
        // Ensure Firebase chat room exists - create it if it doesn't
        // Use route params (userId is required from chat list navigation)
        const receiverIdToUse = userId; // Must come from route params (chat list provides this)
        const propertyIdToUse = propertyId || parsedPropertyId;
        const receiverRoleToUse = receiverRole || 'seller'; // Default to seller if not specified
        
        if (receiverIdToUse && propertyIdToUse && user?.id) {
          try {
            console.log('[Chat] Ensuring Firebase chat room exists for conversationId:', chatRoomId);
            const createdRoomId = await chatService.createFirebaseChatRoom(
              Number(user.id),
              Number(receiverIdToUse),
              receiverRoleToUse as 'agent' | 'seller',
              Number(propertyIdToUse),
              chatRoomId, // Use the existing chatRoomId
            );
            
            if (createdRoomId) {
              console.log('[Chat] ✅ Firebase chat room verified/created:', createdRoomId);
              setActualConversationId(createdRoomId);
            } else {
              console.warn('[Chat] ⚠️ Could not create/verify Firebase room, but continuing with conversationId');
              setActualConversationId(chatRoomId);
            }
          } catch (error: any) {
            console.error('[Chat] Error ensuring Firebase room exists:', error);
            // Continue anyway - try to use existing room
            setActualConversationId(chatRoomId);
          }
        } else {
          // If we can't parse or don't have required info, just use the conversationId
          console.warn('[Chat] ⚠️ Cannot create Firebase room - missing required info. Using conversationId directly.');
          setActualConversationId(chatRoomId);
        }
        
        // Mark chat as read when conversation is opened
        if (user?.id) {
          try {
            await markChatAsRead(chatRoomId, user.id);
            console.log('[Chat] ✅ Marked chat as read for user:', user.id);
          } catch (error) {
            console.warn('[Chat] Could not mark chat as read:', error);
          }
        }
        
        // Set up listener for existing room
        try {
          const unsubscribe = chatService.listenToMessages(chatRoomId, (newMessages) => {
            console.log('[Chat] Received', newMessages.length, 'messages from Firebase');
            
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
                } catch (e) {
                  console.warn('[Chat] Error parsing timestamp:', e);
                }
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
            return unsubscribe;
          }
        } catch (error: any) {
          console.error('[Chat] Error setting up listener for existing room:', error);
        }
      }
      
      let backendChatRoomId: string | number | null = null;
      let backendReceiverRole: 'agent' | 'seller' | null = null;
      
      // Step 1: Create backend chat room (creates inquiry in database) - as per guide
      if (userId && propertyId) {
        try {
          console.log('[Chat] Creating backend chat room with:', {
            receiverId: userId,
            propertyId: propertyId,
            buyerId: user.id
          });
          
          const roomResponse = await chatService.createRoom(Number(userId), Number(propertyId));
          
          console.log('[Chat] Backend chat room API response:', JSON.stringify(roomResponse, null, 2));
          
          // Extract buyer name from backend response if available (for seller/agent view)
          let buyerNameFromResponse: string | null = null;
          let buyerProfileImageFromResponse: string | null = null;
          
          // Extract chat room ID and receiverRole from API response - check multiple possible response structures
          if (roomResponse) {
            if (roomResponse.success && roomResponse.data) {
              backendChatRoomId = 
                roomResponse.data.chatRoomId || 
                roomResponse.data.inquiryId || 
                roomResponse.data.id ||
                roomResponse.data.conversation_id ||
                conversationId;
              // Extract receiverRole from backend response
              if (roomResponse.data.receiverRole && (roomResponse.data.receiverRole === 'agent' || roomResponse.data.receiverRole === 'seller')) {
                backendReceiverRole = roomResponse.data.receiverRole;
              }
              
              // Extract buyer info from response (for seller/agent)
              buyerNameFromResponse = roomResponse.data.buyer?.name || 
                                     roomResponse.data.buyer?.full_name ||
                                     roomResponse.data.buyer_name ||
                                     roomResponse.data.buyerName ||
                                     null;
              buyerProfileImageFromResponse = roomResponse.data.buyer?.profile_image ||
                                            roomResponse.data.buyer_profile_image ||
                                            null;
              
              console.log('[Chat] ✅ Backend chat room created successfully:', backendChatRoomId, 'receiverRole:', backendReceiverRole);
              if (buyerNameFromResponse) {
                console.log('[Chat] ✅ Buyer name from backend response:', buyerNameFromResponse);
              }
            } else if (roomResponse.data) {
              // Some APIs return data directly without success flag
              backendChatRoomId = 
                roomResponse.data.chatRoomId || 
                roomResponse.data.inquiryId || 
                roomResponse.data.id ||
                roomResponse.data.conversation_id ||
                conversationId;
              // Extract receiverRole from backend response
              if (roomResponse.data.receiverRole && (roomResponse.data.receiverRole === 'agent' || roomResponse.data.receiverRole === 'seller')) {
                backendReceiverRole = roomResponse.data.receiverRole;
              }
              
              // Extract buyer info from response (for seller/agent)
              if (!buyerNameFromResponse) {
                buyerNameFromResponse = roomResponse.data.buyer?.name || 
                                       roomResponse.data.buyer?.full_name ||
                                       roomResponse.data.buyer_name ||
                                       roomResponse.data.buyerName ||
                                       null;
                buyerProfileImageFromResponse = roomResponse.data.buyer?.profile_image ||
                                              roomResponse.data.buyer_profile_image ||
                                              null;
              }
              
              console.log('[Chat] ✅ Backend chat room ID extracted:', backendChatRoomId, 'receiverRole:', backendReceiverRole);
            } else if (roomResponse.chatRoomId || roomResponse.inquiryId || roomResponse.id) {
              // Response might be flat
              backendChatRoomId = roomResponse.chatRoomId || roomResponse.inquiryId || roomResponse.id;
              if (roomResponse.receiverRole && (roomResponse.receiverRole === 'agent' || roomResponse.receiverRole === 'seller')) {
                backendReceiverRole = roomResponse.receiverRole;
              }
              
              // Extract buyer info from flat response (for seller/agent)
              if (!buyerNameFromResponse) {
                buyerNameFromResponse = roomResponse.buyer?.name || 
                                       roomResponse.buyer?.full_name ||
                                       roomResponse.buyer_name ||
                                       roomResponse.buyerName ||
                                       null;
                buyerProfileImageFromResponse = roomResponse.buyer?.profile_image ||
                                              roomResponse.buyer_profile_image ||
                                              null;
              }
              
              console.log('[Chat] ✅ Backend chat room ID from flat response:', backendChatRoomId, 'receiverRole:', backendReceiverRole);
            } else {
              console.warn('[Chat] ⚠️ Unexpected API response structure:', roomResponse);
              // Try to use conversationId as fallback
              if (conversationId) {
                backendChatRoomId = conversationId;
                console.log('[Chat] Using provided conversationId as fallback:', backendChatRoomId);
              }
            }
          } else {
            console.warn('[Chat] ⚠️ Empty API response');
            if (conversationId) {
              backendChatRoomId = conversationId;
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
          if (conversationId) {
            backendChatRoomId = conversationId;
            console.log('[Chat] Using conversationId after error:', backendChatRoomId);
          }
        }
      } else if (conversationId) {
        backendChatRoomId = conversationId;
        console.log('[Chat] Using provided conversationId:', backendChatRoomId);
      } else {
        console.warn('[Chat] ⚠️ Missing required parameters:', {
          userId,
          propertyId,
          conversationId
        });
      }
      
      // Step 2: Use existing chatRoomId or create new Firebase chat room
      // If we already have a chatRoomId from backend, use it directly
      let firebaseRoomId: string | null = null;
      
      if (backendChatRoomId && typeof backendChatRoomId === 'string') {
        // Use the chatRoomId from backend (format: buyerId_receiverId_propertyId)
        firebaseRoomId = backendChatRoomId;
        console.log('[Chat] Using existing chat room ID from backend:', firebaseRoomId);
      } else if (userId && propertyId && user?.id) {
        // Create new Firebase chat room
        try {
          console.log('[Chat] 🔍 Creating Firebase chat room with parameters:', {
            buyerId: user.id,
            sellerId: userId,
            propertyId: propertyId,
          });
          
          // Determine receiverRole: use from backend response, params, or default to "seller"
          const role: 'agent' | 'seller' = backendReceiverRole 
            ? backendReceiverRole 
            : (receiverRole === 'agent' || receiverRole === 'seller') 
              ? receiverRole 
              : 'seller';
          
          console.log('[Chat] Using receiverRole:', role);
          
          // Pass backend's chatRoomId to ensure Firebase uses the same format
          // Also pass buyer name and profile image if available from backend response
          firebaseRoomId = await chatService.createFirebaseChatRoom(
            Number(user.id),
            Number(userId),
            role,
            Number(propertyId),
            backendChatRoomId ? String(backendChatRoomId) : undefined, // Use backend's ID if available
            buyerNameFromResponse || undefined, // Pass buyer name if available
            buyerProfileImageFromResponse || undefined, // Pass buyer profile image if available
          );
          
          if (firebaseRoomId) {
            console.log('[Chat] Firebase chat room created:', firebaseRoomId);
          }
        } catch (error: any) {
          console.error('[Chat] Error creating Firebase chat room:', {
            message: error?.message,
            code: error?.code,
          });
        }
      }
      
      // Set up Firebase listener for messages
      if (firebaseRoomId) {
        try {
          setActualConversationId(firebaseRoomId);
          
          // Try to fetch buyer name from Firebase chat room if not provided or is default
          if (!userName || !userName.trim() || userName === 'Buyer' || userName === 'Property Owner') {
            try {
              const chatRoomDoc = await firestore().collection('chats').doc(firebaseRoomId).get();
              if (chatRoomDoc.exists) {
                const roomData = chatRoomDoc.data();
                console.log('[Chat] Chat room data:', roomData);
                // Try to get buyer name from room data if available
                if (roomData?.buyerName && roomData.buyerName.trim()) {
                  setParticipantName(roomData.buyerName.trim());
                } else if (roomData?.buyer_name && roomData.buyer_name.trim()) {
                  setParticipantName(roomData.buyer_name.trim());
                }
              }
            } catch (error) {
              console.warn('[Chat] Could not fetch buyer name from chat room:', error);
            }
          }
          
          console.log('[Chat] Setting up Firebase message listener for room:', firebaseRoomId);
          
          // Step 3: Listen to messages via Firebase - as per guide
          const unsubscribe = chatService.listenToMessages(firebaseRoomId, (newMessages) => {
            console.log('[Chat] Received', newMessages.length, 'messages from Firebase');
            
            const formattedMessages: Message[] = newMessages.map((msg: any) => {
              // Handle timestamp conversion
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
                } catch (e) {
                  console.warn('[Chat] Error parsing timestamp:', e);
                }
              }
              
              return {
                id: msg.id,
                text: msg.text || msg.message || '',
                senderId: msg.senderId || '',
                timestamp: timestampStr,
                isSent: msg.senderId === String(user.id),
              };
            });
            
            console.log('[Chat] Formatted messages:', formattedMessages.length);
            setMessages(formattedMessages);
            setLoading(false);
            
            // Scroll to bottom when new messages arrive
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({animated: true});
            }, 100);
          });
          
          // Return unsubscribe function for cleanup
          if (unsubscribe) {
            setFirebaseUnsubscribe(() => unsubscribe);
            return unsubscribe;
          }
        } catch (error: any) {
          console.error('[Chat] Error setting up Firebase listener:', {
            message: error?.message,
            code: error?.code,
          });
          setLoading(false);
        }
      }
      
      // If Firebase is not available, show error instead of API fallback
      if (!actualConversationId && backendChatRoomId) {
        console.warn('[Chat] Firebase not available - chat requires Firebase to be set up');
        CustomAlert.alert(
          'Chat Not Available',
          'Firebase is not configured. Please rebuild the app to enable chat functionality.\n\nRun: cd android && ./gradlew clean && cd .. && npm run android',
        );
        setLoading(false);
        return null;
      } else if (!actualConversationId && !backendChatRoomId) {
        CustomAlert.alert('Error', 'Unable to initialize conversation. Missing required parameters.');
        setLoading(false);
        return null;
      }
      
      setLoading(false);
      return null;
    } catch (error: any) {
      console.error('[Chat] Error initializing conversation:', {
        message: error?.message,
        code: error?.code,
      });
      setLoading(false);
      return null;
    }
  };

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
      } else {
        // If no messages or empty response, just show empty list (new chat)
        console.log('[Chat] No messages found or empty response - showing empty chat');
        setMessages([]);
      }
    } catch (error: any) {
      console.error('[Chat] Error loading messages:', {
        error: error?.message,
        status: error?.status,
        conversationId: convId
      });
      
      // If 404, the endpoint doesn't exist - just show empty messages (user can still send)
      if (error?.status === 404) {
        console.warn('[Chat] Messages endpoint returned 404 - endpoint may not exist. Showing empty chat.');
        setMessages([]);
        if (showLoading) {
          // Don't show error alert for 404 - it's expected if endpoint doesn't exist
          console.log('[Chat] Messages endpoint not available, but chat room is ready for sending messages');
        }
      } else if (showLoading) {
        // Only show alert for other errors
        CustomAlert.alert('Error', error.message || 'Failed to load messages');
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
      
      if (!firebaseSuccess) {
        CustomAlert.alert(
          'Cannot Send Message',
          'Firebase is not available. Please rebuild the app to enable chat functionality.\n\nRun: cd android && ./gradlew clean && cd .. && npm run android',
        );
        setInputText(messageText); // Restore text
      }
    } catch (error: any) {
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
    const isSellerOrAgent = user?.user_type === 'seller' || user?.user_type === 'agent';
    
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
    <SafeAreaView style={styles.container}>
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

