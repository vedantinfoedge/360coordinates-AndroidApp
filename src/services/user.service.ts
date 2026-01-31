import api from './api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_ENDPOINTS} from '../config/api.config';
import {fixImageUrl} from '../utils/imageHelper';
import {uploadProfileImageWithFirebase} from './profileImageUpload.service';

export const userService = {
  // Get profile (exact backend structure: user + profile)
  // Uses correct endpoint based on user type: /api/buyer/profile/get.php or /api/seller/profile/get.php
  getProfile: async (userType?: string) => {
    try {
      // Determine user type from parameter or from stored user data
      let finalUserType = userType;
      if (!finalUserType) {
        try {
          const userData = await AsyncStorage.getItem('@propertyapp_user');
          if (userData) {
            const parsed = JSON.parse(userData);
            finalUserType = parsed.user_type;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Normalize user type
      const normalizedUserType = finalUserType?.toLowerCase() || 'buyer';
      
      // Use correct endpoint based on user type
      const endpoint = normalizedUserType === 'buyer' 
        ? API_ENDPOINTS.BUYER_PROFILE_GET
        : API_ENDPOINTS.SELLER_PROFILE_GET;
      
      console.log('[UserService] Fetching profile from:', endpoint, 'for userType:', normalizedUserType);
      
      const response = await api.get(endpoint);
      
      // Fix profile image URL
      if (response && response.success && response.data) {
        // Handle different response structures
        const profileData = response.data.profile || response.data;
        
        if (profileData?.profile_image) {
          profileData.profile_image = fixImageUrl(profileData.profile_image);
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

  // Upload profile image (Firebase Storage → Backend API pattern)
  uploadProfileImage: async (imageUri: string, onProgress?: (progress: number) => void) => {
    try {
      // Get user ID from stored user data
      let userId: number | string | null = null;
      try {
        const userData = await AsyncStorage.getItem('@propertyapp_user');
        if (userData) {
          const user = JSON.parse(userData);
          userId = user.id || user.user_id;
        }
      } catch (e) {
        console.error('[UserService] Error getting user ID:', e);
      }

      if (!userId) {
        throw new Error('User ID not found. Please login again.');
      }

      // Use Firebase Storage flow (or fallback to direct backend upload)
      const result = await uploadProfileImageWithFirebase(
        imageUri,
        userId,
        onProgress,
      );

      // Update stored user data if successful
      if (result.success && result.imageUrl) {
        try {
          const userData = await AsyncStorage.getItem('@propertyapp_user');
          if (userData) {
            const user = JSON.parse(userData);
            user.profile_image = fixImageUrl(result.imageUrl);
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

      // Return response in the same format as before for compatibility
      return {
        success: result.success,
        message: result.message,
        data: {
          url: result.imageUrl,
        },
      };
    } catch (error: any) {
      console.error('[UserService] Profile image upload error:', error);
      
      // If 404, the endpoint might not exist yet - return a graceful error
      if (error.status === 404 || error.message?.includes('404')) {
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
