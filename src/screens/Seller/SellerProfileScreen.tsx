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
import {launchImageLibrary, launchCamera, MediaType, ImagePickerResponse} from 'react-native-image-picker';
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
import {sellerService} from '../../services/seller.service';
import {userService} from '../../services/user.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {validation} from '../../utils/validation';
import {formatters} from '../../utils/formatters';

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
  const [isEditing, setIsEditing] = useState(false);
  
  // Split full_name into first_name and last_name for validation
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    whatsapp_number: '',
    alternate_mobile: '',
    facebook: '',
    instagram: '',
    linkedin: '',
  });

  const [originalData, setOriginalData] = useState({...formData});
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      const fullName = user.full_name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: user.email || '',
        phone: user.phone || '',
        address: (user as any).address || '',
        whatsapp_number: (user as any).whatsapp_number || '',
        alternate_mobile: (user as any).alternate_mobile || '',
        facebook: (user as any).social_links?.facebook || '',
        instagram: (user as any).social_links?.instagram || '',
        linkedin: (user as any).social_links?.linkedin || '',
      });
      if (user.profile_image) {
        setProfileImage(fixImageUrl(user.profile_image));
      }
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response: any = await sellerService.getProfile();
      if (response && response.success && response.data) {
        const profile = response.data.profile || response.data;
        const userData = response.data.user || user;
        
        const fullName = profile.full_name || userData?.full_name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const socialLinks = profile.social_links || {};
        if (typeof socialLinks === 'string') {
          try {
            const parsed = JSON.parse(socialLinks);
            Object.assign(socialLinks, parsed);
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        const profileData = {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: userData?.email || user?.email || '',
          phone: userData?.phone || user?.phone || '',
          address: profile.address || '',
          whatsapp_number: profile.whatsapp_number || '',
          alternate_mobile: profile.alternate_mobile || '',
          facebook: socialLinks.facebook || '',
          instagram: socialLinks.instagram || '',
          linkedin: socialLinks.linkedin || '',
        };
        
        setFormData(profileData);
        setOriginalData(profileData);
        
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

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // First Name validation (required, 2-50 chars, letters only)
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (!validation.firstName(formData.first_name)) {
      newErrors.first_name = 'First name must be 2-50 letters only';
    }
    
    // Last Name validation (required, 2-50 chars, letters only)
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (!validation.lastName(formData.last_name)) {
      newErrors.last_name = 'Last name must be 2-50 letters only';
    }
    
    // WhatsApp Number validation (optional, Indian phone validation)
    if (formData.whatsapp_number && !validation.indianPhone(formData.whatsapp_number)) {
      newErrors.whatsapp_number = 'Please enter a valid Indian phone number';
    }
    
    // Alternate Mobile validation (optional, Indian phone validation)
    if (formData.alternate_mobile && !validation.indianPhone(formData.alternate_mobile)) {
      newErrors.alternate_mobile = 'Please enter a valid Indian phone number';
    }
    
    // Address validation (optional, max 500 chars)
    if (formData.address && formData.address.length > 500) {
      newErrors.address = 'Address must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = () => {
    setOriginalData({...formData});
    setIsEditing(true);
    setErrors({});
  };

  const handleCancel = () => {
    setFormData({...originalData});
    setIsEditing(false);
    setErrors({});
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }
    
    try {
      setSaving(true);
      
      // Combine first_name and last_name into full_name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      
      const profileData: any = {
        full_name: fullName,
        address: formData.address || null,
        whatsapp_number: formData.whatsapp_number || null,
        alternate_mobile: formData.alternate_mobile || null,
        social_links: {
          facebook: formData.facebook || null,
          instagram: formData.instagram || null,
          linkedin: formData.linkedin || null,
        },
      };
      
      // Remove null values
      Object.keys(profileData).forEach(key => {
        if (profileData[key] === null) {
          delete profileData[key];
        }
      });
      
      const response: any = await sellerService.updateProfile(profileData);
      
      if (response && (response.success || (response.data && response.data.success))) {
        // Update user context
        if (user) {
          setUser({
            ...user,
            full_name: fullName,
            address: formData.address,
          });
        }
        setOriginalData({...formData, full_name: fullName});
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
        // Reload profile to get updated data
        await loadProfile();
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
    Alert.alert(
      'Select Profile Image',
      'Choose an option',
      [
        {text: 'Camera', onPress: () => handleImageSource('camera')},
        {text: 'Gallery', onPress: () => handleImageSource('gallery')},
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  const handleImageSource = (source: 'camera' | 'gallery') => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      maxWidth: 800,
      maxHeight: 800,
    };

    const callback = async (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorCode) {
        return;
      }

      if (response.assets && response.assets[0]) {
        try {
          setSaving(true);
          
          // Validate image type (JPEG, PNG, WebP)
          const imageType = response.assets[0].type || '';
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
          if (!allowedTypes.some(type => imageType.includes(type.split('/')[1]))) {
            Alert.alert('Error', 'Please select a JPEG, PNG, or WebP image');
            setSaving(false);
            return;
          }
          
          // Validate image size (max 5MB)
          const fileSize = response.assets[0].fileSize || 0;
          if (fileSize > 5 * 1024 * 1024) {
            Alert.alert('Error', 'Image size must be less than 5MB');
            setSaving(false);
            return;
          }
          
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
            await loadProfile(); // Reload to sync with backend
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
    };

    if (source === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
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

  const memberSince = (user as any)?.created_at 
    ? formatters.timeAgo((user as any).created_at)
    : 'Recently';

  const stats = {
    listedProperties: 0, // TODO: Fetch from dashboard stats
    inquiries: 0, // TODO: Fetch from dashboard stats
  };

  if (loading && !user) {
    return (
      <View style={styles.container}>
        <SellerHeader
          onProfilePress={() => {}}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onSubscriptionPress={() => navigation.navigate('Subscription' as never)}
          onLogoutPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => {}}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onLogoutPress={handleLogout}
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingTop: 0}}>
        {/* Profile Card Section */}
        <View style={styles.topSection}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{uri: profileImage}} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(formData.full_name || 'User')}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.editPhotoButton} 
              onPress={handleImagePicker} 
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.editPhotoText}>📷</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{formData.full_name || 'User'}</Text>
          <Text style={styles.email}>{formData.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleLabel(user?.user_type)}</Text>
          </View>
          {(user as any)?.email_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>{stats.listedProperties} Properties</Text>
            <Text style={styles.statText}>•</Text>
            <Text style={styles.statText}>{stats.inquiries} Inquiries</Text>
          </View>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>

        {/* Personal Information Form */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
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
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    !isEditing && styles.inputDisabled,
                    errors.first_name && styles.inputError,
                  ]}
                  value={formData.first_name}
                  onChangeText={text => {
                    setFormData({...formData, first_name: text});
                    if (errors.first_name) setErrors({...errors, first_name: ''});
                  }}
                  editable={isEditing}
                  placeholder="First name"
                />
                {errors.first_name && (
                  <Text style={styles.errorText}>{errors.first_name}</Text>
                )}
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    !isEditing && styles.inputDisabled,
                    errors.last_name && styles.inputError,
                  ]}
                  value={formData.last_name}
                  onChangeText={text => {
                    setFormData({...formData, last_name: text});
                    if (errors.last_name) setErrors({...errors, last_name: ''});
                  }}
                  editable={isEditing}
                  placeholder="Last name"
                />
                {errors.last_name && (
                  <Text style={styles.errorText}>{errors.last_name}</Text>
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.email}
                editable={false}
                keyboardType="email-address"
              />
              <Text style={styles.hintText}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.phone}
                editable={false}
                keyboardType="phone-pad"
              />
              <Text style={styles.hintText}>Phone number cannot be changed</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>WhatsApp Number</Text>
              <TextInput
                style={[
                  styles.input,
                  !isEditing && styles.inputDisabled,
                  errors.whatsapp_number && styles.inputError,
                ]}
                value={formData.whatsapp_number}
                onChangeText={text => {
                  setFormData({...formData, whatsapp_number: text});
                  if (errors.whatsapp_number) setErrors({...errors, whatsapp_number: ''});
                }}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
              />
              {errors.whatsapp_number && (
                <Text style={styles.errorText}>{errors.whatsapp_number}</Text>
              )}
              <Text style={styles.hintText}>Optional - Indian phone number</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Alternate Mobile</Text>
              <TextInput
                style={[
                  styles.input,
                  !isEditing && styles.inputDisabled,
                  errors.alternate_mobile && styles.inputError,
                ]}
                value={formData.alternate_mobile}
                onChangeText={text => {
                  setFormData({...formData, alternate_mobile: text});
                  if (errors.alternate_mobile) setErrors({...errors, alternate_mobile: ''});
                }}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
              />
              {errors.alternate_mobile && (
                <Text style={styles.errorText}>{errors.alternate_mobile}</Text>
              )}
              <Text style={styles.hintText}>Optional - Indian phone number</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  !isEditing && styles.inputDisabled,
                  errors.address && styles.inputError,
                ]}
                value={formData.address}
                onChangeText={text => {
                  setFormData({...formData, address: text});
                  if (errors.address) setErrors({...errors, address: ''});
                }}
                editable={isEditing}
                multiline
                numberOfLines={3}
                placeholder="Enter your address"
                textAlignVertical="top"
                maxLength={500}
              />
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
              <Text style={styles.hintText}>Optional - Max 500 characters</Text>
            </View>
          </View>
        </View>

        {/* Social Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media Links</Text>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.facebook}
                onChangeText={text => setFormData({...formData, facebook: text})}
                editable={isEditing}
                keyboardType="url"
                placeholder="https://facebook.com/..."
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.instagram}
                onChangeText={text => setFormData({...formData, instagram: text})}
                editable={isEditing}
                keyboardType="url"
                placeholder="https://instagram.com/..."
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>LinkedIn</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.linkedin}
                onChangeText={text => setFormData({...formData, linkedin: text})}
                editable={isEditing}
                keyboardType="url"
                placeholder="https://linkedin.com/..."
              />
            </View>
          </View>
        </View>

        {/* Menu Items Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MyProperties')}>
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

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Subscription' as never)}>
            <Text style={styles.menuIcon}>💳</Text>
            <Text style={styles.menuText}>Subscription</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  topSection: {
    backgroundColor: colors.surface,
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
    color: colors.text,
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
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
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
  verifiedBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  verifiedText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  memberSince: {
    ...typography.caption,
    color: colors.textSecondary,
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
    marginBottom: spacing.lg,
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  form: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  halfWidth: {
    flex: 1,
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
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: spacing.xs,
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
