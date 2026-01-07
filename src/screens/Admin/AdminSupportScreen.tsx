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

type AdminSupportScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminSupport'
>;

type Props = {
  navigation: AdminSupportScreenNavigationProp;
};

const AdminSupportScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const ADMIN_WEB_URL = 'https://demo1.indiapropertys.com/admin/support';

  const handleOpenAdminDashboard = async () => {
    try {
      await Linking.openURL(ADMIN_WEB_URL);
    } catch (error) {
      console.error('Error opening admin dashboard:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Support</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>Admin support management is available on the website.</Text>
        <TouchableOpacity style={styles.button} onPress={handleOpenAdminDashboard}>
          <Text style={styles.buttonText}>Open Website Admin</Text>
        </TouchableOpacity>
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
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default AdminSupportScreen;
