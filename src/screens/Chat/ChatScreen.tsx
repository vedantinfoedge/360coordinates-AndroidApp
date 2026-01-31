import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomAlert from '../../utils/alertHelper';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

interface ChatScreenProps {
  receiverId: string;
  receiverName?: string;
}

const ChatScreen: React.FC<ChatScreenProps> = ({receiverId, receiverName = 'User'}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) {
      CustomAlert.alert('Error', 'User not authenticated');
      setLoading(false);
      return;
    }

    const unsubscribe = listenToMessages();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, receiverId]);

  const listenToMessages = () => {
    if (!currentUser) {
      return null;
    }

    const currentUserId = currentUser.uid;

    // Query messages where current user is sender and receiver is receiverId
    const query1 = firestore()
      .collection('messages')
      .where('senderId', '==', currentUserId)
      .where('receiverId', '==', receiverId);

    // Query messages where receiver is sender and current user is receiver
    const query2 = firestore()
      .collection('messages')
      .where('senderId', '==', receiverId)
      .where('receiverId', '==', currentUserId);

    let messages1: Message[] = [];
    let messages2: Message[] = [];

    const unsubscribe1 = query1.onSnapshot(
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        messages1 = [];
        snapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          messages1.push({
            id: doc.id,
            text: data.text || '',
            senderId: data.senderId || '',
            receiverId: data.receiverId || '',
            createdAt: data.createdAt || firestore.Timestamp.now(),
          });
        });
        mergeAndUpdateMessages();
      },
      (error: Error) => {
        console.error('[ChatScreen] Error listening to messages (query1):', error);
        CustomAlert.alert('Error', 'Failed to load messages');
        setLoading(false);
      },
    );

    const unsubscribe2 = query2.onSnapshot(
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        messages2 = [];
        snapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          messages2.push({
            id: doc.id,
            text: data.text || '',
            senderId: data.senderId || '',
            receiverId: data.receiverId || '',
            createdAt: data.createdAt || firestore.Timestamp.now(),
          });
        });
        mergeAndUpdateMessages();
      },
      (error: Error) => {
        console.error('[ChatScreen] Error listening to messages (query2):', error);
        CustomAlert.alert('Error', 'Failed to load messages');
        setLoading(false);
      },
    );

    const mergeAndUpdateMessages = () => {
      const allMessages = [...messages1, ...messages2];
      
      // Remove duplicates and sort by createdAt
      const uniqueMessages = allMessages.reduce((acc: Message[], current: Message) => {
        const exists = acc.find(msg => msg.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      uniqueMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      setMessages(uniqueMessages);
      setLoading(false);

      // Auto-scroll to latest message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    };

    // Return cleanup function
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending || !currentUser) {
      return;
    }

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await firestore()
        .collection('messages')
        .add({
          text: messageText,
          senderId: currentUser.uid,
          receiverId: receiverId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      // Auto-scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    } catch (error: any) {
      console.error('[ChatScreen] Error sending message:', error);
      CustomAlert.alert('Error', 'Failed to send message. Please try again.');
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: FirebaseFirestoreTypes.Timestamp): string => {
    if (!timestamp || !timestamp.toDate) {
      return '';
    }

    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const renderMessage = ({item}: {item: Message}) => {
    if (!currentUser) {
      return null;
    }

    const isSent = item.senderId === currentUser.uid;

    return (
      <View
        style={[
          styles.messageContainer,
          isSent ? styles.sentMessageContainer : styles.receivedMessageContainer,
        ]}>
        <View
          style={[
            styles.messageBubble,
            isSent ? styles.sentBubble : styles.receivedBubble,
          ]}>
          <Text
            style={[
              styles.messageText,
              isSent ? styles.sentMessageText : styles.receivedMessageText,
            ]}>
            {item.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isSent ? styles.sentTimestamp : styles.receivedTimestamp,
            ]}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please sign in to use chat</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{receiverName}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0077C0" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({animated: true});
            }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}>
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  sentMessageContainer: {
    justifyContent: 'flex-end',
  },
  receivedMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: '#0077C0',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  sentMessageText: {
    color: '#FFFFFF',
  },
  receivedMessageText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  sentTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  receivedTimestamp: {
    color: '#999999',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#000000',
    marginRight: 8,
    backgroundColor: '#FAFAFA',
  },
  sendButton: {
    backgroundColor: '#0077C0',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
});

export default ChatScreen;
