/**
 * Firebase Chat Service - React Native Implementation
 * Uses @react-native-firebase/firestore for Android/iOS
 */

import firestore from '@react-native-firebase/firestore';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

/* =========================================
   Auth Helper - Wait for Auth State
   ✅ FIX #1: Helper to wait for user authentication
========================================= */

/**
 * Ensure Firebase Auth user is signed in
 * Signs in anonymously if not already authenticated
 * This is required for Firestore operations
 * Note: Returns null if auth fails, but Firestore might still work if rules allow unauthenticated access
 */
export const ensureFirebaseAuth = async (): Promise<FirebaseAuthTypes.User | null> => {
  try {
    const currentUser = auth().currentUser;
    if (currentUser) {
      console.log('[Firebase] User already authenticated:', currentUser.uid);
      return currentUser;
    }

    console.log('[Firebase] No Firebase user found, attempting anonymous sign-in...');
    try {
      const userCredential = await auth().signInAnonymously();
      console.log('[Firebase] ✅ Anonymous sign-in successful:', userCredential.user.uid);
      return userCredential.user;
    } catch (authError: any) {
      // Log detailed error information
      console.error('[Firebase] ❌ Anonymous sign-in failed:', {
        message: authError?.message || String(authError),
        code: authError?.code,
        name: authError?.name,
        nativeErrorCode: authError?.nativeErrorCode,
        nativeErrorMessage: authError?.nativeErrorMessage,
        fullError: authError,
      });
      
      // Check if anonymous auth is not enabled
      if (authError?.code === 'auth/operation-not-allowed' || 
          authError?.nativeErrorCode === 'ERROR_OPERATION_NOT_ALLOWED') {
        console.warn('[Firebase] ⚠️ Anonymous authentication is not enabled in Firebase Console.');
        console.warn('[Firebase] ⚠️ To enable: Firebase Console → Authentication → Sign-in method → Anonymous → Enable');
        console.warn('[Firebase] ⚠️ Continuing without Firebase Auth - Firestore may still work if security rules allow unauthenticated access.');
      }
      
      return null;
    }
  } catch (error: any) {
    console.error('[Firebase] ❌ Unexpected error in ensureFirebaseAuth:', {
      message: error?.message || String(error),
      code: error?.code,
      fullError: error,
    });
    return null;
  }
};

/**
 * Wait for Firebase auth state to be ready
 * Returns the current user or null after timeout
 * @param timeoutMs Maximum time to wait in milliseconds (default: 5000ms)
 */
export const waitForAuthState = (timeoutMs: number = 5000): Promise<FirebaseAuthTypes.User | null> => {
  return new Promise((resolve) => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      console.log('[Firebase] User already authenticated:', currentUser.uid);
      resolve(currentUser);
      return;
    }

    console.log('[Firebase] Waiting for auth state...');
    const timeout = setTimeout(() => {
      unsubscribe();
      console.warn('[Firebase] Auth state timeout - user may not be logged in');
      resolve(null);
    }, timeoutMs);

    const unsubscribe = auth().onAuthStateChanged((user) => {
      clearTimeout(timeout);
      unsubscribe();
      if (user) {
        console.log('[Firebase] User authenticated:', user.uid);
        resolve(user);
      } else {
        console.warn('[Firebase] User not authenticated');
        resolve(null);
      }
    });
  });
};

/* =========================================
   Chat Room ID (DETERMINISTIC)
   Format: min(buyerId, posterId)_max(buyerId, posterId)_propertyId
   Ensures exactly one chat per (buyerId + propertyId + posterId)
========================================= */

export const generateChatRoomId = (
  buyerId: string | number,
  posterId: string | number,
  propertyId: string | number
): string => {
  // ✅ FIX #2: Validate all parameters are defined
  if (buyerId === undefined || buyerId === null || buyerId === '') {
    throw new Error('buyerId is required and cannot be undefined, null, or empty');
  }
  if (posterId === undefined || posterId === null || posterId === '') {
    throw new Error('posterId is required and cannot be undefined, null, or empty');
  }
  if (propertyId === undefined || propertyId === null || propertyId === '') {
    throw new Error('propertyId is required and cannot be undefined, null, or empty');
  }

  const buyerIdStr = String(buyerId);
  const posterIdStr = String(posterId);
  
  const [minId, maxId] = buyerIdStr < posterIdStr 
    ? [buyerIdStr, posterIdStr] 
    : [posterIdStr, buyerIdStr];
  
  const chatRoomId = `${minId}_${maxId}_${propertyId}`;
  
  // Additional validation: ensure chatRoomId is not empty
  if (!chatRoomId || chatRoomId.includes('undefined') || chatRoomId.includes('null')) {
    throw new Error(`Invalid chatRoomId generated: ${chatRoomId}. Check buyerId, posterId, and propertyId.`);
  }
  
  return chatRoomId;
};

