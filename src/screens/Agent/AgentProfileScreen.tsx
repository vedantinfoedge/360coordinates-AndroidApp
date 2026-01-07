import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {AgentTabParamList} from '../../components/navigation/AgentTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import Button from '../../components/common/Button';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AgentTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const AgentProfileScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();

  const userData = user || {
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 98765 43210',
    address: 'Mumbai, Maharashtra',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userData.full_name || '',
    phone: userData.phone || '',
    email: userData.email,
    address: userData.address || '',
  });

  const [originalData, setOriginalData] = useState({
    name: userData.full_name || '',
    phone: userData.phone || '',
    email: userData.email,
    address: userData.address || '',
  });

  const handleEdit = () => {
    setOriginalData({...formData});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({...originalData});
    setIsEditing(false);
  };

  const handleSave = () => {
    // TODO: Save to backend
    setIsEditing(false);
    // Update original data
    setOriginalData({...formData});
  };

  const handleLogout = async () => {
    await logout();
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'buyer':
        return 'Buyer';
      case 'seller':
        return 'Seller';
      case 'agent':
        return 'Agent';
      default:
        return 'User';
    }
  };

  const memberSince = '20 December';

  return (
    <View style={styles.container}>
      <AgentHeader
        onProfilePress={() => {
          // Already on profile page
        }}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onLogoutPress={handleLogout}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Top Purple Section */}
        <View style={styles.topSection}>
          {/* Profile Picture */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(userData.full_name || '')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
            <TouchableOpacity style={styles.editPhotoButton}>
              <Text style={styles.editPhotoText}>📷</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{userData.full_name || 'User'}</Text>
          <Text style={styles.email}>{userData.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
          </View>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>

        {/* Profile Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={handleEdit}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.name}
                onChangeText={text => setFormData({...formData, name: text})}
                editable={isEditing}
                placeholder="Enter your full name"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.email}
                editable={false}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={text => setFormData({...formData, phone: text})}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="Enter your phone number"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
                value={formData.address}
                onChangeText={text => setFormData({...formData, address: text})}
                editable={isEditing}
                multiline
                numberOfLines={3}
                placeholder="Enter your address"
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Menu Items Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Listings')}>
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuText}>My Listings</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Inquiries')}>
            <Text style={styles.menuIcon}>💬</Text>
            <Text style={styles.menuText}>Inquiries</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Support' as never)}>
            <Text style={styles.menuIcon}>🆘</Text>
            <Text style={styles.menuText}>Support</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  topSection: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  editPhotoText: {
    fontSize: 16,
  },
  name: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: spacing.sm,
  },
  roleBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  roleText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  memberSince: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.8,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  editButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  form: {
    marginTop: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  menuSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: spacing.md,
    width: 30,
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  logoutText: {
    color: colors.error,
  },
  menuArrow: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 18,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.xxl + spacing.md,
  },
});

export default AgentProfileScreen;
