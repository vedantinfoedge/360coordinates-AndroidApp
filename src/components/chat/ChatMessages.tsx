import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
}

interface ChatMessagesProps {
  messages: Message[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({messages}) => {
  return (
    <ScrollView style={styles.container}>
      {messages.map(message => (
        <View
          key={message.id}
          style={[
            styles.message,
            message.sender === 'me' ? styles.messageMe : styles.messageOther,
          ]}>
          <Text style={styles.messageText}>{message.text}</Text>
          <Text style={styles.timestamp}>{message.timestamp}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  message: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  messageMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#8B5CF6',
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
  },
});

export default ChatMessages;