/* =========================================
   Create / Get Chat Room (ONLY PLACE)
========================================= */

export const createOrGetChatRoom = async (
  buyerId: string | number,
  posterId: string | number,
  posterRole: string,
  propertyId: string | number
): Promise<string> => {
  try {
    // ✅ FIX #1: Check Firebase auth state before proceeding
    const currentUser = auth().currentUser;
    console.log('[Firebase] Checking auth state:', {
      currentUser: currentUser ? currentUser.uid : 'null',
      buyerId,
      posterId,
      propertyId
    });

    if (!currentUser) {
      const errorMsg = 'User not authenticated. auth().currentUser is null. Please wait for auth state or sign in first.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // ✅ FIX #2: Validate all parameters before generating chat room ID
    if (buyerId === undefined || buyerId === null || buyerId === '') {
      throw new Error('buyerId is required and cannot be undefined, null, or empty');
    }
    if (posterId === undefined || posterId === null || posterId === '') {
      throw new Error('posterId is required and cannot be undefined, null, or empty');
    }
    if (propertyId === undefined || propertyId === null || propertyId === '') {
      throw new Error('propertyId is required and cannot be undefined, null, or empty');
    }

    const chatRoomId = generateChatRoomId(buyerId, posterId, propertyId);
    console.log('[Firebase] Generated chat room ID:', chatRoomId);

    // ✅ FIX #4: Log Firebase project info for debugging
    try {
      const app = auth().app;
      console.log('[Firebase] Project info:', {
        name: app.name,
        options: {
          projectId: app.options.projectId,
          appId: app.options.appId,
          apiKey: app.options.apiKey ? '***' + app.options.apiKey.slice(-4) : 'not set'
        }
      });
    } catch (logError) {
      console.warn('[Firebase] Could not log project info:', logError);
    }

    const chatRoomRef = firestore().collection('chats').doc(chatRoomId);
    
    // ✅ FIX #3: Check if chat room exists first, then create if needed
    const snapshot = await chatRoomRef.get();

    if (snapshot.exists) {
      console.log('[Firebase] Chat room already exists, updating timestamp');
      await chatRoomRef.update({
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      return chatRoomId;
    }

    // Create new chat room document
    const buyerIdStr = String(buyerId);
    const posterIdStr = String(posterId);
    const [minId, maxId] = buyerIdStr < posterIdStr 
      ? [buyerIdStr, posterIdStr] 
      : [posterIdStr, buyerIdStr];

    console.log('[Firebase] Creating new chat room document...');
    await chatRoomRef.set({
      buyerId: buyerIdStr,
      receiverId: posterIdStr,
      receiverRole: posterRole,
      propertyId: String(propertyId),
      participants: [minId, maxId],
      lastMessage: '',
      readStatus: {
        [buyerIdStr]: 'new',
        [posterIdStr]: 'new'
      },
      readBy: {},
      lastReadAt: {},
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp()
    });

    // ✅ FIX #3: Verify document was created before returning
    const verifySnapshot = await chatRoomRef.get();
    if (!verifySnapshot.exists) {
      throw new Error('Chat room document was not created. Firestore write may have failed silently.');
    }

    console.log('✅ Chat room created successfully:', chatRoomId);
    return chatRoomId;
  } catch (error: any) {
    console.error('❌ Error creating/getting chat room:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    
    // ✅ FIX #4: Provide helpful error messages
    if (error?.code === 'permission-denied') {
      throw new Error('Firestore permission denied. Check your Firestore security rules and ensure user is authenticated.');
    } else if (error?.code === 'unavailable') {
      throw new Error('Firestore is unavailable. Check your internet connection and Firebase configuration.');
    } else if (error?.code === 'failed-precondition') {
      throw new Error('Firestore index required. Check Firebase Console for index creation link.');
    }
    
    throw error;
  }
};

/* =========================================
   Send Message
========================================= */

export const sendMessage = async (
  chatRoomId: string,
  senderId: string | number,
  senderRole: string,
  text: string
): Promise<void> => {
  // ✅ FIX #1: Check Firebase auth state
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated. auth().currentUser is null.');
  }

  // ✅ FIX #2: Validate all parameters
  if (!chatRoomId || chatRoomId === 'undefined' || chatRoomId === 'null' || chatRoomId.trim() === '') {
    throw new Error('chatRoomId is required and cannot be undefined, null, or empty');
  }
  if (!senderId || senderId === 'undefined' || senderId === 'null' || senderId === '') {
    throw new Error('senderId is required and cannot be undefined, null, or empty');
  }
  if (!senderRole || senderRole.trim() === '') {
    throw new Error('senderRole is required');
  }
  if (!text || !text.trim()) {
    throw new Error('Message text is required');
  }

  try {
    const chatRoomRef = firestore().collection('chats').doc(chatRoomId);
    
    // ✅ FIX #3: Ensure chat room exists before adding messages
    const roomSnap = await chatRoomRef.get();

    if (!roomSnap.exists) {
      throw new Error(`Chat room does not exist: ${chatRoomId}. Create the chat room first before sending messages.`);
    }

    // ✅ FIX #3: Verify chat room document is valid
    const roomData = roomSnap.data();
    if (!roomData) {
      throw new Error('Chat room data not found');
    }

    // Add message to subcollection
    await chatRoomRef.collection('messages').add({
      senderId: String(senderId),
      senderRole,
      text: text.trim(),
      timestamp: firestore.FieldValue.serverTimestamp()
    });

    const otherUser = String(senderId) === roomData.buyerId
      ? roomData.receiverId
      : roomData.buyerId;

    await chatRoomRef.update({
      lastMessage: text.trim(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      [`readStatus.${otherUser}`]: 'new'
    });
  } catch (error: any) {
    console.error('Error sending message:', {
      message: error?.message,
      code: error?.code,
      chatRoomId,
      senderId
    });
    
    if (error?.code === 'permission-denied') {
      throw new Error('Permission denied. Check Firestore security rules.');
    } else if (error?.code === 'failed-precondition') {
      throw new Error('Firestore index required. Check Firebase Console.');
    }
    
    throw error;
  }
};

/* =========================================
   Message Interface
========================================= */

export interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  text: string;
  timestamp: Date;
  [key: string]: any;
}

/* =========================================
   Listen Messages
========================================= */

export const listenToMessages = (
  chatRoomId: string,
  callback: (messages: Message[], error: Error | null) => void
): (() => void) => {
  if (!chatRoomId) {
    console.error('listenToMessages: chatRoomId is required');
    callback([], new Error('chatRoomId is required'));
    return () => {};
  }

  let unsubscribe: (() => void) | null = null;
  let isActive = true;

  try {
    const messagesRef = firestore()
      .collection('chats')
      .doc(chatRoomId)
      .collection('messages')
      .orderBy('timestamp', 'asc');

    unsubscribe = messagesRef.onSnapshot(
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        if (!isActive) return;
        
        try {
          const messages: Message[] = snapshot.docs.map(d => {
            const data = d.data();
            let timestamp = new Date();
            
            if (data.timestamp) {
              const firestoreTimestamp = data.timestamp as FirebaseFirestoreTypes.Timestamp;
              if (firestoreTimestamp && firestoreTimestamp.toDate && typeof firestoreTimestamp.toDate === 'function') {
                timestamp = firestoreTimestamp.toDate();
              } else if (data.timestamp instanceof Date) {
                timestamp = data.timestamp;
              } else if (data.timestamp && typeof data.timestamp === 'object' && '_seconds' in data.timestamp) {
                const ts = data.timestamp as { _seconds: number };
                timestamp = new Date(ts._seconds * 1000);
              } else if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
                timestamp = new Date(data.timestamp);
              }
            }

            return {
              id: d.id,
              ...data,
              timestamp: timestamp
            } as Message;
          });
          callback(messages, null);
        } catch (error) {
          console.error('Error processing messages:', error);
          callback([], error instanceof Error ? error : new Error(String(error)));
        }
      },
      (error: Error) => {
        if (!isActive) return;
        console.error('Firebase listener error:', error);
        callback([], error);
      }
    );
  } catch (error) {
    console.error('Firebase listener initialization error:', error);
    callback([], error instanceof Error ? error : new Error(String(error)));
  }

  return () => {
    isActive = false;
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
    }
  };
};

