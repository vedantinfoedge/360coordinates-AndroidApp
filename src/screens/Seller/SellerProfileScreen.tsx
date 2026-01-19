import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import Button from '../../components/common/Button';
import {userService} from '../../services/user.service';
import {fixImageUrl} from '../../utils/imageHelper';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<SellerTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const SellerProfileScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout, setUser} = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profile_image || null);

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

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Update form data and profile image when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '',
      });
      setOriginalData({
        name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '',
      });
      if (user.profile_image) {
        setProfileImage(fixImageUrl(user.profile_image));
      }
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response: any = await userService.getProfile('seller');
      if (response && response.success && response.data) {
        const profile = response.data.profile || response.data;
        const userData = response.data.user || user;
        
        setFormData({
          name: profile.full_name || userData?.full_name || '',
          phone: userData?.phone || user?.phone || '',
          email: userData?.email || user?.email || '',
          address: profile.address || '',
        });
        setOriginalData({
          name: profile.full_name || userData?.full_name || '',
          phone: userData?.phone || user?.phone || '',
          email: userData?.email || user?.email || '',
          address: profile.address || '',
        });
        if (profile.profile_image) {
          setProfileImage(fixImageUrl(profile.profile_image));
        } else if (userData?.profile_image) {
          setProfileImage(fixImageUrl(userData.profile_image));
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setOriginalData({...formData});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({...originalData});
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response: any = await userService.updateProfile({
        full_name: formData.name,
        address: formData.address,
      });
      
      if (response && (response.success || (response.data && response.data.success))) {
        // Update user context
        if (user) {
          setUser({
            ...user,
            full_name: formData.name,
            address: formData.address,
          });
        }
        setOriginalData({...formData});
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', (response && (response.message || response.data?.message)) || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleImagePicker = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      },
      async response => {
        if (response.didCancel || response.errorCode) {
          return;
        }

        if (response.assets && response.assets[0]) {
          try {
            setSaving(true);
            const uploadResponse: any = await userService.uploadProfileImage(
              response.assets[0].uri || '',
            );

            if (uploadResponse && uploadResponse.success && uploadResponse.data?.url) {
              const imageUrl = fixImageUrl(uploadResponse.data.url);
              if (imageUrl) {
                setProfileImage(imageUrl);
                // Update user context
                if (user) {
                  setUser({
                    ...user,
                    profile_image: imageUrl,
                  });
                }
              }
              Alert.alert('Success', 'Profile picture updated successfully');
            } else {
              Alert.alert('Error', (uploadResponse && uploadResponse.message) || 'Failed to upload image');
            }
          } catch (error: any) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', error?.message || 'Failed to upload image');
          } finally {
            setSaving(false);
          }
        }
      },
    );
  };

  const getRoleLabel = (role?: string) => {
    const userType = role || user?.user_type;
    switch (userType) {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const memberSince = '20 December';

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => {
          // Already on profile page
        }}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onLogoutPress={handleLogout}
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingTop:0}}>
        {/* Top Purple Section */}
        <View style={styles.topSection}>
          {/* Profile Picture */}
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{uri: profileImage}} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(userData.full_name || 'User')}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.editPhotoButton} onPress={handleImagePicker} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.editPhotoText}>📷</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{userData.full_name || 'User'}</Text>
          <Text style={styles.email}>{userData.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleLabel(user?.user_type)}</Text>
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
                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
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
            onPress={() => {
              console.log('[SellerProfile] Navigating to MyProperties');
              navigation.navigate('MyProperties');
            }}>
            <Text style={styles.menuIcon}>🏘️</Text>
            <Text style={styles.menuText}>My Properties</Text>
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.secondary,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.secondary,
  },
  avatarText: {
    ...typography.h1,
    color: colors.textblack,
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
    color: colors.textblack,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.textblack,
    opacity: 0.9,
    marginBottom: spacing.sm,
  },
  roleBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.sm,
  },
  roleText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  memberSince: {
    ...typography.caption,
    color: colors.textblack,
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

export default SellerProfileScreen;
