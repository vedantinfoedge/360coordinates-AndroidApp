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
  Modal,
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
import LoadingScreen from '../../components/common/LoadingScreen';
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
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

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
    setShowImagePickerModal(true);
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

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (!user) {
    return <LoadingScreen message="Loading profile..." />;
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
        contentContainerStyle={{ paddingTop: spacing.md }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}>
        {/* Profile Section - Same UI as Buyer */}
        <View style={styles.profileSection}>
          <View style={styles.profileGradient}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={handleImagePicker}
                disabled={saving}
                activeOpacity={0.8}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(formData.full_name || 'User')}
                    </Text>
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <TabIcon name="camera" color={colors.text} size={24} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{formData.full_name || 'User'}</Text>
            <Text style={styles.userEmail}>{formData.email}</Text>
            <View style={styles.creditsBadge}>
              <TabIcon name="building" color={colors.textSecondary} size={16} />
              <Text style={styles.creditsBadgeText}>
                Properties: {stats.listedProperties} · Inquiries: {stats.inquiries}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleImagePicker}
              disabled={saving}
              activeOpacity={0.8}>
              <TabIcon name="camera" color={colors.textSecondary} size={18} />
              <Text style={styles.uploadButtonText}>
                {profileImage ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              activeOpacity={0.8}>
              <TabIcon name="edit" color="#FFC107" size={18} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cancel/Save when editing */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={styles.saveButton}
                disabled={saving}
                activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <View style={styles.saveButtonContent}>
                    <TabIcon name="check" color={colors.surface} size={18} />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Personal Information Form */}
        <View style={styles.formSection}>
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <View style={styles.labelContainer}>
                  <TabIcon name="profile" color={colors.primary} size={18} />
                  <Text style={styles.label}>FIRST NAME *</Text>
                </View>
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
                <View style={styles.labelContainer}>
                  <TabIcon name="profile" color={colors.primary} size={18} />
                  <Text style={styles.label}>LAST NAME *</Text>
                </View>
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
              <View style={styles.labelContainer}>
                <TabIcon name="mail" color={colors.primary} size={18} />
                <Text style={styles.label}>EMAIL</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.email}
                editable={false}
                keyboardType="email-address"
              />
              <View style={styles.lockedLabelRow}>
                <TabIcon name="support" color={colors.textSecondary} size={12} />
                <Text style={styles.hintText}>Email cannot be changed</Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <TabIcon name="phone" color={colors.primary} size={18} />
                <Text style={styles.label}>PHONE NUMBER</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.phone}
                editable={false}
                keyboardType="phone-pad"
              />
              <View style={styles.lockedLabelRow}>
                <TabIcon name="support" color={colors.textSecondary} size={12} />
                <Text style={styles.hintText}>Phone number cannot be changed</Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <TabIcon name="phone" color={colors.primary} size={18} />
                <Text style={styles.label}>WHATSAPP NUMBER</Text>
              </View>
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
              <View style={styles.labelContainer}>
                <TabIcon name="phone" color={colors.primary} size={18} />
                <Text style={styles.label}>ALTERNATE MOBILE</Text>
              </View>
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
              <View style={styles.labelContainer}>
                <TabIcon name="location" color={colors.primary} size={18} />
                <Text style={styles.label}>ADDRESS</Text>
              </View>
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

        {/* Menu Items Section - Same style as Buyer */}
        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('AllListings')}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <TabIcon name="building" color={colors.primary} size={20} />
              </View>
              <Text style={styles.optionText}>My Properties</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('Leads')}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <TabIcon name="leads" color={colors.primary} size={20} />
              </View>
              <Text style={styles.optionText}>Leads</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('Support')}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <TabIcon name="support" color={colors.primary} size={20} />
              </View>
              <Text style={styles.optionText}>Support</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <TabIcon name="subscription" color={colors.primary} size={20} />
              </View>
              <Text style={styles.optionText}>Subscription</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.optionItem}
            onPress={handleLogout}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, styles.logoutIconContainer]}>
                <TabIcon name="logout" color="#DC2626" size={20} />
              </View>
              <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}>
        <TouchableOpacity
          style={styles.imagePickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePickerModal(false)}>
          <View style={styles.imagePickerModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.imagePickerModalTitle}>Select Profile Image</Text>
            <Text style={styles.imagePickerModalSubtitle}>Choose an option</Text>
            <View style={styles.imagePickerModalButtons}>
              <TouchableOpacity
                style={styles.imagePickerOptionButton}
                onPress={() => {
                  setShowImagePickerModal(false);
                  setTimeout(() => handleImageSource('camera'), 300);
                }}
                activeOpacity={0.7}>
                <TabIcon name="camera" color={colors.primary} size={32} />
                <Text style={styles.imagePickerOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imagePickerOptionButton}
                onPress={() => {
                  setShowImagePickerModal(false);
                  setTimeout(() => handleImageSource('gallery'), 300);
                }}
                activeOpacity={0.7}>
                <TabIcon name="image" color={colors.primary} size={32} />
                <Text style={styles.imagePickerOptionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.imagePickerCancelButton}
              onPress={() => setShowImagePickerModal(false)}>
              <Text style={styles.imagePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  profileSection: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  profileGradient: {
    alignItems: 'center',
    paddingVertical: spacing.xl + spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary + '30',
  },
  avatarContainer: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.border,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  avatarText: {
    ...typography.h2,
    color: colors.surface,
    fontSize: 36,
    fontWeight: '700',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 26,
    color: colors.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '700',
    lineHeight: 32,
  },
  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.round,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  creditsBadgeText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'stretch',
  },
  uploadButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 15,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: 'stretch',
  },
  editButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  actionButtons: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
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
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
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
  optionsSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutText: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  logoutIconContainer: {
    backgroundColor: colors.error + '15',
  },
  imagePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  imagePickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    minWidth: 280,
  },
  imagePickerModalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  imagePickerModalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  imagePickerModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  imagePickerOptionButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  imagePickerOptionText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
    marginTop: spacing.sm,
  },
  imagePickerCancelButton: {
    width: '100%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  imagePickerCancelText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default SellerProfileScreen;
