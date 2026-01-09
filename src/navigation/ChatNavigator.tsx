import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ChatListScreen from '../screens/Chat/ChatListScreen';
import ChatConversationScreen from '../screens/Chat/ChatConversationScreen';
import {colors} from '../theme';

export type ChatStackParamList = {
  ChatList: undefined;
  ChatConversation: {
    userId?: number | string;
    userName?: string;
    propertyId?: number | string;
    propertyTitle?: string;
    conversationId?: string | number;
  };
};

const ChatStack = createNativeStackNavigator<ChatStackParamList>();

const ChatNavigator = () => {
  return (
    <ChatStack.Navigator
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

