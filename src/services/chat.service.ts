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
const getFirestore = async () => {
  try {
    const firestore = require('@react-native-firebase/firestore').default;
    return firestore();
  } catch (error) {
    console.error('Firebase not initialized:', error);
    return null;
  }
};

export const chatService = {
  // Step 1: Create chat room via backend (creates inquiry in database) - as per guide
  createRoom: async (receiverId: number, propertyId: number) => {
    const response = await api.post(API_ENDPOINTS.CHAT_CREATE_ROOM, {
      receiverId: receiverId.toString(),
      propertyId: propertyId.toString(),
    });
    return response;
  },

  // Step 2: Create Firebase chat room (as per guide)
  createFirebaseChatRoom: async (
    buyerId: number,
    sellerId: number,
    propertyId: number,
  ): Promise<string | null> => {
    try {
      const db = await getFirestore();
      if (!db) {
        console.warn('Firebase not available, skipping Firebase room creation');
        return null;
      }

      const chatRoomId = `${Math.min(buyerId, sellerId)}_${Math.max(buyerId, sellerId)}_${propertyId}`;
      const chatRef = db.collection('chats').doc(chatRoomId);
      const exists = (await chatRef.get()).exists;

      if (!exists) {
        await chatRef.set({
          buyerId: buyerId.toString(),
          receiverId: sellerId.toString(),
          propertyId: propertyId.toString(),
          participants: [buyerId.toString(), sellerId.toString()],
          lastMessage: '',
          createdAt: db.FieldValue.serverTimestamp(),
          updatedAt: db.FieldValue.serverTimestamp(),
        });
      }

      return chatRoomId;
    } catch (error) {
      console.error('Error creating Firebase chat room:', error);
      return null;
    }
  },

  // Step 3: Send message via Firebase (as per guide)
  sendChatMessage: async (
    chatRoomId: string,
    senderId: number,
    message: string,
  ): Promise<boolean> => {
    try {
      const db = await getFirestore();
      if (!db) {
        console.warn('Firebase not available, falling back to API');
        return false;
      }

      await db
        .collection('chats')
        .doc(chatRoomId)
        .collection('messages')
        .add({
          senderId: senderId.toString(),
          message: message,
          timestamp: db.FieldValue.serverTimestamp(),
          read: false,
        });

      // Update chat room
      await db.collection('chats').doc(chatRoomId).update({
        lastMessage: message,
        updatedAt: db.FieldValue.serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error sending Firebase message:', error);
      return false;
    }
  },

  // Step 4: Listen to messages via Firebase (as per guide)
  listenToMessages: (
    chatRoomId: string,
    callback: (messages: any[]) => void,
  ): (() => void) | null => {
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      const db = firestore();
      
      if (!db) {
        console.warn('Firebase Firestore not available');
        return null;
      }
      
      return db
        .collection('chats')
        .doc(chatRoomId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(
          (snapshot: any) => {
            if (snapshot && !snapshot.empty) {
            const messages = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data(),
            }));
            callback(messages);
            } else {
              callback([]);
            }
          },
          (error: any) => {
            console.error('Error listening to messages:', error);
            // Return empty array on error
            callback([]);
          },
        );
    } catch (error) {
      console.error('Firebase not available for listening:', error);
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

  // Get all conversations for current user
  getConversations: async () => {
    const response = await api.get(API_ENDPOINTS.CHAT_CONVERSATIONS);
    return response;
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string | number) => {
    const response = await api.get(
      `${API_ENDPOINTS.CHAT_MESSAGES}?conversation_id=${conversationId}`,
    );
    return response;
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

