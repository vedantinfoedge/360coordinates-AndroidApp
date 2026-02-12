/**
 * Image Upload Service with Moderation
 * Storage workflow: Device → Firebase Storage → backend receives URL for moderation only; images stored in Firebase.
 *
 * This service:
 * 1. Uploads image to Firebase Storage (images live in Firebase only)
 * 2. Sends Firebase URL to backend moderation API (backend does not store the file)
 * 3. Returns moderation result
 */

import {uploadPropertyImageToFirebase} from './firebaseStorageProperty.service';
import {API_CONFIG, API_ENDPOINTS} from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ImageUploadWithModerationResult {
  success: boolean;
  firebaseUrl: string;
  moderationStatus: 'SAFE' | 'UNSAFE' | 'PENDING' | 'NEEDS_REVIEW' | 'REJECTED';
  message: string;
  moderationReason?: string | null;
  imageId?: number | string | null;
  imageUrl?: string; // Final URL returned by backend (watermarked Firebase URL with cache-bust or server fallback)
  storageType?: 'firebase' | 'server';
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
 * Upload image with moderation
 * Workflow: Upload to Firebase → send Firebase URL to backend for moderation only; images stored in Firebase.
 * 
 * @param imageUri - Local image URI
 * @param propertyId - Property ID (0 or null for validation-only)
 * @param userId - User ID
 * @param onProgress - Progress callback (optional) - receives percentage 0-100
 * @returns Upload and moderation result
 */
export const uploadPropertyImageWithModeration = async (
  imageUri: string,
  propertyId: number | string | null,
  userId: number | string,
  onProgress?: (progress: number) => void,
): Promise<ImageUploadWithModerationResult> => {
  try {
    // Step 1: Upload to Firebase Storage
    let firebaseUrl: string | null = null;
    let firebasePath: string | null = null;

    try {
      console.log('[ImageUpload] Step 1: Uploading to Firebase Storage...', {
        imageUri: imageUri.substring(0, 50),
        userId,
        propertyId,
      });
      
      // Check Firebase Storage availability first
      const {isFirebaseStorageAvailable} = await import('./firebaseStorageProperty.service');
      if (!isFirebaseStorageAvailable()) {
        const errorMsg = 'Firebase Storage is not available. Please rebuild the app: cd android && ./gradlew clean && cd .. && npm run android';
        console.error('[ImageUpload] ❌', errorMsg);
        throw new Error(errorMsg);
      }
      
      const firebaseResult = await uploadPropertyImageToFirebase(
        imageUri,
        userId,
        propertyId,
        onProgress, // Pass progress callback to Firebase upload
      );
      firebaseUrl = firebaseResult.url;
      firebasePath = firebaseResult.path;
      console.log('[ImageUpload] ✅ Image uploaded to Firebase:', {
        url: firebaseUrl.substring(0, 80),
        path: firebasePath,
      });
    } catch (firebaseError: any) {
      console.error('[ImageUpload] ❌ Firebase upload failed:', {
        message: firebaseError.message,
        code: firebaseError.code,
        stack: firebaseError.stack,
      });
      throw new Error(`Firebase upload failed: ${firebaseError.message || 'Unknown error'}`);
    }

    // Step 2: Send Firebase URL to backend for moderation
    console.log('[ImageUpload] Step 2: Sending Firebase URL to backend for moderation...');
    
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error('Authentication token not found. Please login again.');
    }

    const data = await moderateExistingFirebaseUrl({
      firebaseUrl,
      propertyId,
      authToken,
      validateOnly: !(propertyId && propertyId !== 0),
    });

    // Extract moderation status - normalize to uppercase
    const rawStatus = data.data?.moderation_status || data.moderation_status;
    const moderationStatus = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';

    if (data.status === 'success' || data.success === true) {
      // Ensure Firebase URL is always included
      if (!firebaseUrl) {
        console.error('[ImageUpload] Firebase URL missing after upload!');
        throw new Error('Firebase upload succeeded but URL is missing');
      }
      
      const backendImageUrl: string | null =
        (typeof data?.data?.image_url === 'string' && data.data.image_url.trim()
          ? data.data.image_url.trim()
          : null) ||
        (typeof data?.image_url === 'string' && data.image_url.trim()
          ? data.image_url.trim()
          : null);

      const storageTypeRaw: any = data?.data?.storage_type ?? data?.storage_type;
      const storageType: 'firebase' | 'server' | undefined =
        storageTypeRaw === 'firebase' || storageTypeRaw === 'server'
          ? storageTypeRaw
          : undefined;

      // Success - image was moderated
      const result: ImageUploadWithModerationResult = {
        success: true,
        firebaseUrl: firebaseUrl,
        moderationStatus: (moderationStatus as 'SAFE' | 'UNSAFE' | 'PENDING' | 'NEEDS_REVIEW' | 'REJECTED') || 'PENDING',
        message: data.message || 'Image uploaded successfully',
        moderationReason: data.data?.moderation_reason || data.moderation_reason || null,
        imageId: data.data?.image_id || data.image_id || null,
        imageUrl: backendImageUrl || firebaseUrl, // Prefer backend-returned (watermarked) URL; fallback to original Firebase URL
        storageType,
      };

      console.log('[ImageUpload] Upload and moderation successful:', {
        moderationStatus: result.moderationStatus,
        hasImageId: !!result.imageId,
        hasFirebaseUrl: !!result.firebaseUrl,
        firebaseUrl: result.firebaseUrl.substring(0, 80),
      });

      return result;
    } else {
      // Moderation failed or rejected
      throw new Error(data.message || 'Moderation failed');
    }
  } catch (error: any) {
    console.error('[ImageUpload] Image upload error:', error);
    
    // If Firebase upload succeeded but moderation failed, we still have the Firebase URL
    // But we should throw the error so the caller can handle it
    throw error;
  }
};

