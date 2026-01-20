/**
 * Firebase Image Upload Service
 * Based on the implementation guide
 * 
 * This service provides a unified API for uploading images with Firebase Storage
 * and sending them to backend for moderation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {uploadPropertyImageToFirebase} from './firebaseStorageProperty.service';
import {API_CONFIG, API_ENDPOINTS} from '../config/api.config';
import {authService} from './auth.service';

// API Configuration
const API_BASE_URL = API_CONFIG.API_BASE_URL;
const MODERATE_AND_UPLOAD_ENDPOINT = API_ENDPOINTS.MODERATE_AND_UPLOAD;

// Storage keys
const TOKEN_STORAGE_KEY = '@auth_token';
const USER_STORAGE_KEY = '@propertyapp_user';

// Token management
const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
};

// User data management
const getUser = async (): Promise<any | null> => {
  const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
  return userData ? JSON.parse(userData) : null;
};

const setUser = async (user: any): Promise<void> => {
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

// Verify token (to get user data)
const verifyToken = async (): Promise<any> => {
  try {
    // Use authService to get current user
    const response = await authService.getCurrentUser();
    return response;
  } catch (error) {
    throw error;
  }
};

// Upload Image Function
export interface UploadImageResult {
  success: boolean;
  pending?: boolean;
  data: {
    url: string;
    image_id?: number | string;
    filename?: string;
    moderation_status: string;
    moderation_reason?: string;
    storage_type: 'firebase' | 'server';
  };
  message: string;
}

export const uploadImage = async (
  imageUri: string,
  propertyId: number | string,
  useFirebase: boolean = true,
): Promise<UploadImageResult> => {
  if (!propertyId || (typeof propertyId === 'number' && propertyId <= 0)) {
    throw {
      status: 400,
      message: 'Property ID is required for image upload',
      errors: ['Property ID is required'],
    };
  }

  let firebaseUrl: string | null = null;

  if (useFirebase) {
    try {
      // Get user from AsyncStorage
      let user = await getUser();
      let userId = user?.id;

      // DEBUG: Log user object
      console.log('🔍 User object check:', {
        userExists: !!user,
        userId: userId,
        userKeys: user ? Object.keys(user) : [],
      });

      // FALLBACK: If user not in AsyncStorage, fetch from backend
      if (!userId) {
        console.warn('⚠️ User ID not in AsyncStorage, fetching from backend...');
        try {
          const token = await getToken();
          if (token) {
            const verifyResponse = await verifyToken();
            console.log('🔍 Verify token response:', verifyResponse);

            if (verifyResponse && verifyResponse.success && verifyResponse.data) {
              // Extract user from response (could be in data.user, data.profile, or data directly)
              const userDataFromResponse = verifyResponse.data.user || verifyResponse.data.profile || verifyResponse.data;
              user = userDataFromResponse;
              userId = userDataFromResponse.id || userDataFromResponse.user_id || userDataFromResponse.ID;
              await setUser(user);
              console.log('✅ User saved to AsyncStorage');
            }
          }
        } catch (verifyError) {
          console.error('❌ Failed to fetch user from backend:', verifyError);
        }
      }

      // Final check - try alternative field names
      if (!userId && user) {
        userId = user.user_id || user.id || user.ID;
        if (userId) {
          console.log('✅ Found user ID using alternative field:', userId);
        }
      }

      if (!userId) {
        console.warn('⚠️ User ID not found, falling back to server upload');
        useFirebase = false;
      } else {
        console.log('✅ User ID found, uploading to Firebase:', userId);

        // Step 1: Upload to Firebase Storage
        const firebaseResult = await uploadPropertyImageToFirebase(
          imageUri,
          userId,
          propertyId,
        );
        firebaseUrl = firebaseResult.url;
        console.log('✅ Image uploaded to Firebase successfully!');
        console.log('📎 Firebase URL:', firebaseUrl.substring(0, 80));
      }
    } catch (firebaseError: any) {
      console.error('❌ Firebase upload failed, falling back to server upload:', firebaseError);
      useFirebase = false;
    }
  }

  // Step 2: Send to backend for moderation
  const formData = new FormData();

  if (useFirebase && firebaseUrl) {
    // Send Firebase URL for moderation
    formData.append('firebase_url', firebaseUrl);
    formData.append('property_id', propertyId.toString());
  } else {
    // Fallback: Upload file directly to server
    // In React Native, you need to create a file object from URI
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg', // or detect from URI
      name: imageUri.split('/').pop() || 'image.jpg',
    } as any);
    formData.append('property_id', propertyId.toString());
  }

  const url = `${API_BASE_URL}${MODERATE_AND_UPLOAD_ENDPOINT}`;
  const token = await getToken();

  console.log('🔵 Image Upload Request:', {
    url,
    method: 'POST',
    useFirebase: useFirebase,
    hasFirebaseUrl: !!firebaseUrl,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // DO NOT set Content-Type - React Native will set it automatically with boundary
      },
      body: formData,
    });

    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from server');
    }

    const data = JSON.parse(responseText);

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || `Server error (${response.status})`,
        errors: data.errors || null,
        data: data,
      };
    }

    // Handle response
    const moderationStatus = data.data?.moderation_status || data.moderation_status;

    if (data.status === 'success' || data.success === true) {
      if (moderationStatus === 'SAFE' || moderationStatus === 'APPROVED') {
        // APPROVED
        const imageUrl = (useFirebase && firebaseUrl)
          ? firebaseUrl
          : (data.data?.image_url || data.data?.url);

        return {
          success: true,
          data: {
            url: imageUrl,
            image_id: data.data?.image_id,
            filename: data.data?.filename,
            moderation_status: 'SAFE',
            storage_type: (useFirebase && firebaseUrl) ? 'firebase' : 'server'
          },
          message: data.message || 'Image uploaded successfully',
        };
      } else if (moderationStatus === 'PENDING' || moderationStatus === 'NEEDS_REVIEW') {
        // PENDING
        const imageUrl = (useFirebase && firebaseUrl)
          ? firebaseUrl
          : (data.data?.image_url || null);

        return {
          success: true,
          pending: true,
          data: {
            url: imageUrl,
            image_id: data.data?.image_id,
            filename: data.data?.filename,
            moderation_status: moderationStatus,
            moderation_reason: data.data?.moderation_reason || data.message,
            storage_type: (useFirebase && firebaseUrl) ? 'firebase' : 'server'
          },
          message: data.message || 'Image is under review',
        };
      } else {
        // Missing moderation_status - treat as pending
        console.warn('Response missing moderation_status, treating as pending review');
        return {
          success: true,
          pending: true,
          data: {
            url: data.data?.image_url || null,
            image_id: data.data?.image_id,
            filename: data.data?.filename,
            moderation_status: 'PENDING',
            moderation_reason: 'Moderation status not provided'
          },
          message: data.message || 'Image uploaded, pending review',
        };
      }
    }

    throw new Error(data.message || 'Unknown error');
  } catch (error: any) {
    console.error('❌ Image upload error:', error);
    throw error;
  }
};

// Update Property with Images
export const updateProperty = async (
  propertyId: number | string,
  updateData: any,
): Promise<any> => {
  const url = `${API_BASE_URL}${API_ENDPOINTS.PROPERTY_UPDATE}?id=${propertyId}`;
  const token = await getToken();

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.message || 'Failed to update property',
      errors: data.errors || null,
    };
  }

  return data;
};
