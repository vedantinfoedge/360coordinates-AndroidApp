import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ChatListScreen from '../screens/Chat/ChatListScreen';
import ChatConversationScreen from '../screens/Chat/ChatConversationScreen';
import {colors} from '../theme';

export type ChatStackParamList = {
  ChatList: undefined;
  ChatConversation: {
    // Counterparty user id (buyer OR poster depending on current user's role).
    // ChatConversationScreen computes deterministic Firestore roomId using:
    // generateChatRoomId(buyerId, posterId, propertyId)
    userId?: number | string;
    userName?: string;
    propertyId?: number | string;
    propertyTitle?: string;
    // Optional: legacy / precomputed room id. If provided and exists, it may be used for backward compatibility.
    conversationId?: string | number;
    // Only needed for buyer-side labeling (poster is seller or agent).
    receiverRole?: 'agent' | 'seller';
  };
};

const ChatStack = createNativeStackNavigator<ChatStackParamList>();

const ChatNavigator = () => {
  return (
    <ChatStack.Navigator
      initialRouteName="ChatList"
      screenOptions={{
        headerShown: false, // We use custom headers in screens
      }}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatStack.Screen
        name="ChatConversation"
        component={ChatConversationScreen}
      />
    </ChatStack.Navigator>
  );
};

export default ChatNavigator;

