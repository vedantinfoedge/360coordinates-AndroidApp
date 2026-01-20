import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import CustomAlert from '../../utils/alertHelper';

type AdminDashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

type Props = {
  navigation: AdminDashboardScreenNavigationProp;
};

const AdminDashboardScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const ADMIN_WEB_URL = 'https://demo1.indiapropertys.com/admin'; // Update with actual admin URL

  const handleOpenAdminDashboard = async () => {
    try {
      const canOpen = await Linking.canOpenURL(ADMIN_WEB_URL);
      if (canOpen) {
        await Linking.openURL(ADMIN_WEB_URL);
      } else {
        CustomAlert.alert('Error', 'Cannot open admin dashboard. Please check the URL.');
      }
    } catch (error) {
      CustomAlert.alert('Error', 'Failed to open admin dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Access</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🌐</Text>
        </View>
        
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          The admin dashboard is available on our website. Click below to access it.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleOpenAdminDashboard}>
          <Text style={styles.buttonText}>Open Website Admin Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Note: You will be redirected to the website where you can manage all admin functions including properties, users, agents, inquiries, and settings.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    minWidth: 250,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
});

export default AdminDashboardScreen;