/* =========================================
   Chat Room Interface
========================================= */

export interface ChatRoom {
  id: string;
  buyerId: string;
  receiverId: string;
  receiverRole: string;
  propertyId: string;
  participants: string[];
  lastMessage: string;
  readStatus: { [userId: string]: string };
  readBy: { [userId: string]: any };
  lastReadAt: { [userId: string]: any };
  createdAt: any;
  updatedAt: Date;
  [key: string]: any;
}

/* =========================================
   Get Chat Rooms (ALL ROLES)
========================================= */

export const getUserChatRooms = async (userId: string | number): Promise<ChatRoom[]> => {
  // ✅ FIX #1: Check Firebase auth state
  const currentUser = auth().currentUser;
  if (!currentUser) {
    console.warn('[Firebase] getUserChatRooms: User not authenticated');
    return [];
  }

  // ✅ FIX #2: Validate userId
  if (!userId || userId === 'undefined' || userId === 'null' || userId === '') {
    throw new Error('userId is required and cannot be undefined, null, or empty');
  }

  try {
    // ✅ FIX #5: This query uses array-contains without orderBy, so no index needed
    // If you add .orderBy('updatedAt', 'desc'), you'll need a composite index
    const snapshot = await firestore()
      .collection('chats')
      .where('participants', 'array-contains', String(userId))
      .get();

    const rooms: ChatRoom[] = snapshot.docs.map(d => {
      const data = d.data();
      let updatedAt = new Date(0);
      
      if (data.updatedAt) {
        const firestoreTimestamp = data.updatedAt as FirebaseFirestoreTypes.Timestamp;
        if (firestoreTimestamp && firestoreTimestamp.toDate && typeof firestoreTimestamp.toDate === 'function') {
          updatedAt = firestoreTimestamp.toDate();
        } else if (data.updatedAt instanceof Date) {
          updatedAt = data.updatedAt;
        } else if (data.updatedAt && typeof data.updatedAt === 'object' && '_seconds' in data.updatedAt) {
          const ts = data.updatedAt as { _seconds: number };
          updatedAt = new Date(ts._seconds * 1000);
        }
      }

      return {
        id: d.id,
        ...data,
        updatedAt: updatedAt
      } as ChatRoom;
    });

    rooms.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return rooms;
  } catch (error: any) {
    console.error('Error fetching user chat rooms:', {
      message: error?.message,
      code: error?.code
    });
    
    // ✅ FIX #5: Check for index error
    if (error?.code === 'failed-precondition') {
      const errorMsg = 'Firestore index required. Check the error message for the index creation link, or create a composite index in Firebase Console for: collection=chats, fields=[participants (Array), updatedAt (Descending)]';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }
    
    throw error;
  }
};

