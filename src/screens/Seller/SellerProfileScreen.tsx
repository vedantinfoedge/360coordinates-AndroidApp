import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { launchImageLibrary, launchCamera, MediaType, ImagePickerResponse } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon } from '../../components/navigation/TabIcons';
import { useAuth } from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import Button from '../../components/common/Button';
import { sellerService } from '../../services/seller.service';
import CustomAlert from '../../utils/alertHelper';
import { userService } from '../../services/user.service';
import { fixImageUrl } from '../../utils/imageHelper';
import { validation } from '../../utils/validation';
import { formatters } from '../../utils/formatters';

import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SellerTabParamList } from '../../components/navigation/SellerTabNavigator';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<SellerTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const SellerProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, setUser } = useAuth();
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
  });

  const [originalData, setOriginalData] = useState({ ...formData });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [stats, setStats] = useState({ listedProperties: 0, inquiries: 0 });

  // Scroll animation for header hide/show
  const scrollY = useRef(new Animated.Value(0)).current;

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Load dynamic stats (properties count + inquiries count) on mount and when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, []),
  );

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

        const profileData = {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: userData?.email || user?.email || '',
          phone: userData?.phone || user?.phone || '',
          address: profile.address || '',
          whatsapp_number: profile.whatsapp_number || '',
          alternate_mobile: profile.alternate_mobile || '',
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

  const loadStats = async () => {
    try {
      const [propertiesResponse, inquiriesResponse]: any[] = await Promise.all([
        sellerService.getProperties({ page: 1, limit: 100 }),
        sellerService.getInquiries({ page: 1, limit: 100 }),
      ]);
      let propertiesCount = 0;
      if (propertiesResponse) {
        if (Array.isArray(propertiesResponse)) {
          propertiesCount = propertiesResponse.length;
        } else if (propertiesResponse.success && propertiesResponse.data) {
          const data = propertiesResponse.data;
          const arr = data.properties ?? (Array.isArray(data) ? data : null);
          if (Array.isArray(arr)) propertiesCount = arr.length;
          else if (typeof data === 'object' && !Array.isArray(data)) {
            for (const key of Object.keys(data)) {
              if (Array.isArray(data[key])) {
                propertiesCount = data[key].length;
                break;
              }
            }
          }
        } else if (propertiesResponse.data && Array.isArray(propertiesResponse.data)) {
          propertiesCount = propertiesResponse.data.length;
        }
      }
      let inquiriesCount = 0;
      if (inquiriesResponse && inquiriesResponse.success) {
        const inquiriesData = inquiriesResponse.data?.inquiries ?? inquiriesResponse.data;
        inquiriesCount = Array.isArray(inquiriesData) ? inquiriesData.length : 0;
      }
      setStats({ listedProperties: propertiesCount, inquiries: inquiriesCount });
    } catch (error: any) {
      if (__DEV__) console.error('Error loading profile stats:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

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

    // Full name validation (2-50 chars total, letters and spaces only)
    const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
    if (fullName.length < 2 || fullName.length > 50) {
      if (!newErrors.first_name && !newErrors.last_name) {
        newErrors.first_name = 'Full name must be between 2 and 50 characters';
      }
    } else if (!/^[a-zA-Z\s]{2,50}$/.test(fullName)) {
      if (!newErrors.first_name && !newErrors.last_name) {
        newErrors.first_name = 'Full name must contain only letters and spaces';
      }
    }

    // WhatsApp Number validation (optional, 10-15 digits as per backend spec)
    if (formData.whatsapp_number && formData.whatsapp_number.trim()) {
      const digits = formData.whatsapp_number.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        newErrors.whatsapp_number = 'WhatsApp number must be 10-15 digits';
      } else if (!validation.indianPhone(formData.whatsapp_number)) {
        newErrors.whatsapp_number = 'Please enter a valid Indian phone number';
      }
    }

    // Alternate Mobile validation (optional, 10-15 digits as per backend spec)
    if (formData.alternate_mobile && formData.alternate_mobile.trim()) {
      const digits = formData.alternate_mobile.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        newErrors.alternate_mobile = 'Alternate mobile must be 10-15 digits';
      } else if (!validation.indianPhone(formData.alternate_mobile)) {
        newErrors.alternate_mobile = 'Please enter a valid Indian phone number';
      }
    }

    // Address validation (optional, max 500 chars)
    if (formData.address && formData.address.length > 500) {
      newErrors.address = 'Address must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = () => {
    setOriginalData({ ...formData });
    setIsEditing(true);
    setErrors({});
  };

  const handleCancel = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
    setErrors({});
  };

  const handleSave = async () => {
    if (!validateForm()) {
      CustomAlert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);

      // Combine first_name and last_name into full_name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      // Normalize phone numbers - extract digits only (10-15 digits as per backend spec)
      const normalizePhone = (phone: string): string | null => {
        if (!phone || !phone.trim()) return null;
        // Extract digits only
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) {
          return null; // Invalid, but validation already caught this
        }
        return digits; // Store as digits only
      };

      const profileData: any = {
        full_name: fullName,
        address: formData.address?.trim() || null,
        whatsapp_number: normalizePhone(formData.whatsapp_number),
        alternate_mobile: normalizePhone(formData.alternate_mobile),
      };

      // Remove null values from top level
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
        setOriginalData({ ...formData, full_name: fullName });
        setIsEditing(false);
        CustomAlert.alert('Success', 'Profile updated successfully');
        // Reload profile to get updated data
        await loadProfile();
      } else {
        CustomAlert.alert('Error', (response && (response.message || response.data?.message)) || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      CustomAlert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleImagePicker = () => {
    CustomAlert.alert(
      'Select Profile Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => handleImageSource('camera') },
        { text: 'Gallery', onPress: () => handleImageSource('gallery') },
        { text: 'Cancel', style: 'cancel' },
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
            CustomAlert.alert('Error', 'Please select a JPEG, PNG, or WebP image');
            setSaving(false);
            return;
          }

          // Validate image size (max 5MB)
          const fileSize = response.assets[0].fileSize || 0;
          if (fileSize > 5 * 1024 * 1024) {
            CustomAlert.alert('Error', 'Image size must be less than 5MB');
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
            CustomAlert.alert('Success', 'Profile picture updated successfully');
            await loadProfile(); // Reload to sync with backend
          } else {
            CustomAlert.alert('Error', (uploadResponse && uploadResponse.message) || 'Failed to upload image');
          }
        } catch (error: any) {
          console.error('Error uploading image:', error);
          CustomAlert.alert('Error', error?.message || 'Failed to upload image');
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

  if (loading && !user) {
    return (
      <View style={styles.container}>
        <SellerHeader
          onProfilePress={() => { }}
          onSupportPress={() => navigation.navigate('Support')}
          onSubscriptionPress={() => navigation.navigate('Subscription')}
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
        onProfilePress={() => { }}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onSubscriptionPress={() => navigation.navigate('Subscription' as never)}
        onLogoutPress={handleLogout}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 30 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}>
        {/* Profile Card Section */}
        <View style={styles.topSection}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
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
                <TabIcon name="camera" color={colors.surface} size={24} />
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
              <TabIcon name="check" color={colors.success} size={14} />
              <Text style={styles.verifiedText}> Verified</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.listedProperties}</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.inquiries}</Text>
              <Text style={styles.statLabel}>Inquiries</Text>
            </View>
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
                  onChangeText={(text: string) => {
                    setFormData({ ...formData, first_name: text });
                    if (errors.first_name) setErrors({ ...errors, first_name: '' });
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
                  onChangeText={(text: string) => {
                    setFormData({ ...formData, last_name: text });
                    if (errors.last_name) setErrors({ ...errors, last_name: '' });
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
                onChangeText={(text: string) => {
                  setFormData({ ...formData, whatsapp_number: text });
                  if (errors.whatsapp_number) setErrors({ ...errors, whatsapp_number: '' });
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
                onChangeText={(text: string) => {
                  setFormData({ ...formData, alternate_mobile: text });
                  if (errors.alternate_mobile) setErrors({ ...errors, alternate_mobile: '' });
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
                onChangeText={(text: string) => {
                  setFormData({ ...formData, address: text });
                  if (errors.address) setErrors({ ...errors, address: '' });
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

        {/* Menu Items Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AllListings')}
            activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#E0F2FE' }]}>
              <TabIcon name="building" color="#0284C7" size={20} />
            </View>
            <Text style={styles.menuText}>My Properties</Text>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Leads')}
            activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#E0F2FE' }]}>
              <TabIcon name="leads" color="#0284C7" size={20} />
            </View>
            <Text style={styles.menuText}>Leads</Text>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Support')}
            activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#DCFCE7' }]}>
              <TabIcon name="support" color="#16A34A" size={20} />
            </View>
            <Text style={styles.menuText}>Support</Text>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <TabIcon name="subscription" color="#D97706" size={20} />
            </View>
            <Text style={styles.menuText}>Subscription</Text>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <TabIcon name="logout" color="#DC2626" size={20} />
            </View>
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Clean off-white
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
    color: '#6B7280',
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E3F6FF', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: 32,
    color: colors.primary,
    fontWeight: '700',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  editPhotoText: {
    fontSize: 14,
  },
  name: {
    fontSize: 22,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: '#6B7280',
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  roleBadge: {
    backgroundColor: '#E3F6FF', // Light blue
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    marginBottom: spacing.sm,
  },
  roleText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5', // Light green tint
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  verifiedText: {
    ...typography.caption,
    color: '#059669', // Green text
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: '#FAFAFA',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    gap: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: 3,
  },
  statLabel: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  memberSince: {
    ...typography.caption,
    color: '#9CA3AF',
    fontSize: 12,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  editButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  cancelButtonText: {
    ...typography.body,
    color: '#6B7280',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  form: {
    marginTop: spacing.sm,
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
    color: '#374151',
    fontWeight: '600',
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    ...typography.body,
    color: colors.text,
    minHeight: 48,
    fontSize: 15,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    ...typography.caption,
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: spacing.xs,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  menuSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    borderRadius: 16,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    ...typography.body,
    color: '#374151',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  menuArrow: {
    ...typography.body,
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: spacing.xxl + spacing.sm,
  },
});

export default SellerProfileScreen;
