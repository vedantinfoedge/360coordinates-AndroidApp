import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {ChatStackParamList} from '../../navigation/ChatNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';

type ChatConversationScreenNavigationProp = NativeStackNavigationProp<
  ChatStackParamList,
  'ChatConversation'
>;

type ChatConversationScreenRouteProp = RouteProp<
  ChatStackParamList,
  'ChatConversation'
>;

type Props = {
  navigation: ChatConversationScreenNavigationProp;
  route: ChatConversationScreenRouteProp;
};

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  isSent: boolean; // true if sent by current user
}

// Dummy messages data
const getMessages = (userId: string): Message[] => {
  const messages: Record<string, Message[]> = {
    '1': [
      {
        id: '1',
        text: 'Hi, I am interested in the property you listed.',
        senderId: 'other',
        timestamp: '10:25 AM',
        isSent: false,
      },
      {
        id: '2',
        text: 'Hello! Thank you for your interest. Which property are you referring to?',
        senderId: 'me',
        timestamp: '10:26 AM',
        isSent: true,
      },
      {
        id: '3',
        text: 'The 3BHK apartment in Mumbai. Can you share more details?',
        senderId: 'other',
        timestamp: '10:27 AM',
        isSent: false,
      },
      {
        id: '4',
        text: 'Sure! It\'s a fully furnished apartment with modern amenities.',
        senderId: 'me',
        timestamp: '10:28 AM',
        isSent: true,
      },
      {
        id: '5',
        text: 'Great! When can we schedule a visit?',
        senderId: 'other',
        timestamp: '10:30 AM',
        isSent: false,
      },
    ],
    '2': [
      {
        id: '1',
        text: 'When can we schedule a visit?',
        senderId: 'other',
        timestamp: 'Yesterday',
        isSent: false,
      },
      {
        id: '2',
        text: 'I am available this weekend. Does that work for you?',
        senderId: 'me',
        timestamp: 'Yesterday',
        isSent: true,
      },
    ],
    '3': [
      {
        id: '1',
        text: 'The property looks great!',
        senderId: 'other',
        timestamp: '2 days ago',
        isSent: false,
      },
      {
        id: '2',
        text: 'Thank you! Would you like to know more about it?',
        senderId: 'me',
        timestamp: '2 days ago',
        isSent: true,
      },
    ],
  };

  return messages[userId] || [];
};

const ChatConversationScreen: React.FC<Props> = ({navigation, route}) => {
  const {userId, userName} = route.params;
  const [messages, setMessages] = useState<Message[]>(getMessages(userId));
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        senderId: 'me',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        isSent: true,
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  const renderMessage = ({item}: {item: Message}) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.isSent ? styles.sentMessage : styles.receivedMessage,
        ]}>
        <View
          style={[
            styles.messageBubble,
            item.isSent ? styles.sentBubble : styles.receivedBubble,
          ]}>
          <Text
            style={[
              styles.messageText,
              item.isSent ? styles.sentText : styles.receivedText,
            ]}>
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              item.isSent ? styles.sentTime : styles.receivedTime,
            ]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerName} numberOfLines={1}>
            {userName}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({animated: true})
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.surface,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerAvatarText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  headerName: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  messageContainer: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  sentBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  receivedBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  sentText: {
    color: colors.surface,
  },
  receivedText: {
    color: colors.text,
  },
  messageTime: {
    ...typography.small,
    alignSelf: 'flex-end',
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.text,
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  sendButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default ChatConversationScreen;

