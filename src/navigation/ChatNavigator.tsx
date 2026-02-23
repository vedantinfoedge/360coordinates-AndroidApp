import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ChatListScreen from '../screens/Chat/ChatListScreen';
import ChatConversationScreen from '../screens/Chat/ChatConversationScreen';
import PropertyDetailsScreen from '../screens/Buyer/PropertyDetailsScreen';
import {colors} from '../theme';

export type ChatStackParamList = {
  ChatList: undefined;
  ChatConversation: {
    userId?: number | string;
    userName?: string;
    propertyId?: number | string;
    propertyTitle?: string;
    conversationId?: string | number;
    receiverRole?: 'agent' | 'seller';
    /** When opening as buyer, pass seller/agent phone to avoid access issues. */
    counterpartyPhone?: string;
  };
  PropertyDetails: {propertyId: string};
};

const ChatStack = createNativeStackNavigator<ChatStackParamList>();

const ChatNavigator = () => {
  return (
    <ChatStack.Navigator
      initialRouteName="ChatList"
      screenOptions={{
        headerShown: false,
      }}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatStack.Screen
        name="ChatConversation"
        component={ChatConversationScreen}
      />
      <ChatStack.Screen
        name="PropertyDetails"
        component={PropertyDetailsScreen}
      />
    </ChatStack.Navigator>
  );
};

export default ChatNavigator;

