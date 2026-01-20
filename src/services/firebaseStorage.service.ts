/**
 * Firebase Storage Service for React Native
 * Handles image uploads to Firebase Cloud Storage
 * 
 * Storage Path Structure:
 * - properties/{propertyId}/{imageId}.jpg
 * - chat/{userId}/{messageId}/{imageId}.jpg
 */

import storage from '@react-native-firebase/storage';
import {Platform} from 'react-native';
import {compressImageForUpload} from '../utils/imageCompression';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

export interface UploadResult {
  success: boolean;
  downloadUrl: string | null;
  error?: string;
  path?: string;
}

export interface UploadOptions {
  propertyId?: string | number;
  userId?: string;
  messageId?: string;
  onProgress?: (progress: UploadProgress) => void;
  maxSizeMB?: number; // Default: 5MB
  compress?: boolean; // Default: true
  quality?: number; // 0-1, default: 0.8
}

/**
 * Get Firebase Storage reference
 */
const getStorage = () => {
  try {
    return storage();
  } catch (error: any) {
    console.error('[FirebaseStorage] Error getting storage instance:', error);
    return null;
  }
};

/**
 * Generate unique filename for image
 */
const generateImageFilename = (originalUri: string): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = originalUri.split('.').pop()?.toLowerCase() || 'jpg';
  return `img_${timestamp}_${randomId}.${extension}`;
};

/**
 * Get storage path based on context
 */
const getStoragePath = (
  filename: string,
  options: UploadOptions,
): string => {
  if (options.propertyId) {
    return `properties/${options.propertyId}/${filename}`;
  }
  if (options.userId && options.messageId) {
    return `chat/${options.userId}/${options.messageId}/${filename}`;
  }
  if (options.userId) {
    return `chat/${options.userId}/${filename}`;
  }
  // Default fallback
  return `uploads/${filename}`;
};

/**
 * Upload image to Firebase Storage
 * 
 * @param imageUri Local image URI (file:// or content://)
 * @param options Upload options
 * @returns Upload result with download URL
 */
export const uploadImageToFirebase = async (
  imageUri: string,
  options: UploadOptions = {},
): Promise<UploadResult> => {
  const storageInstance = getStorage();
  if (!storageInstance) {
    return {
      success: false,
      downloadUrl: null,
      error: 'Firebase Storage is not available. Please rebuild the app.',
    };
  }

  try {
    // Step 1: Compress image if needed
    let finalUri = imageUri;
    if (options.compress !== false) {
      const quality = options.quality || 0.8;
      const maxSizeMB = options.maxSizeMB || 5;
      
      console.log('[FirebaseStorage] Compressing image...', {
        originalUri: imageUri.substring(0, 50),
        quality,
        maxSizeMB,
      });

      try {
        finalUri = await compressImageForUpload(imageUri, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality,
          maxSizeMB,
        });
        console.log('[FirebaseStorage] Image compressed:', {
          compressedUri: finalUri.substring(0, 50),
        });
      } catch (compressError) {
        console.warn('[FirebaseStorage] Compression failed, using original:', compressError);
        // Continue with original image
      }
    }

    // Step 2: Generate filename and path
    const filename = generateImageFilename(finalUri);
    const storagePath = getStoragePath(filename, options);
    const storageRef = storageInstance.ref(storagePath);

    console.log('[FirebaseStorage] Uploading to:', {
      path: storagePath,
      uri: finalUri.substring(0, 50),
    });

    // Step 3: Determine MIME type
    const extension = filename.split('.').pop()?.toLowerCase();
    let contentType = 'image/jpeg';
    if (extension === 'png') contentType = 'image/png';
    if (extension === 'webp') contentType = 'image/webp';

    // Step 4: Upload with progress tracking
    const uploadTask = storageRef.putFile(finalUri, {
      contentType,
      cacheControl: 'public, max-age=31536000', // 1 year cache
    });

    // Track upload progress
    if (options.onProgress) {
      uploadTask.on('state_changed', snapshot => {
        const progress = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        };
        options.onProgress!(progress);
      });
    }

    // Wait for upload to complete
    await uploadTask;

    // Step 5: Get download URL
    const downloadUrl = await storageRef.getDownloadURL();

    console.log('[FirebaseStorage] Upload successful:', {
      path: storagePath,
      url: downloadUrl.substring(0, 80),
    });

    return {
      success: true,
      downloadUrl,
      path: storagePath,
    };
  } catch (error: any) {
    console.error('[FirebaseStorage] Upload error:', error);
    
    let errorMessage = 'Failed to upload image';
    if (error?.code === 'storage/unauthorized') {
      errorMessage = 'Permission denied. Please check Firebase Storage rules.';
    } else if (error?.code === 'storage/canceled') {
      errorMessage = 'Upload was canceled';
    } else if (error?.code === 'storage/unknown') {
      errorMessage = 'Unknown error occurred';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      downloadUrl: null,
      error: errorMessage,
    };
  }
};

/**
 * Upload multiple images to Firebase Storage
 * 
 * @param imageUris Array of local image URIs
 * @param options Upload options
 * @returns Array of upload results
 */
export const uploadMultipleImagesToFirebase = async (
  imageUris: string[],
  options: UploadOptions = {},
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    const imageUri = imageUris[i];
    
    // Update progress callback to include image index
    const progressCallback = options.onProgress
      ? (progress: UploadProgress) => {
          options.onProgress!({
            ...progress,
            // Add image index info if needed
          });
        }
      : undefined;

    const result = await uploadImageToFirebase(imageUri, {
      ...options,
      onProgress: progressCallback,
    });

    results.push(result);

    // If upload fails, log but continue with other images
    if (!result.success) {
      console.warn(`[FirebaseStorage] Image ${i + 1}/${imageUris.length} failed:`, result.error);
    }
  }

  return results;
};

/**
 * Delete image from Firebase Storage
 * 
 * @param downloadUrl Full download URL of the image
 * @returns Success status
 */
export const deleteImageFromFirebase = async (
  downloadUrl: string,
): Promise<{success: boolean; error?: string}> => {
  const storageInstance = getStorage();
  if (!storageInstance) {
    return {
      success: false,
      error: 'Firebase Storage is not available',
    };
  }

  try {
    // Extract path from URL
    const urlObj = new URL(downloadUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
    
    if (!pathMatch) {
      return {
        success: false,
        error: 'Invalid download URL format',
      };
    }

    // Decode the path (Firebase URLs are encoded)
    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);
    
    const storageRef = storageInstance.ref(decodedPath);
    await storageRef.delete();

    console.log('[FirebaseStorage] Image deleted:', decodedPath);

    return {success: true};
  } catch (error: any) {
    console.error('[FirebaseStorage] Delete error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to delete image',
    };
  }
};

/**
 * Get download URL from storage path
 * 
 * @param storagePath Path in Firebase Storage (e.g., "properties/123/img_123.jpg")
 * @returns Download URL
 */
export const getDownloadUrlFromPath = async (
  storagePath: string,
): Promise<string | null> => {
  const storageInstance = getStorage();
  if (!storageInstance) {
    return null;
  }

  try {
    const storageRef = storageInstance.ref(storagePath);
    const downloadUrl = await storageRef.getDownloadURL();
    return downloadUrl;
  } catch (error) {
    console.error('[FirebaseStorage] Error getting download URL:', error);
    return null;
  }
};

/**
 * Check if Firebase Storage is available
 */
export const isFirebaseStorageAvailable = (): boolean => {
  try {
    const storageInstance = getStorage();
    return storageInstance !== null;
  } catch {
    return false;
  }
};
