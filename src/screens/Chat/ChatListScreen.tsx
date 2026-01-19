import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {CompositeNavigationProp, useFocusEffect} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {ChatStackParamList} from '../../navigation/ChatNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import {chatService} from '../../services/chat.service';
import {propertyService} from '../../services/property.service';
import {markChatAsRead} from '../../services/firebase.service';
import {notificationService} from '../../services/notification.service';
import firestore from '@react-native-firebase/firestore';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {Image} from 'react-native';

type ChatListScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList, 'ChatList'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<BuyerTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

type Props = {
  navigation: ChatListScreenNavigationProp;
};

interface ChatRoom {
  id: string;
  chatRoomId: string;
  buyerId: string;
  receiverId: string;
  receiverRole: 'agent' | 'seller';
  propertyId: string;
  participants: string[];
  lastMessage: string;
  readStatus: { [userId: string]: 'new' | 'read' };
  updatedAt: any;
  receiverName?: string;
  propertyTitle?: string;
}

interface ChatListItem {
  id: string;
  chatRoomId: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  timestampMs?: number; // For sorting/deduplication
  unreadCount: number;
  propertyId?: string;
  propertyTitle?: string;
  receiverId?: string;
  receiverRole?: 'agent' | 'seller';
  buyerId?: string;
  image?: string;
  location?: string;
  price?: string;
}

