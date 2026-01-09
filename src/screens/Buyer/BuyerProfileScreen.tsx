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
  Alert,
  Platform,
} from 'react-native';
import {launchImageLibrary, launchCamera, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuyerHeader from '../../components/BuyerHeader';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const BuyerProfileScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();

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

  const handleSave = () => {
    // In real app, save to backend
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const showImagePicker = () => {
    Alert.alert(
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
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    const callback = async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
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
              Alert.alert('Success', 'Profile picture updated successfully');
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
              Alert.alert('Error', uploadResponse.message || 'Failed to upload image');
            }
          } catch (error: any) {
            console.error('Error uploading profile image:', error);
            Alert.alert('Error', error.message || 'Failed to upload image');
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

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <BuyerHeader
        onProfilePress={() => {
          // Already on profile page
        }}
        onSupportPress={() => {
          // Handle support
        }}
        onLogoutPress={handleLogout}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={showImagePicker}
              activeOpacity={0.8}>
              {profileImage ? (
                <Image 
                  source={{uri: profileImage}} 
                  style={styles.avatarImage}
                  defaultSource={require('../../assets/logo.jpeg')}
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
            onPress={showImagePicker}>
            <Text style={styles.uploadButtonText}>
              {profileImage ? 'Change Photo' : 'Upload Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Edit/Cancel Buttons */}
        <View style={styles.actionButtons}>
          {!isEditing ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
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
            <Text style={styles.label}>Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={text => setFormData({...formData, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.value}>{formData.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={text => setFormData({...formData, phone: text})}
                keyboardType="phone-pad"
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.value}>
                {formData.phone || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
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
          <TouchableOpacity style={styles.optionItem}>
            <Text style={styles.optionText}>My Favorites</Text>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.optionItem}>
            <Text style={styles.optionText}>My Inquiries</Text>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.optionItem}>
            <Text style={styles.optionText}>Settings</Text>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.optionItem} onPress={handleLogout}>
            <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
            <Text style={styles.optionArrow}>→</Text>
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.border,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  cameraIcon: {
    fontSize: 16,
  },
  uploadButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  uploadButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actionButtons: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  editButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
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
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  optionsSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  logoutText: {
    color: colors.text,
  },
  optionArrow: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
});

export default BuyerProfileScreen;