/**
 * Moderate + watermark an already-uploaded Firebase download URL (no re-upload from device).
 * Use this after you have a real DB `property_id` (create mode).
 */
export const moderateFirebaseUrlForProperty = async (
  firebaseUrl: string,
  propertyId: number | string,
): Promise<ImageUploadWithModerationResult> => {
  const authToken = await getAuthToken();
  if (!authToken) {
    throw new Error('Authentication token not found. Please login again.');
  }

  const data = await moderateExistingFirebaseUrl({
    firebaseUrl,
    propertyId,
    authToken,
    validateOnly: false,
  });

  const rawStatus = data.data?.moderation_status || data.moderation_status;
  const moderationStatus = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';

  const backendImageUrl: string | null =
    (typeof data?.data?.image_url === 'string' && data.data.image_url.trim()
      ? data.data.image_url.trim()
      : null) ||
    (typeof data?.image_url === 'string' && data.image_url.trim()
      ? data.image_url.trim()
      : null);

  const storageTypeRaw: any = data?.data?.storage_type ?? data?.storage_type;
  const storageType: 'firebase' | 'server' | undefined =
    storageTypeRaw === 'firebase' || storageTypeRaw === 'server'
      ? storageTypeRaw
      : undefined;

  return {
    success: true,
    firebaseUrl,
    moderationStatus: (moderationStatus as any) || 'PENDING',
    message: data.message || 'Image processed successfully',
    moderationReason: data.data?.moderation_reason || data.moderation_reason || null,
    imageId: data.data?.image_id || data.image_id || null,
    imageUrl: backendImageUrl || firebaseUrl,
    storageType,
  };
};

async function moderateExistingFirebaseUrl(opts: {
  firebaseUrl: string;
  propertyId: number | string | null;
  authToken: string;
  validateOnly: boolean;
}): Promise<any> {
  const {firebaseUrl, propertyId, authToken, validateOnly} = opts;

  const formData = new FormData();
  formData.append('firebase_url', firebaseUrl);

  if (validateOnly) {
    formData.append('validate_only', 'true');
  } else if (propertyId && propertyId !== 0) {
    formData.append('property_id', String(propertyId));
  }

  const moderationUrl = `${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.MODERATE_AND_UPLOAD}`;

  console.log('[ImageUpload] Sending to moderation API:', {
    url: moderationUrl,
    hasPropertyId: !validateOnly && !!propertyId && propertyId !== 0,
    validateOnly,
    firebaseUrl: firebaseUrl.substring(0, 80),
  });

  const response = await fetch(moderationUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
      // Don't set Content-Type - let fetch set it with boundary for FormData
    },
    body: formData,
  });

  const responseText = await response.text();
  console.log('[ImageUpload] Moderation API response:', {
    status: response.status,
    ok: response.ok,
    responsePreview: responseText.substring(0, 200),
  });

  if (!response.ok) {
    throw new Error(
      `Moderation failed: ${response.status} - ${responseText.substring(0, 200)}`,
    );
  }

  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    console.error('[ImageUpload] Failed to parse moderation response:', parseError);
    throw new Error('Invalid response from moderation API');
  }
}

/**
 * Upload multiple images with moderation
 * 
 * @param imageUris - Array of local image URIs
 * @param propertyId - Property ID
 * @param userId - User ID
 * @param onProgress - Progress callback (optional) - receives (current, total, percentage)
 * @returns Array of upload results
 */
export const uploadMultiplePropertyImagesWithModeration = async (
  imageUris: string[],
  propertyId: number | string | null,
  userId: number | string,
  onProgress?: (current: number, total: number, percentage: number) => void,
): Promise<ImageUploadWithModerationResult[]> => {
  const results: ImageUploadWithModerationResult[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    const imageUri = imageUris[i];
    
    try {
      // Calculate overall progress
      const progressCallback = onProgress
        ? (uploadProgress: number) => {
            // Calculate overall progress across all images
            const overallProgress = ((i * 100 + uploadProgress) / imageUris.length);
            onProgress(i + 1, imageUris.length, overallProgress);
          }
        : undefined;

      const result = await uploadPropertyImageWithModeration(
        imageUri,
        propertyId,
        userId,
        progressCallback,
      );

      results.push(result);
    } catch (error: any) {
      // If one image fails, log but continue with others
      console.error(`[ImageUpload] Failed to upload image ${i + 1}/${imageUris.length}:`, error);
      results.push({
        success: false,
        firebaseUrl: '',
        moderationStatus: 'REJECTED',
        message: error.message || 'Upload failed',
        moderationReason: error.message || 'Upload failed',
      });
    }
  }

  return results;
};
