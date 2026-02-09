import React, {useState, useEffect, useRef} from 'react';
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
import {launchImageLibrary, launchCamera, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {AgentStackParamList} from '../../navigation/AgentNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import {userService} from '../../services/user.service';
import {sellerService} from '../../services/seller.service';
import {fixImageUrl} from '../../utils/imageHelper';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AgentStackParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const AgentProfileScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout, setUser} = useAuth();
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

  const [originalData, setOriginalData] = useState({...formData});

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
      
      // Normalize phone numbers: extract digits only, validate 10-15 digits
      const whatsappNumber = formData.whatsapp_number?.trim() || '';
      const normalizedWhatsApp = formatters.normalizePhoneNumber(whatsappNumber);
      if (whatsappNumber && !formatters.validatePhoneNumber(whatsappNumber)) {
        CustomAlert.alert('Validation Error', 'WhatsApp number must be 10-15 digits');
        setSaving(false);
        return;
      }
      
      const alternateMobile = formData.alternate_mobile?.trim() || '';
      const normalizedAlternate = formatters.normalizePhoneNumber(alternateMobile);
      if (alternateMobile && !formatters.validatePhoneNumber(alternateMobile)) {
        CustomAlert.alert('Validation Error', 'Alternate mobile number must be 10-15 digits');
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
        setOriginalData({...formData});
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
      quality: 0.8,
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

  if (loading) {
    return (
      <View style={styles.container}>
        <AgentHeader
          onProfilePress={() => {}}
          onSupportPress={() => navigation.getParent()?.navigate('Support' as never)}
          onLogoutPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
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
                <Text style={styles.imagePickerOptionIcon}>📷</Text>
                <Text style={styles.imagePickerOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={() => handleImagePicker('gallery')}
                activeOpacity={0.7}>
                <Text style={styles.imagePickerOptionIcon}>🖼️</Text>
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
        onProfilePress={() => {}}
        onSupportPress={() => navigation.getParent()?.navigate('Support' as never)}
        onLogoutPress={handleLogout}
        scrollY={scrollY}
      />

      <Animated.ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true}
        )}
        scrollEventThrottle={16}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{uri: profileImage}} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(formData.full_name || 'Agent')}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editPhotoButton} onPress={showImagePicker}>
              <Text style={styles.editPhotoText}>📷</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{formData.full_name || 'Agent'}</Text>
          <Text style={styles.profileRole}>Agent</Text>
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
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveButton}
                  disabled={saving}>
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
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={text => setFormData({...formData, full_name: text})}
                  placeholder="Enter your full name"
                />
              ) : (
                <Text style={styles.value}>{formData.full_name || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Login)</Text>
              <TextInput
                style={[styles.input, styles.inputLocked]}
                value={formData.email}
                editable={false}
                keyboardType="email-address"
              />
              <Text style={styles.lockedText}>This is your login email and cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number (Login)</Text>
              <TextInput
                style={[styles.input, styles.inputLocked]}
                value={formData.phone}
                editable={false}
                keyboardType="phone-pad"
              />
              <Text style={styles.lockedText}>This is your login mobile number and cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>WhatsApp Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.whatsapp_number}
                  onChangeText={text => setFormData({...formData, whatsapp_number: text})}
                  placeholder="Enter WhatsApp number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>{formData.whatsapp_number || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alternate Mobile</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.alternate_mobile}
                  onChangeText={text => setFormData({...formData, alternate_mobile: text})}
                  placeholder="Enter alternate mobile number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>{formData.alternate_mobile || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={text => setFormData({...formData, address: text})}
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
              <Text style={styles.subsectionTitle}>Business Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.company_name}
                  onChangeText={text => setFormData({...formData, company_name: text})}
                  placeholder="Enter company name"
                />
              ) : (
                <Text style={styles.value}>{formData.company_name || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>RERA id *</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.license_number}
                  onChangeText={text => setFormData({...formData, license_number: text})}
                  placeholder="Enter RERA id"
                />
              ) : (
                <Text style={styles.value}>{formData.license_number || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GST Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.gst_number}
                  onChangeText={text => setFormData({...formData, gst_number: text})}
                  placeholder="Enter GST number"
                />
              ) : (
                <Text style={styles.value}>{formData.gst_number || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.website}
                  onChangeText={text => setFormData({...formData, website: text})}
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

        {/* Menu Items Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.getParent()?.navigate('Inquiries' as never)}>
            <Text style={styles.menuIcon}>💬</Text>
            <Text style={styles.menuText}>My Inquiries</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.getParent()?.navigate('Support' as never)}>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.xl,
    marginTop: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.accent,
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
  imagePickerOptionIcon: {
    fontSize: 32,
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
  profileName: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  profileRole: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
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
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  form: {
    marginTop: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
  },
  inputLocked: {
    backgroundColor: colors.surfaceSecondary,
    opacity: 0.5,
  },
  lockedText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  value: {
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  subsectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subsectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  menuSection: {
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