const ChatListScreen: React.FC<Props> = ({navigation}) => {
  const {logout, user} = useAuth();
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [propertyCache, setPropertyCache] = useState<Record<string, any>>({});
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Set up listener when component mounts or user changes
  useEffect(() => {
    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Set up real-time listener for chat rooms
    const unsubscribe = setupChatRoomsListener();
    unsubscribeRef.current = unsubscribe;
    
    // Also load chat rooms initially
    loadChatRooms();
    
    // Register refresh callback with notification service
    notificationService.setChatListRefreshCallback(() => {
      console.log('[ChatList] Refresh triggered by notification service');
      loadChatRooms();
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Unregister callback when component unmounts
      notificationService.setChatListRefreshCallback(null);
    };
  }, [user?.id]);

  // Refresh chat list when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[ChatList] Screen focused - refreshing chat list');
      
      // Reload chat rooms when screen comes into focus
      loadChatRooms();
      
      // Re-setup listener if it was cleaned up
      if (!unsubscribeRef.current && user?.id) {
        const unsubscribe = setupChatRoomsListener();
        unsubscribeRef.current = unsubscribe;
      }
    }, [user?.id])
  );

  const setupChatRoomsListener = () => {
    if (!user?.id) return null;

    try {
      const db = firestore();
      if (!db) {
        console.warn('[ChatList] Firestore not available, using manual refresh');
        return null;
      }

      const userIdStr = user.id.toString();

      // Query without orderBy to avoid index requirement - we'll sort manually
      const query = db
        .collection('chats')
        .where('participants', 'array-contains', userIdStr);

      const unsubscribe = query.onSnapshot(
        (snapshot) => {
          try {
            const chatRooms: ChatRoom[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              let updatedAt = new Date();
              
              if (data.updatedAt) {
                const firestoreTimestamp = data.updatedAt as FirebaseFirestoreTypes.Timestamp;
                if (firestoreTimestamp && firestoreTimestamp.toDate) {
                  updatedAt = firestoreTimestamp.toDate();
                }
              }

              return {
                id: doc.id,
                chatRoomId: doc.id,
                ...data,
                updatedAt,
              } as ChatRoom;
            });

            // Sort manually if orderBy didn't work
            chatRooms.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

            processChatRooms(chatRooms).catch(error => {
              console.error('[ChatList] Error processing chat rooms:', error);
            });
          } catch (error) {
            console.error('[ChatList] Error processing snapshot:', error);
          }
        },
        (error: any) => {
          console.error('[ChatList] Listener error:', error);
          // If error is due to missing index, fall back to manual load
          if (error?.code === 'failed-precondition') {
            console.warn('[ChatList] Firestore index required. Using manual refresh.');
            loadChatRooms();
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('[ChatList] Error setting up listener:', error);
      // Fallback to manual refresh
      loadChatRooms();
      return null;
    }
  };

  const loadChatRooms = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response: any = await chatService.getConversations(user.id);
      
      if (response && (response.success || response.data) && response.data) {
        const chatRooms = Array.isArray(response.data) ? response.data : [];
        await processChatRooms(chatRooms as ChatRoom[]);
      } else {
        setChatList([]);
      }
    } catch (error: any) {
      console.error('[ChatList] Error loading chat rooms:', error);
      setChatList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processChatRooms = async (chatRooms: ChatRoom[]) => {
    if (!user?.id) return;

    const userIdStr = user.id.toString();
    const isBuyer = user.user_type === 'buyer';
    const isSellerOrAgent = user.user_type === 'seller' || user.user_type === 'agent';
    
    // Filter chat rooms based on user role (like website)
    // Buyers: Show rooms where buyerId === user.id (user is the buyer)
    // Sellers/Agents: Show rooms where receiverId === user.id (user is the receiver/seller)
    let filteredRooms = chatRooms;
    if (isBuyer) {
      filteredRooms = chatRooms.filter(room => room.buyerId === userIdStr);
    } else if (isSellerOrAgent) {
      filteredRooms = chatRooms.filter(room => room.receiverId === userIdStr);
    }
    
    // Enrich each chat room with property and participant data
    const enrichedChats = await Promise.all(
      filteredRooms.map(async (room) => {
        try {
          const propertyId = room.propertyId;
          if (!propertyId) {
            console.warn('[ChatList] No propertyId for room:', room.chatRoomId);
            return null;
          }

          // Get property details (with caching)
          let property = propertyCache[propertyId];
          if (!property) {
            try {
              const propResponse: any = await propertyService.getPropertyDetails(propertyId);
              if (propResponse?.success && propResponse.data?.property) {
                property = propResponse.data.property;
                setPropertyCache(prev => ({ ...prev, [propertyId]: property }));
              } else {
                // Property not found or invalid response - cache null to avoid repeated requests
                setPropertyCache(prev => ({ ...prev, [propertyId]: null }));
              }
            } catch (error: any) {
              // Handle 404 (property deleted/not found) gracefully
              if (error?.status === 404 || error?.response?.status === 404) {
                // Property was deleted or doesn't exist - cache null to avoid repeated requests
                console.log('[ChatList] Property not found (may be deleted):', propertyId);
                setPropertyCache(prev => ({ ...prev, [propertyId]: null }));
              } else {
                // Other errors (network, server error, etc.) - log but don't cache
                console.warn('[ChatList] Error fetching property:', propertyId, error?.message || error);
              }
            }
          }
          
          // If property is explicitly null (cached as not found), treat as missing
          if (property === null) {
            property = undefined;
          }

          // Determine display name and info based on user role
          let displayName: string;
          let displayImage: string | undefined;
          let receiverId: string;
          let receiverRole: 'seller' | 'agent';
          let buyerId: string | undefined;

          if (isBuyer) {
            // Buyer view: Show property owner/seller info
            const ownerUserType = property?.user_type || property?.seller?.user_type || property?.owner?.user_type;
            
            if (ownerUserType === 'agent') {
              receiverId = String(property?.user_id || property?.seller?.id || property?.owner?.id || room.receiverId);
              receiverRole = 'agent';
            } else {
              receiverId = String(property?.user_id || property?.seller?.id || property?.owner?.id || room.receiverId);
              receiverRole = 'seller';
            }

            displayName = property?.seller?.name || 
                         property?.seller?.full_name || 
                         property?.owner?.name ||
                         property?.owner?.full_name ||
                         room.receiverName || 
                         `Property Owner`;
            displayImage = property?.seller?.profile_image || property?.owner?.profile_image || property?.cover_image;
            buyerId = room.buyerId;
          } else {
            // Seller/Agent view: Show buyer info
            receiverId = userIdStr; // Current user is the receiver
            receiverRole = user.user_type === 'agent' ? 'agent' : 'seller';
            buyerId = room.buyerId;
            
            // Try to get buyer name from inquiry or property data
            // For now, use buyerId as fallback - could be enhanced with buyer profile fetch
            displayName = room.receiverName || `Buyer ${buyerId}`;
            displayImage = property?.cover_image; // Show property image for seller view
          }

          // Format price
          const price = property?.price 
            ? `₹${parseFloat(String(property.price)).toLocaleString('en-IN')}${property.status === 'rent' ? '/Month' : ''}`
            : '';

          // Format timestamp
          const timestamp = formatTimestamp(room.updatedAt);
          
          // Get unread count - check if status is 'new' (unread)
          const readStatus = room.readStatus || {};
          const myReadStatus = readStatus[userIdStr];
          // Count as unread if status is 'new' or undefined (never read)
          const unreadCount = (myReadStatus === 'new' || myReadStatus === undefined) ? 1 : 0;

          return {
            id: room.chatRoomId,
            chatRoomId: room.chatRoomId,
            name: displayName,
            lastMessage: room.lastMessage || 'No messages yet',
            timestamp,
            timestampMs: room.updatedAt instanceof Date ? room.updatedAt.getTime() : (room.updatedAt?.toDate?.()?.getTime() || Date.now()),
            unreadCount,
            propertyId: room.propertyId,
            propertyTitle: property?.title || room.propertyTitle || 'Property',
            receiverId: receiverId,
            receiverRole: receiverRole,
            buyerId: buyerId,
            image: displayImage,
            location: property?.location || '',
            price: price,
          };
        } catch (error) {
          console.error('[ChatList] Error processing room:', room.chatRoomId, error);
          // Return fallback data if property fetch fails
          const ownerId = isBuyer ? room.receiverId : room.buyerId;
          const displayName = isBuyer 
            ? (room.receiverName || `Property Owner`)
            : (room.receiverName || `Buyer ${room.buyerId}`);
          
          return {
            id: room.chatRoomId,
            chatRoomId: room.chatRoomId,
            name: displayName,
            lastMessage: room.lastMessage || 'No messages yet',
            timestamp: formatTimestamp(room.updatedAt),
            timestampMs: room.updatedAt instanceof Date ? room.updatedAt.getTime() : (room.updatedAt?.toDate?.()?.getTime() || Date.now()),
            unreadCount: ((room.readStatus || {})[userIdStr] === 'new' || (room.readStatus || {})[userIdStr] === undefined) ? 1 : 0,
            propertyId: room.propertyId,
            propertyTitle: room.propertyTitle,
            receiverId: isBuyer ? ownerId : userIdStr,
            receiverRole: room.receiverRole || (user.user_type === 'agent' ? 'agent' : 'seller'),
            buyerId: room.buyerId,
          };
        }
      })
    );

    // Filter out null values
    let validChats = enrichedChats.filter(chat => chat !== null) as ChatListItem[];
    
    // Deduplicate: Keep only the most recent conversation per property
    // Group by propertyId and keep the one with the most recent timestamp
    const uniqueByProperty = new Map<string, ChatListItem>();
    
    validChats.forEach(chat => {
      const key = chat.propertyId || chat.chatRoomId; // Use propertyId as key, fallback to chatRoomId
      const existing = uniqueByProperty.get(key);
      
      if (!existing) {
        // First occurrence of this property
        uniqueByProperty.set(key, chat);
      } else {
        // Compare timestamps - keep the more recent one
        // Use timestampMs if available, otherwise fallback to comparing formatted timestamps
        const existingTime = existing.timestampMs || 0;
        const currentTime = chat.timestampMs || 0;
        
        if (currentTime > existingTime) {
          // Current chat has more recent activity
          uniqueByProperty.set(key, chat);
        }
      }
    });
    
    // Convert map back to array and sort by timestamp (most recent first)
    const uniqueChats = Array.from(uniqueByProperty.values());
    uniqueChats.sort((a, b) => {
      const timeA = a.timestampMs || 0;
      const timeB = b.timestampMs || 0;
      return timeB - timeA; // Most recent first
    });
    
    setChatList(uniqueChats);
  };

  const formatTimestamp = (date: Date | any): string => {
    if (!date) return 'Just now';
    
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else {
      return 'Just now';
    }

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    
    // Format date: "MM/DD" or "DD/MM" based on locale
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChatRooms();
  };

  const renderChatItem = ({item}: {item: ChatListItem}) => {
    const initials = item.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={async () => {
          // Mark chat as read when opening conversation
          if (item.unreadCount > 0 && user?.id) {
            try {
              await markChatAsRead(item.chatRoomId, user.id);
              console.log('[ChatList] Marked chat as read:', item.chatRoomId);
            } catch (error) {
              console.error('[ChatList] Error marking chat as read:', error);
            }
          }
          
          // Navigate to chat conversation with owner info
          navigation.navigate('ChatConversation', {
            conversationId: item.chatRoomId,
            userId: item.receiverId ? Number(item.receiverId) : undefined,
            userName: item.name, // Owner name to display in header
            propertyId: item.propertyId ? Number(item.propertyId) : undefined,
            propertyTitle: item.propertyTitle,
            receiverRole: item.receiverRole,
          });
        }}
        activeOpacity={0.7}>
        {/* Avatar - Show image or initials */}
        <View style={styles.avatarContainer}>
          {item.image ? (
            <Image 
              source={{ uri: item.image }} 
              style={[styles.avatar, styles.avatarImage, item.unreadCount > 0 && styles.avatarUnread]}
            />
          ) : (
            <View style={[styles.avatar, item.unreadCount > 0 && styles.avatarUnread]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>

        {/* Chat Info - WhatsApp style */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, item.unreadCount > 0 && styles.chatNameUnread]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
          {item.propertyTitle && (
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {item.propertyTitle}
            </Text>
          )}
          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage, 
                item.unreadCount > 0 && styles.lastMessageUnread
              ]} 
              numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && chatList.length === 0) {
    return (
      <View style={styles.container}>
        <BuyerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      {chatList.length > 0 ? (
        <FlatList
          data={chatList}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation by chatting with a property owner</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  // WhatsApp-style chat item
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
    minHeight: 72,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#128C7E', // WhatsApp green
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  avatarImage: {
    backgroundColor: 'transparent',
  },
  avatarUnread: {
    backgroundColor: '#075E54', // Darker green for unread
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000000',
    flex: 1,
  },
  chatNameUnread: {
    fontWeight: '600',
  },
  propertyTitle: {
    fontSize: 13,
    color: '#667781',
    marginTop: 2,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: '#667781',
    marginLeft: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#667781',
    flex: 1,
    marginRight: spacing.xs,
  },
  lastMessageUnread: {
    color: '#000000',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#25D366', // WhatsApp green badge
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.xs,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

export default ChatListScreen;