/* =========================================
   Read Status
========================================= */

export const markChatAsRead = async (
  chatRoomId: string,
  userId: string | number
): Promise<void> => {
  try {
    await firestore()
      .collection('chats')
      .doc(chatRoomId)
      .update({
        [`readStatus.${userId}`]: 'read',
        [`readBy.${userId}`]: firestore.FieldValue.serverTimestamp(),
        [`lastReadAt.${userId}`]: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('Error marking chat as read:', error);
    throw error;
  }
};

export const getInquiryReadStatus = async (
  chatRoomId: string,
  userId: string | number
): Promise<{ status: string | null }> => {
  try {
    const chatRoomRef = firestore().collection('chats').doc(chatRoomId);
    const snapshot = await chatRoomRef.get();

    if (!snapshot.exists) {
      return { status: null };
    }

    const data = snapshot.data();
    if (!data) {
      return { status: null };
    }

    const readStatus = data.readStatus || {};
    const status = readStatus[String(userId)] || null;

    return { status };
  } catch (error) {
    console.error('Error getting inquiry read status:', error);
    throw error;
  }
};

export const updateInquiryReadStatus = async (
  chatRoomId: string,
  userId: string | number,
  status: string
): Promise<void> => {
  try {
    await firestore()
      .collection('chats')
      .doc(chatRoomId)
      .update({
        [`readStatus.${userId}`]: status,
        [`readBy.${userId}`]: firestore.FieldValue.serverTimestamp(),
        [`lastReadAt.${userId}`]: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('Error updating inquiry read status:', error);
    throw error;
  }
};

/* =========================================
   Get Chat Room Details
========================================= */

export const getChatRoomDetails = async (
  chatRoomId: string
): Promise<ChatRoom | null> => {
  try {
    const snap = await firestore()
      .collection('chats')
      .doc(chatRoomId)
      .get();
    
    return snap.exists ? ({ id: snap.id, ...snap.data() } as ChatRoom) : null;
  } catch (error) {
    console.error('Error getting chat room details:', error);
    throw error;
  }
};

/* =========================================
   Export
========================================= */

export default {
  generateChatRoomId,
  createOrGetChatRoom,
  sendMessage,
  listenToMessages,
  getUserChatRooms,
  markChatAsRead,
  getChatRoomDetails,
  getInquiryReadStatus,
  updateInquiryReadStatus,
  waitForAuthState,
  ensureFirebaseAuth
};
