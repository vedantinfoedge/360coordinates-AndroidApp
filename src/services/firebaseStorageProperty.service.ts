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
export const uploadPropertyImageToFirebase = async (
  imageUri: string,
  userId: number | string,
  propertyId: number | string | null = null,
  onProgress?: (progress: number) => void,
): Promise<FirebaseUploadResult> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `img_${timestamp}_${randomId}.jpg`;

    // Determine storage path
    let storagePath: string;
    if (propertyId) {
      storagePath = `properties/${propertyId}/${fileName}`;
    } else {
      storagePath = `properties/temp/${userId}/${fileName}`;
    }

    // Create storage reference
    const storageRef = storage().ref(storagePath);

    // Convert file:// URI to proper format for React Native
    let fileUri = imageUri;
    if (Platform.OS === 'android' && imageUri.startsWith('file://')) {
      fileUri = imageUri.replace('file://', '');
    }

    console.log('[FirebaseStorage] Uploading image:', {
      originalUri: imageUri.substring(0, 50),
      fileUri: fileUri.substring(0, 50),
      storagePath,
      platform: Platform.OS,
    });

    // Upload file with progress tracking
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

    // Get download URL
    const downloadURL = await storageRef.getDownloadURL();

    console.log('[FirebaseStorage] Upload successful:', {
      path: storagePath,
      url: downloadURL.substring(0, 80),
    });

    return {
      url: downloadURL,
      path: storagePath,
      fileName: fileName,
    };
  } catch (error: any) {
    console.error('[FirebaseStorage] Upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
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
