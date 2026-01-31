import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  Platform,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {launchImageLibrary, launchCamera, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuyerHeader from '../../components/BuyerHeader';
import CustomAlert from '../../utils/alertHelper';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Profile'>,
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
  const [formData, setFormData] = useState({
    name: userData.full_name || '',
    phone: userData.phone || '',
    email: userData.email || '',
    address: userData.address || '',
  });

  const [originalData, setOriginalData] = useState({
    name: userData.full_name || '',
    phone: userData.phone || '',
    email: userData.email || '',
    address: userData.address || '',
  });

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
    CustomAlert.alert(
      'Select Profile Image',
      'Choose an option',
      [
        {text: 'Camera', onPress: () => handleImagePicker('camera')},
        {text: 'Gallery', onPress: () => handleImagePicker('gallery')},
        {text: 'Cancel', style: 'cancel'},
      ],
      {cancelable: true},
    );
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
              <Text style={styles.loginIcon}>👤</Text>
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
        {/* Profile Section */}
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
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{userData.full_name || 'User'}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showImagePicker}
              activeOpacity={0.8}>
              <Text style={styles.uploadButtonText}>
                {profileImage ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit/Cancel Buttons */}
        <View style={styles.actionButtons}>
          {!isEditing ? (
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={handleEdit}
              activeOpacity={0.8}>
              <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
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
                <Text style={styles.saveButtonText}>✓ Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.labelIcon}>👤</Text>
              <Text style={styles.label}>Full Name</Text>
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
              <Text style={styles.labelIcon}>✉</Text>
              <Text style={styles.label}>Email</Text>
            </View>
            {isEditing ? (
              <View style={styles.lockedInput}>
                <Text style={styles.lockedInputText}>{formData.email}</Text>
                <Text style={styles.lockedLabel}>🔒 Locked</Text>
              </View>
            ) : (
              <Text style={styles.value}>{formData.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.labelIcon}>📞</Text>
              <Text style={styles.label}>Phone Number</Text>
            </View>
            {isEditing ? (
              <View style={styles.lockedInput}>
                <Text style={styles.lockedInputText}>
                  {formData.phone || 'Not provided'}
                </Text>
                <Text style={styles.lockedLabel}>🔒 Locked</Text>
              </View>
            ) : (
              <Text style={styles.value}>
                {formData.phone || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.labelIcon}>📍</Text>
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
                <Text style={styles.optionIcon}>❤</Text>
              </View>
              <Text style={styles.optionText}>My Favorites</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionIcon}>💬</Text>
              </View>
              <Text style={styles.optionText}>My Inquiries</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => (navigation as any).navigate('RecentlyViewed')}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, styles.recentIconContainer]}>
                <Text style={styles.optionIcon}>🕐</Text>
              </View>
              <Text style={styles.optionText}>Recently Viewed</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={handleLogout}
            activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, styles.logoutIconContainer]}>
                <Text style={styles.optionIcon}>🚪</Text>
              </View>
              <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cameraIcon: {
    fontSize: 18,
  },
  uploadButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
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
  actionButtons: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editButton: {
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
  editButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
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
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
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
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  value: {
    ...typography.body,
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
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  lockedLabel: {
    ...typography.caption,
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
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
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
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loginSubtitle: {
    ...typography.body,
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
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  loginNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default BuyerProfileScreen;

