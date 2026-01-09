import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';
import {fixImageUrl} from '../utils/imageHelper';

export const userService = {
  // Get profile (exact backend structure: user + profile)
  getProfile: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.USER_PROFILE);
      
      // Fix profile image URL
      if (response && response.success && response.data) {
        if (response.data.profile?.profile_image) {
          response.data.profile.profile_image = fixImageUrl(response.data.profile.profile_image);
        }
        if (response.data.user?.profile_image) {
          response.data.user.profile_image = fixImageUrl(response.data.user.profile_image);
        }
        // Also check direct profile_image field
        if (response.data.profile_image) {
          response.data.profile_image = fixImageUrl(response.data.profile_image);
        }
      }
      
      return response;
    } catch (error: any) {
      // If 404, the endpoint might not exist yet - return graceful error
      if (error.status === 404) {
        return {
          success: false,
          message: 'Profile endpoint not available. Using cached user data.',
          data: null,
        };
      }
      throw error;
    }
  },

  // Update profile
  updateProfile: async (profileData: {
    full_name?: string;
    address?: string;
    whatsapp_number?: string;
    alternate_mobile?: string;
    company_name?: string;
    license_number?: string;
    gst_number?: string;
    website?: string;
  }) => {
    const response = await api.put(API_ENDPOINTS.UPDATE_PROFILE, profileData);
    return response;
  },

  // Upload profile picture (legacy endpoint)
  uploadProfilePicture: async (imageUri: string) => {
    try {
      const formData = new FormData();
      formData.append('profile_picture', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      const response = await api.post(API_ENDPOINTS.UPLOAD_PICTURE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error: any) {
      // If 404, try the new endpoint
      if (error.status === 404) {
        return userService.uploadProfileImage(imageUri);
      }
      throw error;
    }
  },

  // Upload profile image (new endpoint as per guide - syncs with website)
  uploadProfileImage: async (imageUri: string) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      const response = await api.post(API_ENDPOINTS.UPLOAD_PROFILE_IMAGE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update stored user data if successful (as per guide)
      if (response.success && response.data?.url) {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const userData = await AsyncStorage.getItem('@propertyapp_user');
          if (userData) {
            const user = JSON.parse(userData);
            user.profile_image = fixImageUrl(response.data.url);
            await AsyncStorage.setItem('@propertyapp_user', JSON.stringify(user));
            
            // Also update AuthContext if available
            try {
              const {useAuth} = require('../context/AuthContext');
              // Note: This will require the component to reload user data
              // The profile screen should call getProfile() after upload
            } catch (contextError) {
              // Context not available, that's okay
            }
          }
        } catch (storageError) {
          console.error('Error updating cached user data:', storageError);
        }
      }

      return response;
    } catch (error: any) {
      // If 404, the endpoint might not exist yet - return a graceful error
      if (error.status === 404) {
        return {
          success: false,
          message: 'Profile picture upload endpoint not available. Please contact support.',
        };
      }
      throw error;
    }
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put(API_ENDPOINTS.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response;
  },
};
