import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
}

interface ChatSidebarProps {
  chats: Chat[];
  onChatSelect: (chatId: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({chats, onChatSelect}) => {
  return (
    <View style={styles.container}>
      {chats.map(chat => (
        <TouchableOpacity
          key={chat.id}
          style={styles.chatItem}
          onPress={() => onChatSelect(chat.id)}>
          <Text style={styles.chatName}>{chat.name}</Text>
          <Text style={styles.lastMessage}>{chat.lastMessage}</Text>
          <Text style={styles.timestamp}>{chat.timestamp}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
  },
});

export default ChatSidebar;

