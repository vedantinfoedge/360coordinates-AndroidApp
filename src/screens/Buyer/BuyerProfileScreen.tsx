import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {launchImageLibrary, launchCamera, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerStackParamList} from '../../navigation/BuyerNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {fonts} from '../../theme/fonts';
import {TabIcon} from '../../components/navigation/TabIcons';
import {useAuth} from '../../context/AuthContext';
import BuyerHeader from '../../components/BuyerHeader';
import CustomAlert from '../../utils/alertHelper';

const TOTAL_INTERACTION_LIMIT = 5;
const INTERACTION_STORAGE_KEY = 'interaction_remaining';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<BuyerStackParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const BuyerProfileScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout, isAuthenticated} = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const scrollY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const userData = user || {
    full_name: 'User',
    email: '',
    phone: '',
    address: '',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profile_image || null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [formData, setFormData] = useState({
    name: userData.full_name || '',
    phone: userData.phone || '',
    email: userData.email || '',
    address: userData.address || '',
    alternateMobile: '',
  });

  const [originalData, setOriginalData] = useState({
    name: userData.full_name || '',
    phone: userData.phone || '',
    email: userData.email || '',
    address: userData.address || '',
  });

  const [creditsState, setCreditsState] = useState({
    remaining: TOTAL_INTERACTION_LIMIT,
    max: TOTAL_INTERACTION_LIMIT,
  });

  useEffect(() => {
    const loadCredits = async () => {
      try {
        const stored = await AsyncStorage.getItem(INTERACTION_STORAGE_KEY);
        let remaining = TOTAL_INTERACTION_LIMIT;
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            remaining = Math.min(parsed, TOTAL_INTERACTION_LIMIT);
          }
        }
        setCreditsState({remaining, max: TOTAL_INTERACTION_LIMIT});
      } catch {
        setCreditsState({remaining: TOTAL_INTERACTION_LIMIT, max: TOTAL_INTERACTION_LIMIT});
      }
    };
    loadCredits();
  }, []);

  // Update profile image when user changes
  React.useEffect(() => {
    if (user?.profile_image) {
      setProfileImage(user.profile_image);
    }
  }, [user?.profile_image]);

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
      // Only save name and address (email and phone are locked)
      const {buyerService} = require('../../services/buyer.service');
      const updateResponse = await buyerService.updateProfile({
        full_name: formData.name,
        address: formData.address,
      });

      if (updateResponse && updateResponse.success) {
        CustomAlert.alert('Success', 'Profile updated successfully');
        setOriginalData({...formData});
        setIsEditing(false);
      } else {
        CustomAlert.alert('Error', updateResponse?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      CustomAlert.alert('Error', error?.message || 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    await logout();
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
      if (response.didCancel) {
        return;
      }
      if (response.errorMessage) {
        CustomAlert.alert('Error', response.errorMessage);
        return;
      }
      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          setProfileImage(imageUri);
          // Upload image to backend
          try {
            const {userService} = require('../../services/user.service');
            // Use new endpoint that syncs with website
            const uploadResponse = await userService.uploadProfileImage(imageUri);
            if (uploadResponse.success) {
              CustomAlert.alert('Success', 'Profile picture updated successfully');
              // Update local state with new image URL
              if (uploadResponse.data?.url) {
                const {fixImageUrl} = require('../../utils/imageHelper');
                const imageUrl = fixImageUrl(uploadResponse.data.url);
                setProfileImage(imageUrl);
                
                // Reload user profile to get updated data from backend
                try {
                  const profileResponse = await userService.getProfile();
                  if (profileResponse && profileResponse.success && profileResponse.data) {
                    // Update local user state if needed
                    const updatedUser = profileResponse.data.user || profileResponse.data;
                    if (updatedUser.profile_image) {
                      setProfileImage(fixImageUrl(updatedUser.profile_image));
                    }
                  }
                } catch (profileError) {
                  console.warn('Could not reload profile:', profileError);
                  // Still use the uploaded URL
                }
              }
            } else {
              CustomAlert.alert('Error', uploadResponse.message || 'Failed to upload image');
            }
          } catch (error: any) {
            console.error('Error uploading profile image:', error);
            CustomAlert.alert('Error', error.message || 'Failed to upload image');
          }
        }
      }
    };

    if (source === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  // Show login prompt if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <BuyerHeader
          onProfilePress={() => {}}
          onSupportPress={() => {}}
          onLogoutPress={() => {}}
          onSignInPress={() => {
            (navigation as any).navigate('Auth', {
              screen: 'Login',
              params: {returnTo: 'Profile'},
            });
          }}
          onSignUpPress={() => {
            (navigation as any).navigate('Auth', {screen: 'Register'});
          }}
          showLogout={false}
          showProfile={false}
          showSignIn={true}
          showSignUp={true}
        />
        <Animated.View
          style={[
            styles.loginContainer,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
              paddingTop: insets.top + spacing.md,
            },
          ]}>
          <View style={styles.loginContent}>
            <View style={styles.loginIconContainer}>
              <TabIcon name="profile" color={colors.primary} size={48} />
            </View>
            <Text style={styles.loginTitle}>Login Required</Text>
            <Text style={styles.loginSubtitle}>
              Please login to view and manage your profile
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                (navigation as any).navigate('Auth', {
                  screen: 'Login',
                  params: {returnTo: 'Profile'},
                });
              }}
              activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>Login / Register</Text>
            </TouchableOpacity>
            <Text style={styles.loginNote}>
              Login to access your favorites, inquiries, and saved properties
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <BuyerHeader
        onProfilePress={() => {}}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onLogoutPress={handleLogout}
        showLogout={true}
        showProfile={true}
        showSignIn={false}
        showSignUp={false}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingTop: spacing.md}}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true},
        )}
        scrollEventThrottle={16}>
        {/* Profile Section - matches image layout */}
        <View style={styles.profileSection}>
          <View style={styles.profileGradient}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={showImagePicker}
                activeOpacity={0.8}>
                {profileImage ? (
                  <Image 
                    source={{uri: profileImage}} 
                    style={styles.avatarImage}
                    defaultSource={require('../../assets/logo.png')}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(userData.full_name || 'User')
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  <TabIcon name="camera" color={colors.text} size={20} />
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{userData.full_name || 'User'}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>

            {/* Credits Left pill */}
            <View style={styles.creditsPill}>
              <TabIcon name="tag" color={colors.textSecondary} size={16} />
              <Text style={styles.creditsPillText}>
                Credits Left: {creditsState.remaining}/{creditsState.max}
              </Text>
            </View>

            {/* Upload Photo button - light blue */}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showImagePicker}
              activeOpacity={0.8}>
              <TabIcon name="camera" color={colors.textSecondary} size={18} />
              <Text style={styles.uploadButtonText}>
                {profileImage ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>

            {/* Edit Profile / Cancel-Save buttons */}
            {!isEditing ? (
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={handleEdit}
                activeOpacity={0.8}>
                <TabIcon name="edit" color="#FFD54F" size={18} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.8}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={handleSave}
                  activeOpacity={0.8}>
                  <View style={styles.saveButtonContent}>
                    <TabIcon name="check" color={colors.surface} size={18} />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <TabIcon name="profile" color={colors.textSecondary} size={18} />
              <Text style={styles.label}>FULL NAME</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={text => setFormData({...formData, name: text})}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.value}>{formData.name}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <TabIcon name="mail" color={colors.textSecondary} size={18} />
              <Text style={styles.label}>EMAIL</Text>
            </View>
            {isEditing ? (
              <View style={styles.lockedInput}>
                <Text style={styles.lockedInputText}>{formData.email}</Text>
                <View style={styles.lockedLabelRow}>
                  <TabIcon name="support" color={colors.textSecondary} size={12} />
                  <Text style={styles.lockedLabel}> Locked</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.value}>{formData.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <TabIcon name="phone" color={colors.textSecondary} size={18} />
              <Text style={styles.label}>PHONE NUMBER</Text>
            </View>
            {isEditing ? (
              <View style={styles.lockedInput}>
                <Text style={styles.lockedInputText}>
                  {formData.phone || 'Not provided'}
                </Text>
                <View style={styles.lockedLabelRow}>
                  <TabIcon name="support" color={colors.textSecondary} size={12} />
                  <Text style={styles.lockedLabel}> Locked</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.value}>
                {formData.phone || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <TabIcon name="phone" color={colors.primary} size={18} />
              <Text style={styles.label}>Alternate Mobile (Optional)</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.alternateMobile}
                onChangeText={text => setFormData({...formData, alternateMobile: text})}
                placeholder="Enter alternate mobile number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
              />
            ) : (
              <Text style={styles.value}>
                {formData.alternateMobile || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <TabIcon name="location" color={colors.primary} size={18} />
              <Text style={styles.label}>Address</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={text =>
                  setFormData({...formData, address: text})
                }
                multiline
                numberOfLines={3}
                placeholder="Enter your address"
                placeholderTextColor={colors.textSecondary}
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.value}>
                {formData.address || 'Not provided'}
              </Text>
            )}
          </View>
        </View>

        {/* Additional Options */}
        <View style={styles.optionsSection}>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => navigation.navigate('Favorites')}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <TabIcon name="heart" color={colors.primary} size={20} />
              </View>
              <Text style={styles.optionText}>My Favorites</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              // Chat lives under the visible "Chats" tab (ChatNavigator)
              (navigation as any).navigate('Chats', {screen: 'ChatList'});
            }}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <TabIcon name="inquiries" color={colors.primary} size={20} />
              </View>
              <Text style={styles.optionText}>My Chats</Text>
            </View>
            <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => (navigation as any).navigate('RecentlyViewed')}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, styles.recentIconContainer]}>
                <TabIcon name="eye" color={colors.primary} size={20} />
              </View>
              <Text style={styles.optionText}>Recently Viewed</Text>
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
          <View style={styles.imagePickerModalContent}>
            <Text style={styles.imagePickerModalTitle}>Select Profile Image</Text>
            <Text style={styles.imagePickerModalSubtitle}>Choose an option</Text>
            
            <View style={styles.imagePickerModalButtons}>
              <TouchableOpacity
                style={styles.imagePickerOptionButton}
                onPress={() => {
                  setShowImagePickerModal(false);
                  setTimeout(() => handleImagePicker('camera'), 300);
                }}>
                <TabIcon name="camera" color={colors.primary} size={32} />
                <Text style={styles.imagePickerOptionText}>Camera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.imagePickerOptionButton}
                onPress={() => {
                  setShowImagePickerModal(false);
                  setTimeout(() => handleImagePicker('gallery'), 300);
                }}>
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
    backgroundColor: '#FAFAFA',
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    shadowOffset: {width: 0, height: 4},
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
    fontFamily: fonts.extraBold,
    color: colors.surface,
    fontSize: 36,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  creditsPillText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  cameraIcon: {
    fontSize: 18,
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
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  uploadButtonText: {
    fontFamily: fonts.medium,
    color: colors.primary,
    fontSize: 15,
  },
  userName: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    lineHeight: 28,
  },
  userEmail: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    fontFamily: fonts.bold,
    color: colors.surface,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    width: '100%',
    maxWidth: 280,
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
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 16,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontFamily: fonts.bold,
    color: colors.surface,
    fontSize: 16,
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
  inputContainer: {
    marginBottom: spacing.xl,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  labelIcon: {
    fontSize: 18,
  },
  label: {
    fontFamily: fonts.bold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: fonts.regular,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  value: {
    fontFamily: fonts.regular,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  lockedInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lockedInputText: {
    fontFamily: fonts.regular,
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lockedLabel: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: spacing.sm,
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
  optionIcon: {
    fontSize: 18,
  },
  logoutIconContainer: {
    backgroundColor: colors.error + '15',
  },
  recentIconContainer: {
    backgroundColor: colors.accent + '15',
  },
  optionText: {
    fontFamily: fonts.semiBold,
    color: colors.text,
    fontSize: 16,
  },
  logoutText: {
    color: colors.error,
  },
  optionArrow: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loginContent: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loginIcon: {
    fontSize: 50,
  },
  loginTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    fontFamily: fonts.bold,
    color: colors.surface,
    fontSize: 16,
  },
  loginNote: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  imagePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  imagePickerModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  imagePickerModalSubtitle: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  imagePickerModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    width: '100%',
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
  imagePickerOptionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  imagePickerOptionText: {
    fontFamily: fonts.semiBold,
    color: colors.text,
    fontSize: 14,
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
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    fontSize: 16,
  },
});

export default BuyerProfileScreen;

