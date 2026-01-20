/**
 * Firebase Storage Service for Property Images
 * Matches the specification: Upload to Firebase Storage first, then send URL to backend
 * 
 * Flow: Image → Firebase Storage → Backend Moderation
 */

import storage from '@react-native-firebase/storage';
import {Platform} from 'react-native';

export interface FirebaseUploadResult {
  url: string;
  path: string;
  fileName: string;
}

/**
 * Upload property image to Firebase Storage
 * @param imageUri - Local file URI (file:// or content://)
 * @param userId - User ID
 * @param propertyId - Property ID (null for temp upload)
 * @param onProgress - Progress callback (optional) - receives percentage 0-100
 * @returns Firebase download URL and path
 */
/**
 * Check if Firebase Storage is available
 */
export const isFirebaseStorageAvailable = (): boolean => {
  try {
    const storageInstance = storage();
    return storageInstance !== null;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('not installed natively') || 
        errorMessage.includes('native module')) {
      console.warn('[FirebaseStorage] Firebase Storage native module not linked. Rebuild required.');
    }
    return false;
  }
};

export const uploadPropertyImageToFirebase = async (
  imageUri: string,
  userId: number | string,
  propertyId: number | string | null = null,
  onProgress?: (progress: number) => void,
): Promise<FirebaseUploadResult> => {
  try {
    console.log('🔥 Firebase Upload: Starting upload...', {
      imageUri: imageUri.substring(0, 50),
      userId,
      propertyId,
    });

    // Check if Firebase Storage is available
    if (!isFirebaseStorageAvailable()) {
      throw new Error(
        'Firebase Storage is not available. Please rebuild the app: cd android && ./gradlew clean && cd .. && npm run android'
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = imageUri.split('.').pop() || 'jpg';
    const fileName = `img_${timestamp}_${randomId}.${extension}`;

    // Determine storage path
    // Temporary uploads: properties/temp/{userId}/{filename}
    // Permanent uploads: properties/{propertyId}/{filename}
    let storagePath: string;
    if (propertyId) {
      storagePath = `properties/${propertyId}/${fileName}`;
    } else {
      storagePath = `properties/temp/${userId}/${fileName}`;
    }

    console.log('🔥 Firebase Upload: Storage path:', storagePath);

    // Create storage reference
    let storageRef;
    try {
      const storageInstance = storage();
      storageRef = storageInstance.ref(storagePath);
      console.log('✅ Firebase Storage reference created');
    } catch (storageError: any) {
      console.error('❌ Firebase Storage Error:', storageError);
      throw new Error(`Firebase Storage not initialized: ${storageError.message}`);
    }

    // Convert file:// URI to proper format for React Native
    let fileUri = imageUri;
    if (Platform.OS === 'android' && imageUri.startsWith('file://')) {
      fileUri = imageUri.replace('file://', '');
    }

    // Upload file with progress tracking
    console.log('🔥 Firebase Upload: Uploading file to Firebase...');
    const uploadTask = storageRef.putFile(fileUri);

    // Track upload progress if callback provided
    if (onProgress) {
      uploadTask.on('state_changed', snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      });
    }

    // Wait for upload to complete
    await uploadTask;
    console.log('✅ Firebase Upload: File uploaded successfully');

    // Get download URL
    console.log('🔥 Firebase Upload: Getting download URL...');
    const downloadURL = await storageRef.getDownloadURL();
    console.log('✅ Firebase Upload: Download URL obtained:', downloadURL.substring(0, 80));

    return {
      url: downloadURL,
      path: storagePath,
      fileName: fileName,
    };
  } catch (error: any) {
    console.error('❌ Firebase Upload Error:', {
      message: error.message,
      code: error.code,
      imageUri: imageUri.substring(0, 50),
      userId,
      propertyId,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload image to Firebase';
    if (error?.code) {
      switch (error.code) {
        case 'storage/unauthorized':
          errorMessage = 'Firebase Storage: Permission denied. Check Storage rules.';
          break;
        case 'storage/quota-exceeded':
          errorMessage = 'Firebase Storage: Quota exceeded. Check Firebase billing.';
          break;
        case 'storage/unauthenticated':
          errorMessage = 'Firebase Storage: User not authenticated.';
          break;
        case 'storage/canceled':
          errorMessage = 'Upload was canceled';
          break;
        case 'storage/unknown':
          errorMessage = 'Unknown error occurred. Please check your network connection.';
          break;
        case 'storage/invalid-argument':
          errorMessage = 'Invalid file. Please try selecting a different image.';
          break;
        case 'storage/not-found':
          errorMessage = 'Storage path not found';
          break;
        default:
          errorMessage = error.message || `Upload failed: ${error.code}`;
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Delete image from Firebase Storage
 * @param storagePath - Firebase Storage path
 */
export const deletePropertyImageFromFirebase = async (
  storagePath: string,
): Promise<void> => {
  try {
    const storageRef = storage().ref(storagePath);
    await storageRef.delete();
    console.log('[FirebaseStorage] Image deleted:', storagePath);
  } catch (error: any) {
    console.error('[FirebaseStorage] Delete error:', error);
    // Don't throw - deletion failures are not critical
  }
};
