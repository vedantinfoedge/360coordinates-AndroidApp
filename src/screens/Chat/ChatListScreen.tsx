import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {ChatStackParamList} from '../../navigation/ChatNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import {chatService} from '../../services/chat.service';

type ChatListScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList, 'ChatList'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<BuyerTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

type Props = {
  navigation: ChatListScreenNavigationProp;
};

interface ChatUser {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  avatar?: string;
  isOnline?: boolean;
  propertyId?: string | number;
  propertyTitle?: string;
}

const ChatListScreen: React.FC<Props> = ({navigation}) => {
  const {logout, user} = useAuth();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await chatService.getConversations();
      
      if (response && response.success) {
        const conversations = response.data?.conversations || response.data || [];
        
        // Format conversations for display
        const formatted = conversations.map((conv: any) => {
          // Format timestamp
          let timestamp = 'Just now';
          if (conv.updated_at || conv.last_message_time) {
            const date = new Date(conv.updated_at || conv.last_message_time);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) timestamp = 'Just now';
            else if (diffMins < 60) timestamp = `${diffMins}m ago`;
            else if (diffHours < 24) timestamp = `${diffHours}h ago`;
            else if (diffDays === 1) timestamp = 'Yesterday';
            else if (diffDays < 7) timestamp = `${diffDays}d ago`;
            else timestamp = date.toLocaleDateString();
          }
          
          // Get receiver name (opposite of current user)
          const receiverName = conv.receiver_name || conv.seller_name || conv.buyer_name || 'User';
          
          return {
            id: conv.conversation_id?.toString() || conv.id?.toString() || '',
            name: receiverName,
            lastMessage: conv.last_message || conv.lastMessage || 'No messages yet',
            timestamp,
            unreadCount: conv.unread_count || conv.unreadCount || 0,
            isOnline: false, // Backend doesn't provide this, can be enhanced with Firebase presence
            propertyId: conv.property_id || conv.propertyId,
            propertyTitle: conv.property_title || conv.propertyTitle,
          };
        });
        
        setChatUsers(formatted);
      } else {
        setChatUsers([]);
      }
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', error.message || 'Failed to load conversations');
      setChatUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };
  
  const renderChatItem = ({item}: {item: ChatUser}) => {
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('ChatConversation', {
          conversationId: item.id,
          userId: item.id,
          userName: item.name,
          propertyId: item.propertyId,
          propertyTitle: item.propertyTitle,
        })}
        activeOpacity={0.7}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        {/* Chat Info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
          <View style={styles.messageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && chatUsers.length === 0) {
    return (
      <View style={styles.container}>
        <BuyerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      {chatUsers.length > 0 ? (
        <FlatList
          data={chatUsers}
          renderItem={renderChatItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.accent]}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start chatting with property owners</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  chatItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chatName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  unreadText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ChatListScreen;

