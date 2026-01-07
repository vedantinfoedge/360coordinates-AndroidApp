import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export type ModerationStatus = 'SAFE' | 'UNSAFE' | 'PENDING';

export interface ModerationResult {
  success: boolean;
  status: ModerationStatus;
  details?: {
    adult?: string;
    violence?: string;
    racy?: string;
  };
  message?: string;
}

export interface ImageUploadResult {
  status: 'success' | 'approved' | 'pending' | 'rejected' | 'failed';
  message: string;
  image_url?: string;
  moderation_status?: 'SAFE' | 'UNSAFE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  moderation_reason?: string;
}

export const moderationService = {
  // Upload image with automatic moderation (as per guide)
  uploadWithModeration: async (
    imageUri: string,
    propertyId?: number | string,
  ): Promise<ImageUploadResult> => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);

      if (propertyId) {
        formData.append('property_id', String(propertyId));
      }

      const response = await api.post(API_ENDPOINTS.MODERATION_UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds for moderation
      });

      return response;
    } catch (error: any) {
      console.error('Image upload with moderation error:', error);
      return {
        status: 'rejected',
        message: error.message || 'Failed to upload image',
      };
    }
  },

  // Check image with Google Vision API
  checkImage: async (imageUri: string): Promise<ModerationResult> => {
    try {
      // Convert image to base64 or FormData
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);

      const response = await api.post(API_ENDPOINTS.MODERATION_CHECK_IMAGE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response;
    } catch (error: any) {
      console.error('Image moderation error:', error);
      return {
        success: false,
        status: 'UNSAFE',
        message: error.message || 'Failed to check image',
      };
    }
  },

  // Check multiple images
  checkImages: async (imageUris: string[]): Promise<ModerationResult[]> => {
    const results = await Promise.all(
      imageUris.map(uri => moderationService.checkImage(uri)),
    );
    return results;
  },

  // Get pending images (Admin only)
  getPendingImages: async () => {
    const response = await api.get(API_ENDPOINTS.MODERATION_PENDING_IMAGES);
    return response;
  },

  // Update moderation status (Admin only)
  updateStatus: async (imageId: number, status: 'APPROVED' | 'REJECTED') => {
    const response = await api.put(API_ENDPOINTS.MODERATION_UPDATE_STATUS, {
      image_id: imageId,
      status,
    });
    return response;
  },
};

