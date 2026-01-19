import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Inquiry {
  id: string;
  propertyTitle: string;
  userName: string;
  message: string;
  date: string;
  status: 'new' | 'read' | 'replied';
}

const inquiries: Inquiry[] = [
  {
    id: '1',
    propertyTitle: 'Modern Apartment',
    userName: 'John Doe',
    message: 'I am interested in viewing this property.',
    date: '2024-01-15',
    status: 'new',
  },
  {
    id: '2',
    propertyTitle: 'Luxury Villa',
    userName: 'Jane Smith',
    message: 'Can you provide more details about the property?',
    date: '2024-01-14',
    status: 'read',
  },
];

const BuilderInquiriesScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return colors.accent;
      case 'read':
        return colors.textSecondary;
      case 'replied':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const renderInquiry = ({item}: {item: Inquiry}) => (
    <TouchableOpacity 
      style={styles.inquiryCard}
      onPress={() => {
        if (navigation) {
          navigation.navigate('Chat' as any, {
            screen: 'ChatConversation',
            params: {
              userId: item.id,
              userName: item.userName,
            },
          });
        }
      }}>
      <View style={styles.inquiryHeader}>
        <View style={styles.inquiryInfo}>
          <Text style={styles.propertyTitle}>{item.propertyTitle}</Text>
          <Text style={styles.userName}>{item.userName}</Text>
        </View>
        <View
          style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.date}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AgentHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      <FlatList
        data={inquiries}
        renderItem={renderInquiry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No inquiries yet</Text>
            <Text style={styles.emptySubtext}>
              Inquiries from potential buyers will appear here
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  inquiryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  inquiryInfo: {
    flex: 1,
  },
  propertyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
  },
  message: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default BuilderInquiriesScreen;

