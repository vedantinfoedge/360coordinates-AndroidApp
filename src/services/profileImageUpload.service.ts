/**
 * Profile Image Upload Service
 * Flow: Upload to Firebase → Send Firebase URL to backend
 * 
 * This service handles the complete flow:
 * 1. Upload image to Firebase Storage
 * 2. Send Firebase URL to backend API
 * 3. Return upload result
 */

import {uploadProfileImageToFirebase, isFirebaseStorageAvailable} from './firebaseStorageProperty.service';
import {API_CONFIG, API_ENDPOINTS} from '../config/api.config';
import {USE_FIREBASE_STORAGE} from '../config/firebaseStorage.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api.service';

export interface ProfileImageUploadResult {
  success: boolean;
  firebaseUrl?: string;
  imageUrl?: string; // Final URL (may be Firebase URL or backend URL)
  message: string;
}

/**
 * Get auth token from AsyncStorage
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('@auth_token');
  } catch {
    return null;
  }
};

/**
 * Upload profile image with Firebase Storage
 * Flow: Upload to Firebase → Send Firebase URL to backend
 * 
 * @param imageUri - Local image URI
 * @param userId - User ID
 * @param onProgress - Progress callback (optional) - receives percentage 0-100
 * @returns Upload result
 */
export const uploadProfileImageWithFirebase = async (
  imageUri: string,
  userId: number | string,
  onProgress?: (progress: number) => void,
): Promise<ProfileImageUploadResult> => {
  try {
    // Check if Firebase Storage is enabled and available
    const firebaseEnabled = USE_FIREBASE_STORAGE;
    const firebaseAvailable = firebaseEnabled && isFirebaseStorageAvailable();

    if (firebaseEnabled && firebaseAvailable) {
      // Firebase Storage flow: Upload to Firebase → Backend API
      console.log('[ProfileImageUpload] Using Firebase Storage for upload', {
        imageUri: imageUri.substring(0, 50),
        userId,
      });

      // Step 1: Upload to Firebase Storage
      let firebaseUrl: string | null = null;
      let firebasePath: string | null = null;

      try {
        console.log('[ProfileImageUpload] Step 1: Uploading to Firebase Storage...');
        const firebaseResult = await uploadProfileImageToFirebase(
          imageUri,
          userId,
          onProgress, // Pass progress callback to Firebase upload
        );
        firebaseUrl = firebaseResult.url;
        firebasePath = firebaseResult.path;
        console.log('[ProfileImageUpload] Image uploaded to Firebase:', firebaseUrl);
      } catch (firebaseError: any) {
        console.error('[ProfileImageUpload] Firebase upload failed:', firebaseError);
        throw new Error(`Firebase upload failed: ${firebaseError.message}`);
      }

      // Step 2: Send Firebase URL to backend
      console.log('[ProfileImageUpload] Step 2: Sending Firebase URL to backend...');
      
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('Authentication token not found. Please login again.');
      }

      // Create FormData with Firebase URL
      const formData = new FormData();
      formData.append('firebase_url', firebaseUrl);

      const uploadUrl = `${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.UPLOAD_PROFILE_IMAGE}`;
      
      console.log('[ProfileImageUpload] Sending to backend API:', {
        url: uploadUrl,
        firebaseUrl: firebaseUrl.substring(0, 80),
      });

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
          // Don't set Content-Type - let fetch set it with boundary for FormData
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log('[ProfileImageUpload] Backend API response:', {
        status: response.status,
        ok: response.ok,
        responsePreview: responseText.substring(0, 200),
      });

      if (!response.ok) {
        throw new Error(
          `Backend upload failed: ${response.status} - ${responseText.substring(0, 200)}`,
        );
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[ProfileImageUpload] Failed to parse backend response:', parseError);
        throw new Error('Invalid response from backend API');
      }

      if (data.status === 'success' || data.success === true) {
        // Success - profile image uploaded
        const result: ProfileImageUploadResult = {
          success: true,
          firebaseUrl: firebaseUrl,
          imageUrl: data.data?.url || firebaseUrl, // Use backend URL if provided, otherwise Firebase URL
          message: data.message || 'Profile image uploaded successfully',
        };

        console.log('[ProfileImageUpload] Upload successful:', {
          hasFirebaseUrl: !!result.firebaseUrl,
          hasImageUrl: !!result.imageUrl,
          firebaseUrl: result.firebaseUrl?.substring(0, 80),
        });

        return result;
      } else {
        // Backend upload failed
        throw new Error(data.message || 'Backend upload failed');
      }
    } else {
      // Fallback to direct backend upload (legacy flow)
      console.log('[ProfileImageUpload] Firebase Storage not available, using direct backend upload');
      
      if (!firebaseEnabled) {
        console.log('[ProfileImageUpload] Firebase Storage disabled in config');
      } else if (!firebaseAvailable) {
        console.warn('[ProfileImageUpload] Firebase Storage enabled but not available, falling back to backend storage');
      }

      // Direct upload to backend via FormData
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

      if (response.success && response.data?.url) {
        return {
          success: true,
          imageUrl: response.data.url,
          message: response.message || 'Profile image uploaded successfully',
        };
      } else {
        throw new Error(response.message || 'Failed to upload profile image');
      }
    }
  } catch (error: any) {
    console.error('[ProfileImageUpload] Profile image upload error:', error);
    throw error;
  }
};
