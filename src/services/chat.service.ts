import api from './api.service';
import {API_ENDPOINTS, API_CONFIG} from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MirrorFlyCredentials {
  apiKey: string;
  userName: string;
  password: string;
  baseUrl: string;
}

// Firebase Firestore helper functions (as per guide)
// Use React Native Firebase native SDK
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {generateChatRoomId} from './firebase.service';
import { ensureFirebaseAuth } from './firebase.service';

// Check if Firebase is available and initialized
let firebaseAvailable: boolean | null = null;

const checkFirebaseAvailability = (): boolean => {
  if (firebaseAvailable !== null) {
    return firebaseAvailable;
  }
  
  try {
    // React Native Firebase auto-initializes from google-services.json
    // Try to get Firestore instance - this will throw if Firebase is not initialized
    const db = firestore();
    if (!db) {
      console.warn('[Firebase Chat] Firestore instance not available');
      firebaseAvailable = false;
      return false;
    }
    
    firebaseAvailable = true;
    console.log('[Firebase Chat] Firebase is available and ready');
    return true;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    
    // Check if it's a native module not installed error
    if (errorMessage.includes('not installed natively') || 
        errorMessage.includes('firebase.app()') ||
        errorMessage.includes('native module')) {
      console.warn('[Firebase Chat] Firebase native modules not linked');
      console.warn('[Firebase Chat] Rebuild required: cd android && ./gradlew clean && cd .. && npm run android');
      console.warn('[Firebase Chat] Falling back to API-based chat until rebuild');
    } else {
      console.error('[Firebase Chat] Firebase not available:', errorMessage);
    }
    
    firebaseAvailable = false;
    return false;
  }
};

const getFirestore = () => {
  try {
    // React Native Firebase auto-initializes from google-services.json
    // No need to call initializeApp() - just return the firestore instance
    const db = firestore();
    if (!db) {
      if (firebaseAvailable === null) {
        // First time check
        checkFirebaseAvailability();
      }
      return null;
    }
    return db;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    
    // Check if it's a native module not installed error
    if (errorMessage.includes('not installed natively') || 
        errorMessage.includes('firebase.app()') ||
        errorMessage.includes('native module')) {
      console.warn('[Firebase Chat] Firebase native modules not linked. Rebuild required.');
      console.warn('[Firebase Chat] Run: cd android && ./gradlew clean && cd .. && npm run android');
      console.warn('[Firebase Chat] Falling back to API-based chat');
    } else {
      console.error('[Firebase Chat] Error getting Firestore:', errorMessage);
    }
    
    firebaseAvailable = false;
    return null;
  }
};

