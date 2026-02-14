import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { ChatStackParamList } from '../../navigation/ChatNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon } from '../../components/navigation/TabIcons';
import BuyerHeader from '../../components/BuyerHeader';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chat.service';
import { propertyService } from '../../services/property.service';
import { markChatAsRead } from '../../services/firebase.service';
import { notificationService } from '../../services/notification.service';
import { sellerService } from '../../services/seller.service';
import { buyerService } from '../../services/buyer.service';
import { fixImageUrl } from '../../utils/imageHelper';
import { capitalize } from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';
import firestore from '@react-native-firebase/firestore';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

type ChatListScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList, 'ChatList'>,
  CompositeNavigationProp<
    NativeStackNavigationProp<BuyerStackParamList>,
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
  buyerName?: string;
  buyer_name?: string;
  buyerProfileImage?: string;
  buyer_profile_image?: string;
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

type BuyerDetails = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profile_image?: string;
  created_at?: string;
};

type OwnerDetails = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profile_image?: string;
};

const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const { logout, user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatFilter, setChatFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyCache, setPropertyCache] = useState<Record<string, any>>({});
  const [buyerCache, setBuyerCache] = useState<Record<string, { name: string; profile_image?: string }>>({});
  const [buyerDetailsCache, setBuyerDetailsCache] = useState<Record<string, BuyerDetails>>({});
  const [buyerCardVisible, setBuyerCardVisible] = useState(false);
  const [buyerCardLoading, setBuyerCardLoading] = useState(false);
  const [buyerCardError, setBuyerCardError] = useState<string | null>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [ownerDetailsCache, setOwnerDetailsCache] = useState<Record<string, OwnerDetails>>({});
  const [cardMode, setCardMode] = useState<'buyer' | 'owner'>('buyer');
  const [selectedOwnerPropertyId, setSelectedOwnerPropertyId] = useState<string | null>(null);
  const [selectedOwnerRole, setSelectedOwnerRole] = useState<'agent' | 'seller' | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const previousUserTypeRef = useRef<string | undefined>(undefined);

  // Header animation values for hide/show on scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = insets.top + 70;

  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;

  // Animate popup when component mounts
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pre-load buyer information from inquiries (for sellers/agents)
  const loadBuyerInfoFromInquiries = async () => {
    if (!user?.id || (user.user_type !== 'seller' && user.user_type !== 'agent')) {
      return; // Only for sellers/agents
    }

    try {
      console.log('[ChatList] Pre-loading buyer info from inquiries...');
      const inquiriesResponse: any = await sellerService.getInquiries({
        page: 1,
        limit: 100,
      });

      if (inquiriesResponse?.success) {
        const inquiries = inquiriesResponse.data?.inquiries || inquiriesResponse.data || [];
        console.log('[ChatList] Loaded', inquiries.length, 'inquiries for buyer info');

        // Log sample inquiry structure for debugging
        if (inquiries.length > 0) {
          console.log('[ChatList] Sample inquiry structure:', {
            firstInquiry: {
              buyer_id: inquiries[0].buyer_id,
              buyerId: inquiries[0].buyerId,
              buyer_name: inquiries[0].buyer_name,
              hasBuyer: !!inquiries[0].buyer,
              buyerKeys: inquiries[0].buyer ? Object.keys(inquiries[0].buyer) : [],
              allKeys: Object.keys(inquiries[0]),
            },
            allBuyerIds: inquiries.map((inq: any) => inq.buyer_id || inq.buyerId).filter(Boolean),
          });
        }

        // Extract and cache buyer info from all inquiries
        const newBuyerCache: Record<string, { name: string; profile_image?: string }> = {};

        inquiries.forEach((inquiry: any) => {
          const buyerId = inquiry.buyer_id || inquiry.buyerId;
          if (buyerId) {
            const buyerIdStr = String(buyerId);
            // Only add if not already in cache (avoid overwriting)
            if (!newBuyerCache[buyerIdStr] && !buyerCache[buyerIdStr]) {
              const buyerName = inquiry.buyer?.name ||
                inquiry.buyer?.full_name ||
                inquiry.buyer_name ||
                inquiry.name ||
                inquiry.buyer?.first_name ||
                (inquiry.buyer?.first_name && inquiry.buyer?.last_name
                  ? `${inquiry.buyer.first_name} ${inquiry.buyer.last_name}`
                  : null);

              if (buyerName && buyerName !== 'Buyer' && !buyerName.startsWith('Buyer ')) {
                const buyerProfileImage = inquiry.buyer?.profile_image ||
                  inquiry.buyer_profile_image ||
                  inquiry.buyer?.profileImage ||
                  undefined;

                const fixedImageUrl = buyerProfileImage ? fixImageUrl(buyerProfileImage) : null;
                newBuyerCache[buyerIdStr] = {
                  name: buyerName,
                  profile_image: fixedImageUrl || undefined,
                };
                console.log('[ChatList] Caching buyer from inquiry:', buyerIdStr, '->', buyerName);
              }
            }
          }
        });

        // Update cache with all buyer info
        setBuyerCache(prev => {
          const updated = { ...prev, ...newBuyerCache };
          console.log('[ChatList] Updated buyer cache. Total buyers:', Object.keys(updated).length, 'New:', Object.keys(newBuyerCache).length);
          console.log('[ChatList] Buyer cache keys:', Object.keys(updated));

          // Also update Firebase chat rooms with buyer names for future reference
          // This ensures existing chat rooms have buyer names stored
          if (Object.keys(newBuyerCache).length > 0) {
            const db = firestore();
            if (db) {
              // Update all chat rooms for these buyers
              Object.keys(newBuyerCache).forEach(async (buyerIdStr) => {
                try {
                  const buyerInfo = newBuyerCache[buyerIdStr];
                  // Find all chat rooms for this buyer
                  const chatRoomsSnapshot = await db
                    .collection('chats')
                    .where('buyerId', '==', buyerIdStr)
                    .get();

                  const updatePromises = chatRoomsSnapshot.docs.map(async (doc) => {
                    const roomData = doc.data();
                    // Only update if buyer name is not already stored
                    if (!roomData.buyerName && !roomData.buyer_name) {
                      await doc.ref.update({
                        buyerName: buyerInfo.name,
                        ...(buyerInfo.profile_image && { buyerProfileImage: buyerInfo.profile_image }),
                      });
                      console.log('[ChatList] Updated Firebase chat room', doc.id, 'with buyer name:', buyerInfo.name);
                    }
                  });

                  await Promise.all(updatePromises);
                } catch (updateError) {
                  console.warn('[ChatList] Error updating Firebase chat rooms for buyer', buyerIdStr, ':', updateError);
                }
              });
            }
          }

          return updated;
        });
      } else {
        console.warn('[ChatList] Inquiries response not successful or empty');
      }
    } catch (error) {
      console.error('[ChatList] Error pre-loading buyer info:', error);
    }
  };

  // Set up listener when component mounts or user changes
  useEffect(() => {
    // Check if user type has changed - if so, clear all caches and state
    const currentUserType = user?.user_type;
    const previousUserType = previousUserTypeRef.current;

    if (previousUserType !== undefined && previousUserType !== currentUserType) {
      console.log('[ChatList] User type changed from', previousUserType, 'to', currentUserType, '- clearing all caches and state');
      // Clear all caches when user type changes
      setBuyerCache({});
      setPropertyCache({});
      setChatList([]);
      setLoading(true);
    }

    // Update previous user type ref
    previousUserTypeRef.current = currentUserType;

    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Only initialize if we have a valid user
    if (!user?.id || !user?.user_type) {
      console.log('[ChatList] No user or user type, skipping initialization');
      setLoading(false);
      return;
    }

    // Pre-load buyer info for sellers/agents, then load chat rooms
    const initializeChatList = async () => {
      console.log('[ChatList] Initializing chat list for user type:', user.user_type);

      if (user.user_type === 'seller' || user.user_type === 'agent') {
        await loadBuyerInfoFromInquiries();
      }

      // Set up real-time listener for chat rooms
      const unsubscribe = setupChatRoomsListener();
      unsubscribeRef.current = unsubscribe;

      // Load chat rooms after buyer info is loaded
      loadChatRooms();
    };

    initializeChatList();

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
  }, [user?.id, user?.user_type]);

  // Refresh chat list when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[ChatList] Screen focused - refreshing chat list for user type:', user?.user_type);

      // Verify user type matches expected type - if not, clear state
      if (!user?.id || !user?.user_type) {
        console.warn('[ChatList] No user or user type on focus, clearing state');
        setChatList([]);
        setBuyerCache({});
        setPropertyCache({});
        setLoading(false);
        return;
      }

      // Check if user type changed since last focus
      const currentUserType = user.user_type;
      const previousUserType = previousUserTypeRef.current;

      if (previousUserType !== undefined && previousUserType !== currentUserType) {
        console.log('[ChatList] User type changed on focus - clearing caches');
        setBuyerCache({});
        setPropertyCache({});
        setChatList([]);
      }

      previousUserTypeRef.current = currentUserType;

      // Reload buyer info for sellers/agents only
      if (user.user_type === 'seller' || user.user_type === 'agent') {
        loadBuyerInfoFromInquiries();
      } else if (user.user_type === 'buyer') {
        // For buyers, clear buyer cache (not needed)
        setBuyerCache({});
      }

      // Reload chat rooms when screen comes into focus
      loadChatRooms();

      // Re-setup listener if it was cleaned up
      if (!unsubscribeRef.current && user.id) {
        const unsubscribe = setupChatRoomsListener();
        unsubscribeRef.current = unsubscribe;
      }
    }, [user?.id, user?.user_type])
  );

  const setupChatRoomsListener = () => {
    if (!user?.id || !user?.user_type) {
      console.warn('[ChatList] Cannot setup listener - missing user or user type');
      return null;
    }

    try {
      const db = firestore();
      if (!db) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatListScreen.tsx:setupChatRoomsListener', message: 'Firestore null', data: { userId: user?.id }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        console.warn('[ChatList] Firestore not available, using manual refresh');
        return null;
      }

      const userIdStr = user.id.toString();
      const currentUserType = user.user_type;

      console.log('[ChatList] Setting up Firebase listener for user type:', currentUserType, 'userId:', userIdStr);

      // Query without orderBy to avoid index requirement - we'll sort manually
      const query = db
        .collection('chats')
        .where('participants', 'array-contains', userIdStr);

      const unsubscribe = query.onSnapshot(
        (snapshot) => {
          try {
            // Validate user type before processing - prevent cross-dashboard data
            if (!user?.id || !user?.user_type) {
              console.warn('[ChatList] Firebase listener callback - user or user type missing, skipping');
              return;
            }

            // Double-check user type matches expected type
            const listenerUserType = user.user_type;
            if (listenerUserType !== currentUserType) {
              console.warn('[ChatList] Firebase listener - user type mismatch:', listenerUserType, 'vs', currentUserType, '- skipping update');
              return;
            }

            const chatRooms: ChatRoom[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              let updatedAt = new Date();

              if (data.updatedAt) {
                const firestoreTimestamp = data.updatedAt as FirebaseFirestoreTypes.Timestamp;
                if (firestoreTimestamp && firestoreTimestamp.toDate) {
                  updatedAt = firestoreTimestamp.toDate();
                }
              }

              // Log chat room data to see if buyer name is stored
              if (data.buyerId && (listenerUserType === 'seller' || listenerUserType === 'agent')) {
                const buyerIdStr = String(data.buyerId);
                const hasBuyerName = !!(data.buyerName || data.buyer_name);

                console.log('[ChatList] Chat room data for buyerId:', data.buyerId, {
                  hasBuyerName: hasBuyerName,
                  buyerName: data.buyerName || data.buyer_name,
                  hasReceiverName: !!data.receiverName,
                  receiverName: data.receiverName,
                  chatRoomId: doc.id,
                });

                // If buyer name is in room data but not in cache, cache it
                if (hasBuyerName && !buyerCache[buyerIdStr]) {
                  const storedBuyerName = data.buyerName || data.buyer_name;
                  if (storedBuyerName && storedBuyerName !== 'Buyer' && !storedBuyerName.startsWith('Buyer ')) {
                    setBuyerCache(prev => ({
                      ...prev,
                      [buyerIdStr]: {
                        name: storedBuyerName,
                        profile_image: data.buyerProfileImage || data.buyer_profile_image || undefined,
                      },
                    }));
                    console.log('[ChatList] Cached buyer name from chat room data:', storedBuyerName);
                  }
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
    if (!user?.id || !user?.user_type) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatListScreen.tsx:loadChatRooms', message: 'Skip load - no user', data: { hasUser: !!user?.id, hasUserType: !!user?.user_type }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      console.warn('[ChatList] Cannot load chat rooms - missing user or user type');
      setChatList([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentUserType = user.user_type;
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatListScreen.tsx:loadChatRooms', message: 'loadChatRooms start', data: { userId: user.id, userType: currentUserType }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      console.log('[ChatList] Loading chat rooms for user type:', currentUserType, {
        userId: user.id,
      });
      const response: any = await chatService.getConversations(user.id);

      console.log('[ChatList] Chat service response:', {
        success: response?.success,
        hasData: !!response?.data,
        dataLength: Array.isArray(response?.data) ? response.data.length : 0,
        sampleRoom: Array.isArray(response?.data) && response.data.length > 0 ? {
          id: response.data[0].id,
          chatRoomId: response.data[0].chatRoomId,
          buyerId: response.data[0].buyerId,
          receiverId: response.data[0].receiverId,
          participants: response.data[0].participants,
          allKeys: Object.keys(response.data[0] || {}),
        } : null,
      });

      if (response && (response.success || response.data) && response.data) {
        const chatRooms = Array.isArray(response.data) ? response.data : [];
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatListScreen.tsx:loadChatRooms', message: 'loadChatRooms response', data: { success: response?.success, roomCount: chatRooms.length }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        console.log('[ChatList] Processing', chatRooms.length, 'chat rooms');
        await processChatRooms(chatRooms as ChatRoom[]);
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatListScreen.tsx:loadChatRooms', message: 'loadChatRooms no data', data: { hasResponse: !!response, success: response?.success }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        console.warn('[ChatList] No chat rooms in response, setting empty list');
        setChatList([]);
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatListScreen.tsx:loadChatRooms', message: 'loadChatRooms error', data: { error: error?.message }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      console.error('[ChatList] Error loading chat rooms:', error);
      setChatList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processChatRooms = async (chatRooms: ChatRoom[]) => {
    if (!user?.id || !user?.user_type) {
      console.warn('[ChatList] Cannot process chat rooms - missing user or user type');
      setChatList([]);
      return;
    }

    const userIdStr = user.id.toString();
    const currentUserType = user.user_type;
    const isBuyer = currentUserType === 'buyer';
    const isSellerOrAgent = currentUserType === 'seller' || currentUserType === 'agent';

    console.log('[ChatList] Processing chat rooms for user type:', currentUserType, {
      totalRooms: chatRooms.length,
      userId: user.id,
      userIdStr,
      isBuyer,
      isSellerOrAgent,
      sampleRoom: chatRooms.length > 0 ? {
        id: chatRooms[0].id,
        buyerId: chatRooms[0].buyerId,
        receiverId: chatRooms[0].receiverId,
        receiverIdType: typeof chatRooms[0].receiverId,
        buyerIdType: typeof chatRooms[0].buyerId,
      } : null,
    });

    // Filter chat rooms based on user role (like website)
    // Buyers: Show rooms where buyerId === user.id (user is the buyer)
    // Sellers/Agents: Show rooms where receiverId === user.id (user is the receiver/seller)
    let filteredRooms = chatRooms;
    if (isBuyer) {
      filteredRooms = chatRooms.filter(room => {
        const matches = String(room.buyerId) === userIdStr;
        return matches;
      });
      console.log('[ChatList] Buyer filter - filtered rooms:', filteredRooms.length, 'from', chatRooms.length);
    } else if (isSellerOrAgent) {
      filteredRooms = chatRooms.filter(room => {
        // Convert both to strings for comparison to handle type mismatches
        const roomReceiverId = String(room.receiverId || '');
        const matches = roomReceiverId === userIdStr;

        // Fallback: If receiverId doesn't match but user is in participants and is NOT the buyer, include it
        if (!matches && room.participants && Array.isArray(room.participants)) {
          const isParticipant = room.participants.some(p => String(p) === userIdStr);
          const isNotBuyer = String(room.buyerId || '') !== userIdStr;
          if (isParticipant && isNotBuyer) {
            console.log('[ChatList] Including room via fallback (participant check):', {
              roomId: room.chatRoomId,
              receiverId: room.receiverId,
              buyerId: room.buyerId,
              participants: room.participants,
            });
            return true;
          }
        }

        if (!matches && room.receiverId) {
          console.log('[ChatList] Room filtered out:', {
            roomId: room.chatRoomId,
            roomReceiverId: room.receiverId,
            roomReceiverIdType: typeof room.receiverId,
            userIdStr,
            userIdStrType: typeof userIdStr,
            participants: room.participants,
          });
        }
        return matches;
      });
      console.log('[ChatList] Seller/Agent filter - filtered rooms:', filteredRooms.length, 'from', chatRooms.length);
      if (filteredRooms.length === 0 && chatRooms.length > 0) {
        console.warn('[ChatList] No rooms matched filter! Sample rooms:', chatRooms.slice(0, 3).map(r => ({
          id: r.id,
          buyerId: r.buyerId,
          receiverId: r.receiverId,
          participants: r.participants,
        })));
      }
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

            // Fetch buyer information - check in order: cache, room data, Firebase document, inquiries, messages
            const buyerIdStr = buyerId ? String(buyerId) : '';
            let buyerInfo = buyerCache[buyerIdStr];

            // Log room data to see what's available
            console.log('[ChatList] Room data for buyerId:', buyerId, {
              chatRoomId: room.chatRoomId,
              hasBuyerName: !!(room.buyerName || room.buyer_name),
              buyerName: room.buyerName || room.buyer_name,
              hasBuyerProfileImage: !!(room.buyerProfileImage || room.buyer_profile_image),
              allRoomKeys: Object.keys(room).slice(0, 20), // First 20 keys to avoid log spam
            });

            // Step 1: Check if buyer name is in the chat room data itself (from Firebase - already fetched)
            if (!buyerInfo && (room.buyerName || room.buyer_name)) {
              const buyerName = room.buyerName || room.buyer_name;
              if (buyerName && buyerName !== 'Buyer' && !buyerName.startsWith('Buyer ')) {
                buyerInfo = {
                  name: buyerName,
                  profile_image: room.buyerProfileImage || room.buyer_profile_image || undefined,
                };
                // Cache it
                setBuyerCache(prev => ({ ...prev, [buyerIdStr]: buyerInfo }));
                console.log('[ChatList] ✅ Found buyer name in chat room data (from Firebase):', buyerName);
              }
            }

            // Step 2: If not in room data, check Firebase document directly (in case it was updated)
            if (!buyerInfo && buyerId) {
              try {
                const db = firestore();
                if (db) {
                  const chatRoomDoc = await db.collection('chats').doc(room.chatRoomId).get();
                  if (chatRoomDoc.exists) {
                    const roomData = chatRoomDoc.data();
                    const storedBuyerName = roomData?.buyerName || roomData?.buyer_name;
                    if (storedBuyerName && storedBuyerName !== 'Buyer' && !storedBuyerName.startsWith('Buyer ')) {
                      buyerInfo = {
                        name: storedBuyerName,
                        profile_image: roomData?.buyerProfileImage || roomData?.buyer_profile_image || undefined,
                      };
                      setBuyerCache(prev => ({ ...prev, [buyerIdStr]: buyerInfo }));
                      console.log('[ChatList] ✅ Found buyer name in Firebase document (direct fetch):', storedBuyerName);
                    }
                  }
                }
              } catch (error) {
                console.warn('[ChatList] Error checking Firebase document directly:', error);
              }
            }

            console.log('[ChatList] Looking for buyer info:', {
              buyerId,
              buyerIdStr,
              buyerIdType: typeof buyerId,
              inCache: !!buyerInfo,
              cachedName: buyerInfo?.name,
              fromRoomData: !!(room.buyerName || room.buyer_name),
              cacheSize: Object.keys(buyerCache).length,
              cacheKeys: Object.keys(buyerCache),
              cacheMatch: Object.keys(buyerCache).includes(buyerIdStr),
            });

            // Step 3: If still not found, try to fetch buyer info from inquiries
            if (!buyerInfo && buyerId) {
              console.log('[ChatList] Fetching buyer info for buyerId:', buyerId, 'propertyId:', propertyId);
              // Try to fetch buyer info from inquiries
              try {
                const inquiriesResponse: any = await sellerService.getInquiries({
                  page: 1,
                  limit: 100,
                });

                console.log('[ChatList] Inquiries response:', {
                  success: inquiriesResponse?.success,
                  hasData: !!inquiriesResponse?.data,
                  dataType: Array.isArray(inquiriesResponse?.data) ? 'array' : typeof inquiriesResponse?.data,
                  inquiriesCount: Array.isArray(inquiriesResponse?.data?.inquiries) ? inquiriesResponse.data.inquiries.length :
                    Array.isArray(inquiriesResponse?.data) ? inquiriesResponse.data.length : 0,
                });

                if (inquiriesResponse?.success) {
                  const inquiries = inquiriesResponse.data?.inquiries || inquiriesResponse.data || [];

                  // Log all buyer IDs in inquiries for debugging
                  const allInquiryBuyerIds = inquiries.map((inq: any) => String(inq.buyer_id || inq.buyerId || '')).filter(Boolean);
                  console.log('[ChatList] All buyer IDs in inquiries:', allInquiryBuyerIds);
                  console.log('[ChatList] Looking for buyerId:', String(buyerId), 'in inquiries');

                  // First try to find inquiry for this specific property and buyer
                  let inquiry = inquiries.find((inq: any) => {
                    const inqPropertyId = String(inq.property_id || inq.propertyId || '');
                    const inqBuyerId = String(inq.buyer_id || inq.buyerId || '');
                    const matches = inqPropertyId === String(propertyId) && inqBuyerId === String(buyerId);
                    if (matches) {
                      console.log('[ChatList] Found matching inquiry:', { inqPropertyId, inqBuyerId, propertyId, buyerId });
                    }
                    return matches;
                  });

                  console.log('[ChatList] Found inquiry for property+buyer:', !!inquiry);

                  // If not found, try to find any inquiry for this buyer (buyer might have inquired about multiple properties)
                  if (!inquiry) {
                    inquiry = inquiries.find((inq: any) => {
                      const inqBuyerId = String(inq.buyer_id || inq.buyerId || '');
                      return inqBuyerId === String(buyerId);
                    });
                    console.log('[ChatList] Found inquiry for buyer (any property):', !!inquiry);
                  }

                  if (inquiry) {
                    console.log('[ChatList] Inquiry data structure:', {
                      hasBuyer: !!inquiry.buyer,
                      buyerKeys: inquiry.buyer ? Object.keys(inquiry.buyer) : [],
                      buyer_name: inquiry.buyer_name,
                      name: inquiry.name,
                      allKeys: Object.keys(inquiry),
                    });

                    // Extract buyer name from multiple possible locations
                    const buyerName = inquiry.buyer?.name ||
                      inquiry.buyer?.full_name ||
                      inquiry.buyer_name ||
                      inquiry.name ||
                      inquiry.buyer?.first_name ||
                      (inquiry.buyer?.first_name && inquiry.buyer?.last_name
                        ? `${inquiry.buyer.first_name} ${inquiry.buyer.last_name}`
                        : null) ||
                      'Buyer';

                    const buyerProfileImage = inquiry.buyer?.profile_image ||
                      inquiry.buyer_profile_image ||
                      inquiry.buyer?.profileImage ||
                      undefined;

                    console.log('[ChatList] Extracted buyer info:', {
                      name: buyerName,
                      hasImage: !!buyerProfileImage,
                    });

                    const fixedImageUrl = buyerProfileImage ? fixImageUrl(buyerProfileImage) : null;
                    buyerInfo = {
                      name: buyerName,
                      profile_image: fixedImageUrl || undefined,
                    };

                    // Cache buyer info
                    if (buyerId) {
                      const buyerIdStr = String(buyerId);
                      setBuyerCache(prev => ({ ...prev, [buyerIdStr]: buyerInfo }));
                      console.log('[ChatList] Cached buyer info for buyerId:', buyerIdStr);

                      // Also update Firebase chat room document with buyer name for future reference
                      try {
                        const db = firestore();
                        if (db) {
                          await db.collection('chats').doc(room.chatRoomId).update({
                            buyerName: buyerInfo.name,
                            ...(buyerInfo.profile_image && { buyerProfileImage: buyerInfo.profile_image }),
                          });
                          console.log('[ChatList] ✅ Updated Firebase chat room with buyer name:', buyerInfo.name);
                        }
                      } catch (updateError) {
                        console.warn('[ChatList] Could not update Firebase chat room with buyer name:', updateError);
                      }
                    }
                  } else {
                    console.warn('[ChatList] No inquiry found for buyerId:', buyerId, 'propertyId:', propertyId);
                    console.warn('[ChatList] This buyer may have chatted directly without making an inquiry');
                    console.warn('[ChatList] Will try to find buyer name from Firebase chat room document or messages');
                  }
                } else {
                  console.warn('[ChatList] Inquiries response not successful:', inquiriesResponse);
                }
              } catch (error) {
                console.error('[ChatList] Error fetching buyer info from inquiries:', error);
              }
            } else if (buyerInfo) {
              console.log('[ChatList] Using cached buyer info for buyerId:', buyerId);
            }

            // Step 4: If still no buyer info, check messages (buyer name might be in message sender info)
            if (!buyerInfo && buyerId) {
              try {
                const db = firestore();
                if (db) {
                  // Try to get buyer name from messages (check all messages from buyer)
                  const messagesSnapshot = await db
                    .collection('chats')
                    .doc(room.chatRoomId)
                    .collection('messages')
                    .orderBy('timestamp', 'asc')
                    .get();

                  if (!messagesSnapshot.empty) {
                    // Look through all messages to find one from the buyer with name info
                    for (const doc of messagesSnapshot.docs) {
                      const messageData = doc.data();
                      const senderId = String(messageData.senderId || '');

                      // If message is from buyer, check if sender name is stored
                      if (senderId === String(buyerId)) {
                        const senderName = messageData.senderName || messageData.sender_name;
                        if (senderName && senderName !== 'Buyer' && !senderName.startsWith('Buyer ')) {
                          buyerInfo = {
                            name: senderName,
                            profile_image: messageData.senderProfileImage || messageData.sender_profile_image || undefined,
                          };
                          setBuyerCache(prev => ({ ...prev, [buyerIdStr]: buyerInfo }));
                          console.log('[ChatList] ✅ Found buyer name from message:', senderName);

                          // Also update Firebase chat room document with buyer name for future reference
                          try {
                            await db.collection('chats').doc(room.chatRoomId).update({
                              buyerName: buyerInfo.name,
                              ...(buyerInfo.profile_image && { buyerProfileImage: buyerInfo.profile_image }),
                            });
                            console.log('[ChatList] ✅ Updated Firebase chat room with buyer name from message');
                          } catch (updateError) {
                            console.warn('[ChatList] Could not update Firebase with buyer name from message:', updateError);
                          }
                          break; // Found buyer name, no need to check more messages
                        }
                      }
                    }

                    // If still no buyer name found, log for debugging
                    if (!buyerInfo) {
                      console.warn('[ChatList] No buyer name found in any messages for buyerId:', buyerId);
                    }
                  }
                }
              } catch (msgError) {
                console.warn('[ChatList] Error checking messages for buyer name:', msgError);
              }
            }

            // Step 5: If still no buyer info, call backend API to fetch buyer info directly from database
            if (!buyerInfo && buyerId) {
              try {
                console.log('[ChatList] Calling backend API to fetch buyer info for buyerId:', buyerId);
                const response: any = await sellerService.getBuyer(buyerId);

                if (response?.success && response.data?.buyer) {
                  const buyer = response.data.buyer;
                  const buyerName = buyer.name || buyer.full_name || 'Buyer';
                  const buyerProfileImage = buyer.profile_image || undefined;

                  if (buyerName && buyerName !== 'Buyer' && !buyerName.startsWith('Buyer ')) {
                    const fixedImageUrl = buyerProfileImage ? fixImageUrl(buyerProfileImage) : undefined;
                    buyerInfo = {
                      name: buyerName,
                      profile_image: fixedImageUrl ?? undefined,
                    };

                    // Cache buyer info
                    setBuyerCache(prev => ({ ...prev, [buyerIdStr]: buyerInfo }));
                    console.log('[ChatList] ✅ Fetched buyer info from backend API:', buyerName, 'for buyerId:', buyerId);

                    // Also update Firebase chat room document with buyer name for future reference
                    try {
                      const db = firestore();
                      if (db) {
                        await db.collection('chats').doc(room.chatRoomId).update({
                          buyerName: buyerInfo.name,
                          ...(buyerInfo.profile_image && { buyerProfileImage: buyerInfo.profile_image }),
                        });
                        console.log('[ChatList] ✅ Updated Firebase chat room with buyer name from backend API');
                      }
                    } catch (updateError) {
                      console.warn('[ChatList] Could not update Firebase with buyer name from backend API:', updateError);
                    }
                  }
                } else {
                  console.warn('[ChatList] Backend API response not successful or no buyer data for buyerId:', buyerId);
                }
              } catch (error) {
                console.warn('[ChatList] Failed to fetch buyer info from backend API for buyerId', buyerId, ':', error);
              }
            }

            // Use buyer info if available, otherwise use fallback
            if (buyerInfo && buyerInfo.name && buyerInfo.name !== 'Buyer' && !buyerInfo.name.startsWith('Buyer ')) {
              displayName = buyerInfo.name;
              displayImage = buyerInfo.profile_image;
              console.log('[ChatList] ✅ Using buyer info:', buyerInfo.name, 'for buyerId:', buyerId);
            } else {
              // Fallback: Try to get from room data or use buyerId
              if (room.receiverName && !room.receiverName.startsWith('Buyer ')) {
                displayName = room.receiverName;
                console.log('[ChatList] Using receiverName from room:', displayName);
              } else {
                // Last resort: show buyerId but log warning with full debug info
                // For existing chats without buyer name, we'll show "Buyer {id}" until buyer name is found
                displayName = `Buyer ${buyerId}`;
                console.error('[ChatList] ❌ No buyer name found for buyerId:', buyerId, {
                  buyerIdStr,
                  hasBuyerInfo: !!buyerInfo,
                  buyerInfoName: buyerInfo?.name,
                  cacheSize: Object.keys(buyerCache).length,
                  cacheKeys: Object.keys(buyerCache),
                  roomReceiverName: room.receiverName,
                  propertyId,
                  chatRoomId: room.chatRoomId,
                  note: 'Buyer name will be stored when: 1) They create a new chat, 2) Found in inquiries, 3) Found in Firebase chat room document, 4) Found in messages. For existing chats without buyer name, please update Firebase manually or wait for buyer to send a new message.',
                });
              }
              displayImage = undefined; // No image, will show initials
            }
          }

          // Format price
          const price = property?.price
            ? `₹${parseFloat(String(property.price)).toLocaleString('en-IN')}${property.status === 'rent' ? '/Month' : ''}`
            : '';

          // Get actual last message timestamp from messages subcollection
          let lastMessageTimestamp = room.updatedAt;
          let lastMessageTimestampMs = room.updatedAt instanceof Date
            ? room.updatedAt.getTime()
            : (room.updatedAt?.toDate?.()?.getTime() || Date.now());

          try {
            const db = firestore();
            if (db) {
              const messagesRef = db
                .collection('chats')
                .doc(room.chatRoomId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(1);

              const lastMessageSnapshot = await messagesRef.get();
              if (!lastMessageSnapshot.empty) {
                const lastMessageDoc = lastMessageSnapshot.docs[0];
                const lastMessageData = lastMessageDoc.data();
                if (lastMessageData.timestamp) {
                  const firestoreTimestamp = lastMessageData.timestamp as FirebaseFirestoreTypes.Timestamp;
                  if (firestoreTimestamp && firestoreTimestamp.toDate) {
                    lastMessageTimestamp = firestoreTimestamp.toDate();
                    lastMessageTimestampMs = lastMessageTimestamp.getTime();
                  }
                }
              }
            }
          } catch (error) {
            console.warn('[ChatList] Error fetching last message timestamp:', error);
            // Use room.updatedAt as fallback
          }

          // Format timestamp using actual last message time
          const timestamp = formatTimestamp(lastMessageTimestamp);

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
            timestampMs: lastMessageTimestampMs,
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

          // Get last message timestamp for fallback case too
          let fallbackTimestamp = room.updatedAt;
          let fallbackTimestampMs = room.updatedAt instanceof Date
            ? room.updatedAt.getTime()
            : (room.updatedAt?.toDate?.()?.getTime() || Date.now());

          try {
            const db = firestore();
            if (db) {
              const messagesRef = db
                .collection('chats')
                .doc(room.chatRoomId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(1);

              const lastMessageSnapshot = await messagesRef.get();
              if (!lastMessageSnapshot.empty) {
                const lastMessageDoc = lastMessageSnapshot.docs[0];
                const lastMessageData = lastMessageDoc.data();
                if (lastMessageData.timestamp) {
                  const firestoreTimestamp = lastMessageData.timestamp as FirebaseFirestoreTypes.Timestamp;
                  if (firestoreTimestamp && firestoreTimestamp.toDate) {
                    fallbackTimestamp = firestoreTimestamp.toDate();
                    fallbackTimestampMs = fallbackTimestamp.getTime();
                  }
                }
              }
            }
          } catch {
            // Use room.updatedAt as fallback
          }

          return {
            id: room.chatRoomId,
            chatRoomId: room.chatRoomId,
            name: displayName,
            lastMessage: room.lastMessage || 'No messages yet',
            timestamp: formatTimestamp(fallbackTimestamp),
            timestampMs: fallbackTimestampMs,
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

    // Deduplicate: Keep only one chat per user per property
    // For sellers/agents: Group by buyerId + propertyId (one chat per buyer per property)
    // For buyers: Group by receiverId + propertyId (one chat per seller per property)
    const uniqueByUserAndProperty = new Map<string, ChatListItem>();

    validChats.forEach(chat => {
      // Create unique key: buyerId_propertyId for sellers, receiverId_propertyId for buyers
      let key: string;
      if (isBuyer) {
        // For buyers: receiverId_propertyId (one chat per seller per property)
        key = `${chat.receiverId || 'unknown'}_${chat.propertyId || chat.chatRoomId}`;
      } else {
        // For sellers/agents: buyerId_propertyId (one chat per buyer per property)
        key = `${chat.buyerId || 'unknown'}_${chat.propertyId || chat.chatRoomId}`;
      }

      const existing = uniqueByUserAndProperty.get(key);

      if (!existing) {
        // First occurrence of this user+property combination
        uniqueByUserAndProperty.set(key, chat);
      } else {
        // Compare timestamps - keep the more recent one
        const existingTime = existing.timestampMs || 0;
        const currentTime = chat.timestampMs || 0;

        if (currentTime > existingTime) {
          // Current chat has more recent activity
          uniqueByUserAndProperty.set(key, chat);
        }
      }
    });

    // Convert map back to array and sort by timestamp (most recent first)
    const uniqueChats = Array.from(uniqueByUserAndProperty.values());
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

  const renderChatItem = ({ item }: { item: ChatListItem }) => {
    // Generate initials from buyer name (remove "Buyer" prefix if present)
    let nameForInitials = item.name;
    if (nameForInitials.startsWith('Buyer ')) {
      // If it's "Buyer 123", use "B" as initial
      nameForInitials = 'Buyer';
    }
    const initials = nameForInitials
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const openBuyerCard = async () => {
      const buyerIdRaw = item.buyerId;
      if (!buyerIdRaw) return;

      const buyerId = String(buyerIdRaw);
      setCardMode('buyer');
      setSelectedOwnerPropertyId(null);
      setSelectedOwnerRole(null);
      setSelectedBuyerId(buyerId);
      setBuyerCardVisible(true);
      setBuyerCardError(null);

      if (buyerDetailsCache[buyerId]) return;

      try {
        setBuyerCardLoading(true);
        const resp: any = await sellerService.getBuyer(buyerId);
        const payload =
          resp?.data?.buyer ??
          resp?.data?.user ??
          resp?.data ??
          resp?.buyer ??
          null;

        const fallback = buyerCache[buyerId];
        const name =
          payload?.name ||
          payload?.full_name ||
          fallback?.name ||
          item.name ||
          'Buyer';
        const email = payload?.email || payload?.buyer_email || undefined;
        const phone = payload?.phone || payload?.mobile || payload?.buyer_phone || undefined;
        const profile_image_raw =
          payload?.profile_image ||
          payload?.profileImage ||
          payload?.buyer_profile_image ||
          fallback?.profile_image ||
          item.image ||
          undefined;
        const created_at =
          payload?.created_at ||
          payload?.createdAt ||
          payload?.created_date ||
          payload?.joined_at ||
          payload?.member_since ||
          undefined;

        const normalized: BuyerDetails = {
          id: buyerId,
          name: String(name),
          email: email ? String(email) : undefined,
          phone: phone ? String(phone) : undefined,
          profile_image: profile_image_raw ? (fixImageUrl(String(profile_image_raw)) ?? undefined) : undefined,
          created_at: created_at ? String(created_at) : undefined,
        };

        setBuyerDetailsCache(prev => ({ ...prev, [buyerId]: normalized }));
      } catch (e: any) {
        setBuyerCardError(e?.message ?? 'Failed to load buyer details');
      } finally {
        setBuyerCardLoading(false);
      }
    };

    const openOwnerCard = async () => {
      const propertyIdRaw = item.propertyId;
      if (!propertyIdRaw) return;
      const propertyIdStr = String(propertyIdRaw);
      setCardMode('owner');
      setSelectedOwnerPropertyId(propertyIdStr);
      setSelectedOwnerRole(item.receiverRole ?? null);
      setSelectedBuyerId(null);
      setBuyerCardVisible(true);
      setBuyerCardError(null);

      if (ownerDetailsCache[propertyIdStr]) return;

      try {
        setBuyerCardLoading(true);
        const res: any = await buyerService.getPropertyDetails(propertyIdRaw);
        const data = res?.data;
        const property = data?.property ?? data;
        const owner = property?.owner ?? property?.seller;
        const name =
          property?.seller_name ||
          owner?.name ||
          owner?.full_name ||
          item.name ||
          'Property Owner';
        const email =
          property?.seller_email ||
          owner?.email ||
          undefined;
        const phone =
          property?.seller_phone ||
          owner?.phone ||
          property?.sales_number ||
          property?.mobile_number ||
          undefined;
        const profile_image_raw =
          owner?.profile_image ? fixImageUrl(owner.profile_image) ?? undefined : undefined;

        const normalized: OwnerDetails = {
          id: propertyIdStr,
          name: String(name),
          email: email ? String(email) : undefined,
          phone: phone ? String(phone) : undefined,
          profile_image: profile_image_raw,
        };

        setOwnerDetailsCache(prev => ({ ...prev, [propertyIdStr]: normalized }));
      } catch (e: any) {
        setBuyerCardError(e?.message ?? 'Failed to load owner details');
      } finally {
        setBuyerCardLoading(false);
      }
    };

    const handleAvatarPress = () => {
      const isBuyer = (user?.user_type || '').toLowerCase() === 'buyer';
      if (isBuyer) {
        openOwnerCard();
      } else {
        openBuyerCard();
      }
    };

    const handleDeleteConversation = () => {
      const roomId = item.chatRoomId || item.id;
      if (!roomId) return;
      CustomAlert.alert(
        'Delete conversation?',
        'This will remove the entire chat and all messages for both participants. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const ok = await chatService.deleteConversation(roomId);
              if (ok) {
                loadChatRooms();
              } else {
                CustomAlert.alert('Error', 'Could not delete conversation.');
              }
            },
          },
        ],
      );
    };

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

          // Navigate to chat conversation.
          const isBuyer = (user?.user_type || '').toLowerCase() === 'buyer';
          const counterpartyId = isBuyer ? item.receiverId : item.buyerId;

          navigation.navigate('ChatConversation', {
            conversationId: item.chatRoomId,
            userId: counterpartyId ? Number(counterpartyId) : undefined,
            userName: item.name,
            propertyId: item.propertyId ? Number(item.propertyId) : undefined,
            propertyTitle: item.propertyTitle,
            receiverRole: isBuyer ? item.receiverRole : undefined,
          });
        }}
        onLongPress={handleDeleteConversation}
        delayLongPress={400}
        activeOpacity={0.7}>
        {/* Avatar - Show image or initials */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={(e: any) => {
            e?.stopPropagation?.();
            handleAvatarPress();
          }}
          activeOpacity={0.8}>
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
        </TouchableOpacity>

        {/* Chat Info - WhatsApp style */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, item.unreadCount > 0 && styles.chatNameUnread]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
          {/* Only show property title for buyers, not for sellers/agents */}
          {user?.user_type === 'buyer' && item.propertyTitle && (
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {capitalize(item.propertyTitle)}
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

  // Show login prompt if user is not authenticated (guest)
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <BuyerHeader
          onProfilePress={() => { }}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={() => { }}
          onSignInPress={() => {
            console.log('[ChatList] Navigating to Login screen');
            (navigation as any).navigate('Auth', {
              screen: 'Login',
              params: { returnTo: 'Chats' },
            });
          }}
          onSignUpPress={() => {
            console.log('[ChatList] Navigating to Register screen');
            (navigation as any).navigate('Auth', { screen: 'Register' });
          }}
          showLogout={false}
          showProfile={false}
          showSignIn={true}
          showSignUp={true}
          scrollY={scrollY}
          headerHeight={headerHeight}
        />
        <Animated.View
          style={[
            styles.loginContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: insets.top + 70,
            },
          ]}>
          <View style={styles.loginContent}>
            <View style={styles.loginIconContainer}>
              <TabIcon name="inquiries" color={colors.primary} size={48} />
            </View>
            <Text style={styles.loginTitle}>Login Required</Text>
            <Text style={styles.loginSubtitle}>
              Please login to view and manage your chats
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                (navigation as any).navigate('Auth', {
                  screen: 'Login',
                  params: { returnTo: 'Chats' },
                });
              }}
              activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>Login / Register</Text>
            </TouchableOpacity>
            <Text style={styles.loginNote}>
              Login to access your conversations with property owners
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  const isAgentOrSellerLoading = (user?.user_type || '').toLowerCase() === 'seller' || (user?.user_type || '').toLowerCase() === 'agent';
  if (loading && chatList.length === 0) {
    return (
      <View style={styles.container}>
        {!isAgentOrSellerLoading && (
          <BuyerHeader
            onProfilePress={() => navigation.navigate('Profile')}
            onSupportPress={() => navigation.navigate('Support')}
            onLogoutPress={isLoggedIn ? logout : undefined}
            onSignInPress={
              isGuest
                ? () =>
                  (navigation as any).navigate('Auth', {
                    screen: 'Login',
                    params: { returnTo: 'Chats' },
                  })
                : undefined
            }
            onSignUpPress={
              isGuest
                ? () => (navigation as any).navigate('Auth', { screen: 'Register' })
                : undefined
            }
            showLogout={isLoggedIn}
            showProfile={isLoggedIn}
            showSignIn={isGuest}
            showSignUp={isGuest}
            scrollY={scrollY}
            headerHeight={headerHeight}
          />
        )}
        <View style={[styles.loadingContainer, { paddingTop: isAgentOrSellerLoading ? insets.top + spacing.md * 2 : insets.top + 60 + spacing.md * 2 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </View>
    );
  }

  const userType = (user?.user_type || '').toLowerCase();
  const isAgent = userType === 'agent';
  const isSeller = userType === 'seller';
  const isAgentOrSeller = isSeller || isAgent;

  // Keep existing chatFilter behavior, but allow search for agent UI.
  const filterByUnread = (list: ChatListItem[]) =>
    chatFilter === 'unread' ? list.filter(item => (item.unreadCount || 0) > 0) : list;

  const filterBySearch = (list: ChatListItem[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(item => {
      const name = (item.name || '').toLowerCase();
      const last = (item.lastMessage || '').toLowerCase();
      const prop = (item.propertyTitle || '').toLowerCase();
      return name.includes(q) || last.includes(q) || prop.includes(q);
    });
  };

  const filteredChatList = filterByUnread(chatList);
  const agentFilteredChatList = filterBySearch(filterByUnread(chatList));

  const chatStats = {
    total: chatList.length,
    unread: chatList.filter(i => (i.unreadCount || 0) > 0).length,
    read: chatList.filter(i => (i.unreadCount || 0) === 0).length,
    active: chatList.filter(i => {
      const ms = i.timestampMs ?? 0;
      if (!ms) return false;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - ms <= sevenDays;
    }).length,
  };

  const selectedBuyer = selectedBuyerId ? buyerDetailsCache[selectedBuyerId] : undefined;
  const selectedOwner = selectedOwnerPropertyId ? ownerDetailsCache[selectedOwnerPropertyId] : undefined;
  const memberSinceText = (() => {
    const raw = selectedBuyer?.created_at;
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  })();
  const cardTitle =
    cardMode === 'owner'
      ? selectedOwnerRole === 'agent'
        ? 'Agent Details'
        : selectedOwnerRole === 'seller'
          ? 'Seller Details'
          : 'Property Owner'
      : 'Buyer Details';
  const cardPerson = cardMode === 'owner' ? selectedOwner : selectedBuyer;

  return (
    <View style={styles.container}>
      {/* Buyer UI: keep existing header */}
      {!isAgentOrSeller && (
        <BuyerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={isLoggedIn ? logout : undefined}
          onSignInPress={
            isGuest
              ? () =>
                (navigation as any).navigate('Auth', {
                  screen: 'Login',
                  params: { returnTo: 'Chats' },
                })
              : undefined
          }
          onSignUpPress={
            isGuest
              ? () => (navigation as any).navigate('Auth', { screen: 'Register' })
              : undefined
          }
          showLogout={isLoggedIn}
          showProfile={isLoggedIn}
          showSignIn={isGuest}
          showSignUp={isGuest}
          scrollY={scrollY}
          headerHeight={headerHeight}
        />
      )}

      {/* Agent & Seller UI: "My Inquiries" layout (search + stat pills) */}
      {isAgentOrSeller && (
        <>
          <View style={[styles.searchBar, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.searchInputContainer}>
              <TabIcon name="search" color={colors.textSecondary} size={20} />
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
              onPress={() => setChatFilter(prev => (prev === 'all' ? 'unread' : 'all'))}
              activeOpacity={0.85}>
              <Text style={styles.filterButtonText}>
                {chatFilter === 'all' ? 'All' : 'Unread'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statsGridItem}>
              <View style={[styles.statPill, styles.statPillPrimary]}>
                <Text style={styles.statPillNumber}>{chatStats.total}</Text>
                <Text style={styles.statPillLabel}>Total</Text>
              </View>
            </View>
            <View style={styles.statsGridItem}>
              <View style={[styles.statPill, styles.statPillDanger]}>
                <Text style={styles.statPillNumber}>{chatStats.unread}</Text>
                <Text style={styles.statPillLabel}>New / Unread</Text>
              </View>
            </View>
            <View style={styles.statsGridItem}>
              <View style={[styles.statPill, styles.statPillNeutral]}>
                <Text style={styles.statPillNumber}>{chatStats.read}</Text>
                <Text style={styles.statPillLabel}>Read</Text>
              </View>
            </View>
            <View style={styles.statsGridItem}>
              <View style={[styles.statPill, styles.statPillSuccess]}>
                <Text style={styles.statPillNumber}>{chatStats.active}</Text>
                <Text style={styles.statPillLabel}>Active (7d)</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Seller UI: keep existing simple filter bar - REMOVED to match Agent UI */}

      {(isAgentOrSeller ? agentFilteredChatList.length > 0 : chatList.length > 0) ? (
        <Animated.FlatList
          data={isAgentOrSeller ? agentFilteredChatList : chatList}
          renderItem={renderChatItem}
          keyExtractor={(item: ChatListItem) => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: isAgentOrSeller
                ? spacing.md
                : insets.top + 60 + spacing.md * 2,
              paddingHorizontal: isAgentOrSeller ? spacing.md : undefined,
              paddingBottom: isAgentOrSeller ? spacing.xl : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
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
        <View style={[styles.emptyContainer, { paddingTop: isAgentOrSeller ? spacing.xl : insets.top + 60 + spacing.md * 2 }]}>
          <View style={styles.emptyIconWrap}>
            <TabIcon name="inquiries" color={colors.textSecondary} size={64} />
          </View>
          <Text style={styles.emptyText}>
            {chatFilter === 'unread' ? 'No unread chats' : searchQuery.trim() ? 'No chats found' : 'No chats yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {chatFilter === 'unread'
              ? 'You have no unread messages'
              : searchQuery.trim()
                ? 'Try adjusting your search'
                : 'Start a conversation by chatting with a buyer or property owner'}
          </Text>
        </View>
      )}

      {/* Buyer or Owner details popup card (opens on avatar tap) */}
      <Modal
        visible={buyerCardVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBuyerCardVisible(false)}>
        <Pressable style={styles.buyerCardOverlay} onPress={() => setBuyerCardVisible(false)}>
          <Pressable style={styles.buyerCard} onPress={() => { }}>
            <View style={styles.buyerCardHeader}>
              <Text style={styles.buyerCardTitle}>{cardTitle}</Text>
              <TouchableOpacity onPress={() => setBuyerCardVisible(false)} activeOpacity={0.7}>
                <TabIcon name="close" color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            {buyerCardLoading ? (
              <View style={styles.buyerCardLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.buyerCardLoadingText}>Loading...</Text>
              </View>
            ) : buyerCardError ? (
              <Text style={styles.buyerCardError}>{buyerCardError}</Text>
            ) : cardPerson ? (
              <View style={styles.buyerCardBody}>
                <View style={styles.buyerCardTopRow}>
                  {cardPerson.profile_image ? (
                    <Image source={{ uri: cardPerson.profile_image }} style={styles.buyerCardAvatar} />
                  ) : (
                    <View style={[styles.buyerCardAvatar, styles.buyerCardAvatarFallback]}>
                      <Text style={styles.buyerCardAvatarText}>
                        {String(cardPerson.name || '?')
                          .trim()
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.buyerCardTopInfo}>
                    <Text style={styles.buyerCardName} numberOfLines={2}>
                      {cardPerson.name || (cardMode === 'buyer' ? 'Buyer' : 'Property Owner')}
                    </Text>
                    {cardMode === 'buyer' && (
                      <Text style={styles.buyerCardMeta}>Member since: {memberSinceText}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.buyerCardField}>
                  <Text style={styles.buyerCardLabel}>Phone</Text>
                  <Text style={styles.buyerCardValue}>{cardPerson.phone || '—'}</Text>
                </View>
                <View style={styles.buyerCardField}>
                  <Text style={styles.buyerCardLabel}>Email</Text>
                  <Text style={styles.buyerCardValue}>{cardPerson.email || '—'}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.buyerCardError}>
                {cardMode === 'owner' ? 'Owner details not available.' : 'Buyer details not available.'}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatFilterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  chatFilterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: '#F0F0F0',
  },
  chatFilterOptionActive: {
    backgroundColor: colors.primary,
  },
  chatFilterText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chatFilterTextActive: {
    color: '#FFFFFF',
  },
  // Agent (My Inquiries style) header controls
  searchBar: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    rowGap: spacing.sm,
    columnGap: spacing.sm,
  },
  statsGridItem: {
    width: '48%',
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
  topInsights: {
    maxHeight: 62,
    marginTop: spacing.md,
  },
  topInsightsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  statPill: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 120,
  },
  statPillPrimary: {
    backgroundColor: '#E3F6FF',
    borderColor: '#BFE7FF',
  },
  statPillDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statPillNeutral: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  statPillSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  statPillNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  statPillLabel: {
    ...typography.caption,
    color: colors.text,
    opacity: 0.8,
    marginTop: 2,
    fontWeight: '700',
    fontSize: 11,
  },

  // Buyer details popup card
  buyerCardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  buyerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  buyerCardTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  buyerCardClose: {
    fontSize: 22,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  buyerCardLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  buyerCardLoadingText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  buyerCardError: {
    ...typography.body,
    color: '#c00',
    fontWeight: '600',
  },
  buyerCardBody: {
    gap: spacing.md,
  },
  buyerCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  buyerCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceSecondary,
  },
  buyerCardAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  buyerCardAvatarText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buyerCardTopInfo: {
    flex: 1,
  },
  buyerCardName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  buyerCardMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  buyerCardField: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  buyerCardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  buyerCardValue: {
    ...typography.body,
    color: colors.text,
    marginTop: 4,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.xs,
    flexGrow: 1,
  },
  // WhatsApp-style chat item
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    backgroundColor: '#0077C0', // Brand blue
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  avatarImage: {
    backgroundColor: 'transparent',
  },
  avatarUnread: {
    backgroundColor: '#005A94', // Darker blue for unread
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
    backgroundColor: '#0077C0', // Brand blue badge
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
  emptyIconWrap: {
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
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loginContent: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loginIcon: {
    fontSize: 50,
  },
  loginTitle: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loginSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  loginNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ChatListScreen;
