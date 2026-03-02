import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AgentTabParamList } from '../../components/navigation/AgentTabNavigator';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { moderateScale } from '../../utils/responsive';
import { TabIcon } from '../../components/navigation/TabIcons';
import { useAuth } from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import { userService } from '../../services/user.service';
import { sellerService } from '../../services/seller.service';
import { fixImageUrl } from '../../utils/imageHelper';
import { formatters } from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';
import LoadingScreen from '../../components/common/LoadingScreen';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AgentTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const AgentProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profile_image || null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    whatsapp_number: '',
    alternate_mobile: '',
    company_name: '',
    license_number: '',
    gst_number: '',
    website: '',
  });

  const [originalData, setOriginalData] = useState({ ...formData });

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        whatsapp_number: (user as any).whatsapp_number || '',
        alternate_mobile: (user as any).alternate_mobile || '',
        company_name: (user as any).company_name || '',
        license_number: (user as any).license_number || '',
        gst_number: (user as any).gst_number || '',
        website: (user as any).website || '',
      });
      setOriginalData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        whatsapp_number: (user as any).whatsapp_number || '',
        alternate_mobile: (user as any).alternate_mobile || '',
        company_name: (user as any).company_name || '',
        license_number: (user as any).license_number || '',
        gst_number: (user as any).gst_number || '',
        website: (user as any).website || '',
      });
      if (user.profile_image) {
        setProfileImage(fixImageUrl(user.profile_image));
      }
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Agent uses agent endpoint
      const response: any = await userService.getProfile('agent');
      if (response && response.success && response.data) {
        const profile = response.data.profile || response.data;
        const userData = response.data.user || user;

        setFormData({
          full_name: profile.full_name || userData?.full_name || '',
          email: userData?.email || user?.email || '',
          phone: userData?.phone || user?.phone || '',
          address: profile.address || '',
          whatsapp_number: profile.whatsapp_number || '',
          alternate_mobile: profile.alternate_mobile || '',
          company_name: profile.company_name || '',
          license_number: profile.license_number || '',
          gst_number: profile.gst_number || '',
          website: profile.website || '',
        });
        setOriginalData({
          full_name: profile.full_name || userData?.full_name || '',
          email: userData?.email || user?.email || '',
          phone: userData?.phone || user?.phone || '',
          address: profile.address || '',
          whatsapp_number: profile.whatsapp_number || '',
          alternate_mobile: profile.alternate_mobile || '',
          company_name: profile.company_name || '',
          license_number: profile.license_number || '',
          gst_number: profile.gst_number || '',
          website: profile.website || '',
        });
        if (profile.profile_image) {
          setProfileImage(fixImageUrl(profile.profile_image));
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setOriginalData({ ...formData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validation: full_name (2-50 chars, letters/spaces only)
      const fullName = formData.full_name?.trim() || '';
      if (fullName && (fullName.length < 2 || fullName.length > 50)) {
        CustomAlert.alert('Validation Error', 'Full name must be between 2 and 50 characters');
        setSaving(false);
        return;
      }
      if (fullName && !/^[a-zA-Z\s]+$/.test(fullName)) {
        CustomAlert.alert('Validation Error', 'Full name can only contain letters and spaces');
        setSaving(false);
        return;
      }

      // Validation: company_name (2-100 chars, optional for agents)
      const companyName = formData.company_name?.trim() || '';
      if (companyName && (companyName.length < 2 || companyName.length > 100)) {
        CustomAlert.alert('Validation Error', 'Company name must be between 2 and 100 characters');
        setSaving(false);
        return;
      }

      // Validation: address (max 500 chars)
      const address = formData.address?.trim() || '';
      if (address && address.length > 500) {
        CustomAlert.alert('Validation Error', 'Address cannot exceed 500 characters');
        setSaving(false);
        return;
      }

      // Validation: website URL format
      const website = formData.website?.trim() || '';
      if (website && !formatters.validateWebsiteUrl(website)) {
        CustomAlert.alert('Validation Error', 'Please enter a valid website URL (e.g., example.com or https://example.com)');
        setSaving(false);
        return;
      }

      // Normalize phone numbers: extract digits only, validate exactly 10 digits
      const whatsappNumber = formData.whatsapp_number?.trim() || '';
      const normalizedWhatsApp = formatters.normalizePhoneNumber(whatsappNumber);
      if (whatsappNumber && whatsappNumber.replace(/\D/g, '').length !== 10) {
        CustomAlert.alert('Validation Error', 'WhatsApp number must be exactly 10 digits');
        setSaving(false);
        return;
      }

      const alternateMobile = formData.alternate_mobile?.trim() || '';
      const normalizedAlternate = formatters.normalizePhoneNumber(alternateMobile);
      if (alternateMobile && alternateMobile.replace(/\D/g, '').length !== 10) {
        CustomAlert.alert('Validation Error', 'Alternate mobile number must be exactly 10 digits');
        setSaving(false);
        return;
      }

      // Build payload to match website seller profile update API
      // Method: PUT /seller/profile/update.php
      // Fields: full_name, address, company_name, license_number, website, gst_number (optional)
      // Notes: 
      // - Email and phone are not sent (cannot be changed)
      // - Empty strings are sent to clear optional fields
      // - Phone numbers are normalized (digits only)
      const updateData = {
        full_name: fullName,
        address: address,
        company_name: companyName,
        license_number: formData.license_number?.trim() || '',
        website: website,
        gst_number: formData.gst_number?.trim() || '',
        // Extra optional fields supported by backend for mobile/app:
        // Phone numbers stored as digits only (no formatting)
        whatsapp_number: normalizedWhatsApp || '',
        alternate_mobile: normalizedAlternate || '',
      };

      const response: any = await sellerService.updateProfile(updateData);

      if (response && response.success) {
        CustomAlert.alert('Success', 'Profile updated successfully');
        setOriginalData({ ...formData });
        setIsEditing(false);
        // Reload profile to get updated data
        await loadProfile();
      } else {
        CustomAlert.alert('Error', (response && response.message) || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      CustomAlert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const showImagePicker = () => {
    setShowImagePickerModal(true);
  };

  const handleImagePicker = (source: 'camera' | 'gallery') => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      maxWidth: 800,
      maxHeight: 800,
    };

    const callback = async (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorCode) {
        if (response.errorMessage) {
          CustomAlert.alert('Error', response.errorMessage);
        }
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
            CustomAlert.alert('Success', 'Profile picture updated successfully');
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

    setShowImagePickerModal(false);
    if (source === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const memberSinceText = (() => {
    const raw = (user as any)?.created_at || (user as any)?.createdAt || null;
    if (!raw) return null;
    const parsed =
      typeof raw === 'string'
        ? (formatters.parseMySQLDateTime(raw) || new Date(raw))
        : raw instanceof Date
          ? raw
          : null;
    if (!parsed || isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  })();

  if (loading) {
    return <LoadingScreen variant="profile" />;
  }

  return (
    <View style={styles.container}>
      {/* Image Picker Modal with styled options */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade">
        <Pressable style={styles.imagePickerOverlay} onPress={() => setShowImagePickerModal(false)}>
          <View style={styles.imagePickerContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.imagePickerTitle}>Select Profile Image</Text>
            <View style={styles.imagePickerButtons}>
              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={() => handleImagePicker('camera')}
                activeOpacity={0.7}>
                <View style={styles.imagePickerIconContainer}>
                  <TabIcon name="camera" color={colors.primary} size={32} />
                </View>
                <Text style={styles.imagePickerOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={() => handleImagePicker('gallery')}
                activeOpacity={0.7}>
                <View style={styles.imagePickerIconContainer}>
                  <TabIcon name="image" color={colors.primary} size={32} />
                </View>
                <Text style={styles.imagePickerOptionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.imagePickerCancel}
              onPress={() => setShowImagePickerModal(false)}
              activeOpacity={0.7}>
              <Text style={styles.imagePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <AgentHeader
        onProfilePress={() => { }}
        onSupportPress={() => navigation.getParent()?.navigate('Support' as never)}
        onSubscriptionPress={() => navigation.getParent()?.navigate('Subscription' as never)}
        onLogoutPress={handleLogout}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
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
                onPress={showImagePicker}
                disabled={saving}
                activeOpacity={0.8}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(formData.full_name || 'Agent')}</Text>
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
            <Text style={styles.userName}>{formData.full_name || 'Agent'}</Text>
            <Text style={styles.userEmail}>{formData.email}</Text>
            <View style={styles.creditsBadge}>
              <TabIcon name="building" color={colors.textSecondary} size={16} />
              <Text style={styles.creditsBadgeText}>Agent</Text>
            </View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showImagePicker}
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

        {/* Profile Information Section */}
        <View style={styles.formSection}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="profile" color={colors.primary} size={18} />
                <Text style={styles.label}>FULL NAME *</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={(text: string) => setFormData({ ...formData, full_name: text })}
                  placeholder="Enter your full name"
                />
              ) : (
                <Text style={styles.value}>{formData.full_name || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="mail" color={colors.primary} size={18} />
                <Text style={styles.label}>EMAIL (LOGIN)</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputLocked]}
                value={formData.email}
                editable={false}
                keyboardType="email-address"
              />
              <View style={styles.lockedLabelRow}>
                <TabIcon name="support" color={colors.textSecondary} size={12} />
                <Text style={styles.lockedText}>This is your login email and cannot be changed</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="phone" color={colors.primary} size={18} />
                <Text style={styles.label}>PHONE NUMBER (LOGIN)</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputLocked]}
                value={formData.phone}
                editable={false}
                keyboardType="phone-pad"
              />
              <View style={styles.lockedLabelRow}>
                <TabIcon name="support" color={colors.textSecondary} size={12} />
                <Text style={styles.lockedText}>This is your login mobile number and cannot be changed</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="phone" color={colors.primary} size={18} />
                <Text style={styles.label}>WHATSAPP NUMBER</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.whatsapp_number}
                  onChangeText={(text: string) => {
                    const cleaned = text.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, whatsapp_number: cleaned });
                  }}
                  placeholder="Enter 10-digit WhatsApp number"
                  keyboardType="numeric"
                  maxLength={10}
                />
              ) : (
                <Text style={styles.value}>{formData.whatsapp_number || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="phone" color={colors.primary} size={18} />
                <Text style={styles.label}>ALTERNATE MOBILE</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.alternate_mobile}
                  onChangeText={(text: string) => {
                    const cleaned = text.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, alternate_mobile: cleaned });
                  }}
                  placeholder="Enter 10-digit alternate number"
                  keyboardType="numeric"
                  maxLength={10}
                />
              ) : (
                <Text style={styles.value}>{formData.alternate_mobile || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="location" color={colors.primary} size={18} />
                <Text style={styles.label}>ADDRESS</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text: string) => setFormData({ ...formData, address: text })}
                  placeholder="Enter your address"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.value}>{formData.address || 'Not set'}</Text>
              )}
            </View>

            {/* Business Details Section */}
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>BUSINESS DETAILS</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="building" color={colors.primary} size={18} />
                <Text style={styles.label}>COMPANY NAME</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.company_name}
                  onChangeText={(text: string) => setFormData({ ...formData, company_name: text })}
                  placeholder="Enter company name"
                />
              ) : (
                <Text style={styles.value}>{formData.company_name || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="file-text" color={colors.primary} size={18} />
                <Text style={styles.label}>RERA ID *</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.license_number}
                  onChangeText={(text: string) => setFormData({ ...formData, license_number: text })}
                  placeholder="Enter RERA id"
                />
              ) : (
                <Text style={styles.value}>{formData.license_number || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="file-text" color={colors.primary} size={18} />
                <Text style={styles.label}>GST NUMBER</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.gst_number}
                  onChangeText={(text: string) => setFormData({ ...formData, gst_number: text })}
                  placeholder="Enter GST number"
                />
              ) : (
                <Text style={styles.value}>{formData.gst_number || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <TabIcon name="link" color={colors.primary} size={18} />
                <Text style={styles.label}>WEBSITE</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.website}
                  onChangeText={(text: string) => setFormData({ ...formData, website: text })}
                  placeholder="Enter website URL"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.value}>{formData.website || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Menu Items Section - Same style as Buyer */}
        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => (navigation as any).navigate('Chat', { screen: 'ChatList' })}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <TabIcon name="inquiries" color={colors.primary} size={20} />
              </View>
              <Text style={styles.optionText}>My Inquiries</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.getParent()?.navigate('Subscription' as never)}
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
            onPress={() => navigation.getParent()?.navigate('Support' as never)}
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
          <TouchableOpacity style={styles.optionItem} onPress={handleLogout} activeOpacity={0.7}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
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
  imagePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  imagePickerContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
  },
  imagePickerTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  imagePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  imagePickerOption: {
    flex: 1,
    backgroundColor: colors.accentSoft,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  imagePickerIconContainer: {
    marginBottom: spacing.sm,
  },
  imagePickerOptionText: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  imagePickerCancel: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  imagePickerCancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  formSection: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
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
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputLocked: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.textSecondary,
    borderColor: 'transparent',
  },
  lockedText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 10,
    fontStyle: 'italic',
  },
  value: {
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.xs,
    minHeight: 24,
  },
  textArea: {
    minHeight: 80,
  },
  subsectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  subsectionTitle: {
    ...typography.bodySemibold,
    color: colors.text,
    fontSize: moderateScale(15),
  },
  optionsSection: {
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
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
});

export default AgentProfileScreen;