export const chatService = {
  // Step 1: Create chat room via backend (creates inquiry in database) - as per guide
  createRoom: async (receiverId: number, propertyId: number) => {
    try {
      console.log('[ChatService] Creating chat room via API:', {
        endpoint: API_ENDPOINTS.CHAT_CREATE_ROOM,
        receiverId: receiverId.toString(),
        propertyId: propertyId.toString(),
      });
      
      const response = await api.post(API_ENDPOINTS.CHAT_CREATE_ROOM, {
        receiverId: receiverId.toString(),
        propertyId: propertyId.toString(),
      });
      
      console.log('[ChatService] Chat room API response received:', {
        success: response?.success,
        hasData: !!response?.data,
        responseKeys: response ? Object.keys(response) : [],
        fullResponse: response,
      });
      
      return response;
    } catch (error: any) {
      console.error('[ChatService] Error creating chat room:', {
        message: error?.message,
        error: error?.error,
        status: error?.status,
        response: error?.response,
        fullError: error,
      });
      // Re-throw so caller can handle it
      throw error;
    }
  },

  // Step 2: Create Firebase chat room (matches backend format)
  // Backend format: {receiverId}_{buyerId}_{propertyId} (e.g., "63_95_129")
  // Use the chatRoomId from backend response, or create using backend format
  createFirebaseChatRoom: async (
    buyerId: number,
    receiverId: number,
    receiverRole: 'agent' | 'seller',
    propertyId: number,
    backendChatRoomId?: string, // Optional: use backend's chatRoomId if provided
    buyerName?: string, // Optional: buyer name to store in Firebase
    buyerProfileImage?: string, // Optional: buyer profile image to store in Firebase
  ): Promise<string | null> => {
    try {
      // Try to ensure Firebase Auth is signed in (optional - Firestore might work without it)
      const currentUser = await ensureFirebaseAuth();
      console.log('[Firebase Chat] Checking auth state:', {
        currentUser: currentUser ? currentUser.uid : 'null',
        buyerId,
        receiverId,
        receiverRole,
        propertyId
      });

      // Note: Continue even without auth - Firestore might allow unauthenticated access
      // If security rules require auth, the Firestore operation will fail with permission-denied
      if (!currentUser) {
        console.warn('[Firebase Chat] ⚠️ No Firebase Auth user - continuing anyway. Firestore may require authentication.');
      }

      // Validate all parameters before generating chat room ID
      if (buyerId === undefined || buyerId === null || buyerId === 0) {
        console.error('[Firebase Chat] ❌ buyerId is required and cannot be undefined, null, or 0');
        return null;
      }
      if (receiverId === undefined || receiverId === null || receiverId === 0) {
        console.error('[Firebase Chat] ❌ receiverId is required and cannot be undefined, null, or 0');
        return null;
      }
      if (receiverRole !== 'agent' && receiverRole !== 'seller') {
        console.error('[Firebase Chat] ❌ receiverRole must be "agent" or "seller"');
        return null;
      }
      if (propertyId === undefined || propertyId === null || propertyId === 0) {
        console.error('[Firebase Chat] ❌ propertyId is required and cannot be undefined, null, or 0');
        return null;
      }

      const db = getFirestore();
      if (!db) {
        console.warn('[Firebase Chat] Firestore not available, skipping Firebase room creation');
        return null;
      }

      // Use backend's chatRoomId if provided, otherwise generate using website format
      // Website format: minId_maxId_propertyId (e.g., "5_12_123" for buyer 5, seller 12, property 123)
      // This ensures consistency with website and deterministic IDs
      let chatRoomId: string;
      if (backendChatRoomId) {
        chatRoomId = backendChatRoomId;
        console.log('[Firebase Chat] Using chatRoomId from backend:', chatRoomId);
      } else {
        // Generate using website format: minId_maxId_propertyId
        chatRoomId = generateChatRoomId(buyerId, receiverId, propertyId);
        console.log('[Firebase Chat] Generated chatRoomId using website format:', chatRoomId);
      }
      
      // Additional validation - ensure chatRoomId is valid
      if (!chatRoomId || chatRoomId.includes('undefined') || chatRoomId.includes('null') || chatRoomId.includes('0_0')) {
        console.error('[Firebase Chat] ❌ Invalid chatRoomId generated:', chatRoomId);
        return null;
      }
      
      console.log('[Firebase Chat] Creating/checking chat room:', chatRoomId);
      
      // Log Firebase project info for debugging
      try {
        const app = auth().app;
        console.log('[Firebase Chat] Project info:', {
          name: app.name,
          projectId: app.options.projectId,
          appId: app.options.appId ? '***' + app.options.appId.slice(-4) : 'not set'
        });
      } catch (logError) {
        console.warn('[Firebase Chat] Could not log project info:', logError);
      }
      
      const chatRef = db.collection('chats').doc(chatRoomId);
      
      // Check if chat room exists first, then create if needed
      const docSnapshot = await chatRef.get();
      const exists = docSnapshot.exists;

      if (!exists) {
        console.log('[Firebase Chat] Creating new chat room document...');
        
        // Participants array must match chat room ID format (minId, maxId)
        // This ensures consistency with website and proper querying
        const buyerIdStr = buyerId.toString();
        const receiverIdStr = receiverId.toString();
        const [minId, maxId] = buyerIdStr < receiverIdStr 
          ? [buyerIdStr, receiverIdStr] 
          : [receiverIdStr, buyerIdStr];
        const participants = [minId, maxId];
        
        // Store buyer name and profile image if provided (from backend API response)
        const chatRoomData: any = {
          chatRoomId: chatRoomId,
          buyerId: buyerId.toString(),
          receiverId: receiverId.toString(),
          receiverRole: receiverRole,
          propertyId: propertyId.toString(),
          participants: participants,
          lastMessage: '',
          readStatus: {
            [buyerId.toString()]: 'read',
            [receiverId.toString()]: 'new',
          },
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };
        
        // Store buyer name and profile image if provided (from backend API response)
        if (buyerName && buyerName.trim() && buyerName !== 'Buyer' && !buyerName.startsWith('Buyer ')) {
          chatRoomData.buyerName = buyerName.trim();
          console.log('[Firebase Chat] Storing buyer name in chat room:', buyerName);
        }
        if (buyerProfileImage && buyerProfileImage.trim()) {
          chatRoomData.buyerProfileImage = buyerProfileImage.trim();
          console.log('[Firebase Chat] Storing buyer profile image in chat room');
        }
        
        await chatRef.set(chatRoomData);
        
        // Verify document was created before returning
        const verifySnapshot = await chatRef.get();
        if (!verifySnapshot.exists) {
          console.error('[Firebase Chat] ❌ Chat room document was not created. Firestore write may have failed silently.');
          return null;
        }
        
        console.log('[Firebase Chat] ✅ Chat room created successfully');
      } else {
        console.log('[Firebase Chat] Chat room already exists');
      }

      return chatRoomId;
    } catch (error: any) {
      // Improved error logging - show full error details
      console.error('[Firebase Chat] ❌ Error creating Firebase chat room:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack,
      });
      console.error('[Firebase Chat] ❌ Full error object:', error);
      console.error('[Firebase Chat] ❌ Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Provide helpful error messages
      if (error?.code === 'permission-denied') {
        console.error('[Firebase Chat] ❌ Permission denied. This usually means:');
        console.error('[Firebase Chat] ❌ 1. Firestore security rules require authentication');
        console.error('[Firebase Chat] ❌ 2. Anonymous authentication might not be enabled');
        console.error('[Firebase Chat] ❌ 3. Enable Anonymous auth: Firebase Console → Authentication → Sign-in method → Anonymous → Enable');
        console.error('[Firebase Chat] ❌ 4. Or update Firestore rules to allow unauthenticated access (not recommended for production)');
      } else if (error?.code === 'failed-precondition') {
        console.error('[Firebase Chat] ❌ Firestore index required. Check Firebase Console for index creation link.');
      } else if (error?.code === 'unavailable') {
        console.error('[Firebase Chat] ❌ Firestore is unavailable. Check internet connection and Firebase configuration.');
      } else if (error?.message?.includes('auth') || error?.message?.includes('permission')) {
        console.error('[Firebase Chat] ❌ Authentication/permission error. User may not be logged in to Firebase.');
      }
      
      return null;
    }
  },

  // Step 3: Send message via Firebase (matches website architecture)
  // Website message structure: { id, senderId, senderRole, text, timestamp }
  sendChatMessage: async (
    chatRoomId: string,
    senderId: number,
    senderRole: 'buyer' | 'seller' | 'agent',
    text: string,
  ): Promise<boolean> => {
    try {
      // Try to ensure Firebase Auth is signed in (optional - Firestore might work without it)
      const currentUser = await ensureFirebaseAuth();
      if (!currentUser) {
        console.warn('[Firebase Chat] ⚠️ No Firebase Auth user - continuing anyway. Firestore may require authentication.');
      }

      // Validate all parameters
      if (!chatRoomId || chatRoomId === 'undefined' || chatRoomId === 'null' || chatRoomId.trim() === '') {
        console.error('[Firebase Chat] ❌ chatRoomId is required and cannot be undefined, null, or empty');
        return false;
      }
      if (!senderId || senderId === undefined || senderId === null || senderId === 0) {
        console.error('[Firebase Chat] ❌ senderId is required and cannot be undefined, null, or 0');
        return false;
      }
      if (senderRole !== 'buyer' && senderRole !== 'seller' && senderRole !== 'agent') {
        console.error('[Firebase Chat] ❌ senderRole must be "buyer", "seller", or "agent"');
        return false;
      }
      if (!text || !text.trim()) {
        console.error('[Firebase Chat] ❌ Message text is required');
        return false;
      }

      const db = getFirestore();
      if (!db) {
        console.warn('[Firebase Chat] Firestore not available - cannot send message');
        return false;
      }

      console.log('[Firebase Chat] Sending message to room:', chatRoomId);
      
      // Ensure chat room exists before adding messages - create if it doesn't exist
      const chatRef = db.collection('chats').doc(chatRoomId);
      const roomSnap = await chatRef.get();
      
      if (!roomSnap.exists) {
        console.warn('[Firebase Chat] ⚠️ Chat room does not exist, creating it now...');
        
        // Try to parse chatRoomId to extract info (format: receiverId_buyerId_propertyId)
        const parts = chatRoomId.split('_');
        if (parts.length >= 3) {
          const receiverIdStr = parts[0];
          const buyerIdStr = parts[1];
          const propertyIdStr = parts[2];
          
          const participants = [buyerIdStr, receiverIdStr].sort();
          
          try {
            await chatRef.set({
              chatRoomId: chatRoomId,
              buyerId: buyerIdStr,
              receiverId: receiverIdStr,
              receiverRole: 'seller', // Default, can be updated later
              propertyId: propertyIdStr,
              participants: participants,
              lastMessage: '',
              readStatus: {
                [buyerIdStr]: 'read',
                [receiverIdStr]: 'new',
              },
              createdAt: firestore.FieldValue.serverTimestamp(),
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
            console.log('[Firebase Chat] ✅ Chat room created automatically:', chatRoomId);
          } catch (createError: any) {
            console.error('[Firebase Chat] ❌ Failed to create chat room automatically:', createError);
            return false;
          }
        } else {
          console.error('[Firebase Chat] ❌ Cannot parse chatRoomId to create room. Format should be: receiverId_buyerId_propertyId');
          return false;
        }
      }
      
      // Get room data to update readStatus
      const roomData = roomSnap.data();
      const readStatus = roomData?.readStatus || {};
      
      // Mark message as new for receiver, read for sender
      const updatedReadStatus: { [key: string]: 'new' | 'read' } = {
        ...readStatus,
        [senderId.toString()]: 'read',
      };
      
      // Find the other participant (receiver)
      const participants = roomData?.participants || [];
      const receiverId = participants.find((p: string) => p !== senderId.toString());
      if (receiverId) {
        updatedReadStatus[receiverId] = 'new';
      }
      
      // Add message to subcollection (matches website structure)
      await chatRef
        .collection('messages')
        .add({
          senderId: senderId.toString(),
          senderRole: senderRole,
          text: text.trim(),
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

      // Update chat room (lastMessage and readStatus)
      await chatRef.update({
        lastMessage: text.trim(),
        readStatus: updatedReadStatus,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log('[Firebase Chat] ✅ Message sent successfully');
      return true;
    } catch (error: any) {
      console.error('[Firebase Chat] ❌ Error sending Firebase message:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      
      // Provide helpful error messages
      if (error?.code === 'permission-denied') {
        console.error('[Firebase Chat] ❌ Permission denied. Check Firestore security rules.');
      } else if (error?.code === 'failed-precondition') {
        console.error('[Firebase Chat] ❌ Firestore index required. Check Firebase Console.');
      }
      
      return false;
    }
  },

  // Step 4: Listen to messages via Firebase (as per guide)
  listenToMessages: (
    chatRoomId: string,
    callback: (messages: any[]) => void,
  ): (() => void) | null => {
    try {
      const db = getFirestore();
      
      if (!db) {
        console.warn('[Firebase Chat] Firestore not available for listening');
        return null;
      }
      
      console.log('[Firebase Chat] Setting up listener for room:', chatRoomId);
      
      const unsubscribe = db
        .collection('chats')
        .doc(chatRoomId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(
          (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
            try {
              if (snapshot && !snapshot.empty) {
                console.log('[Firebase Chat] Received', snapshot.docs.length, 'messages');
                const messages = snapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
                  const data = doc.data();
                  let timestamp = new Date();
                  
                  // Convert Firestore timestamp to JavaScript Date
                  if (data.timestamp) {
                    const firestoreTimestamp = data.timestamp as FirebaseFirestoreTypes.Timestamp;
                    if (firestoreTimestamp && firestoreTimestamp.toDate) {
                      timestamp = firestoreTimestamp.toDate();
                    }
                  }
                  
                  // Map message structure to match website format
                  // Website uses: { id, senderId, senderRole, text, timestamp }
                  return {
                    id: doc.id,
                    senderId: data.senderId || '',
                    senderRole: data.senderRole || 'buyer',
                    text: data.text || data.message || '', // Support both 'text' (website) and 'message' (legacy)
                    message: data.text || data.message || '', // Keep for backward compatibility
                    timestamp,
                  };
                });
                callback(messages);
              } else {
                console.log('[Firebase Chat] No messages found');
                callback([]);
              }
            } catch (error: any) {
              console.error('[Firebase Chat] Error processing snapshot:', error?.message);
              callback([]);
            }
          },
          (error: Error) => {
            console.error('[Firebase Chat] Error listening to messages:', {
              message: error?.message,
              name: error?.name,
            });
            // Return empty array on error
            callback([]);
          },
        );
      
      console.log('[Firebase Chat] Listener set up successfully');
      return unsubscribe;
    } catch (error: any) {
      console.error('[Firebase Chat] Firebase not available for listening:', {
        message: error?.message,
        code: error?.code,
      });
      return null;
    }
  },

  // Initialize conversation between buyer and seller (legacy method)
  initConversation: async (
    buyerId: number,
    sellerId: number,
    propertyId: number,
  ) => {
    const response = await api.post(API_ENDPOINTS.CHAT_INIT_CONVERSATION, {
      buyer_id: buyerId,
      seller_id: sellerId,
      property_id: propertyId,
    });
    return response;
  },

  // Get all conversations for current user (from Firebase)
  getConversations: async (userId?: number) => {
    try {
      // Try Firebase first
      if (!userId) {
        // Try to get from auth context or return empty
        console.warn('[ChatService] No userId provided for getConversations');
        return { success: true, data: [] };
      }

      const db = getFirestore();
      if (!db) {
        console.warn('[ChatService] Firestore not available - returning empty list');
        return { success: true, data: [] };
      }

      // Fetch chat rooms from Firebase where user is a participant
      const userIdStr = userId.toString();
      
      // Query without orderBy to avoid index requirement - we'll sort manually
      const query = db
        .collection('chats')
        .where('participants', 'array-contains', userIdStr);
      
      // Fetch without orderBy to avoid requiring a composite index
      const snapshot = await query.get();

      const chatRooms = snapshot.docs.map((doc) => {
        const data = doc.data();
        let updatedAt = new Date();
        
        // Handle timestamp conversion
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
        };
      });

      // Sort by updatedAt if not already sorted (when orderBy failed)
      chatRooms.sort((a, b) => {
        const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
        const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
        return bTime - aTime; // Most recent first
      });

      console.log('[ChatService] Fetched', chatRooms.length, 'chat rooms from Firebase');
      return { success: true, data: chatRooms };
    } catch (error: any) {
      console.error('[ChatService] Error getting conversations from Firebase:', error);
      // Return empty array - no backend API fallback
      return { success: true, data: [] };
    }
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string | number) => {
    try {
      // Try with conversation_id first (as per current implementation)
      let response = await api.get(
        `${API_ENDPOINTS.CHAT_MESSAGES}?conversation_id=${conversationId}`,
      );
      
      // If 404, try with chatRoomId parameter instead
      if (!response || (response as any)?.status === 404 || (response as any)?.error) {
        console.log('[ChatService] Trying alternative parameter: chatRoomId');
        response = await api.get(
          `${API_ENDPOINTS.CHAT_MESSAGES}?chatRoomId=${conversationId}`,
        );
      }
      
      return response;
    } catch (error: any) {
      console.error('[ChatService] Error getting messages:', {
        conversationId,
        endpoint: API_ENDPOINTS.CHAT_MESSAGES,
        error: error?.message,
        status: error?.status,
        response: error?.response
      });
      
      // If 404, the endpoint might not exist - return empty response
      if (error?.status === 404) {
        console.warn('[ChatService] Messages endpoint returned 404. Endpoint may not exist on backend.');
        return { success: true, data: { messages: [] } };
      }
      
      throw error;
    }
  },

  // Send a message
  sendMessage: async (
    conversationId: string | number,
    message: string,
    type: 'text' | 'image' = 'text',
    imageUri?: string,
  ) => {
    const payload: any = {
      conversation_id: conversationId,
      message,
      type,
    };

    if (type === 'image' && imageUri) {
      const formData = new FormData();
      formData.append('conversation_id', String(conversationId));
      formData.append('message', message || '');
      formData.append('type', 'image');
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'message_image.jpg',
      } as any);

      const response = await api.post(API_ENDPOINTS.CHAT_SEND_MESSAGE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    }

    const response = await api.post(API_ENDPOINTS.CHAT_SEND_MESSAGE, payload);
    return response;
  },
};

