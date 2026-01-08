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

      const response = await api.post(API_ENDPOINTS.MODERATE_AND_UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds for moderation
      });

      // Handle different response statuses from moderation endpoint
      // Backend returns: { status: "success"|"error", message: "...", data: { moderation_status, image_url, ... } }
      if (response.success && response.data) {
        const moderationStatus = response.data.moderation_status || response.data.status;
        
        // Map backend status to our format
        let status: 'success' | 'approved' | 'pending' | 'rejected' | 'failed' = 'success';
        if (moderationStatus === 'APPROVED' || moderationStatus === 'SAFE') {
          status = 'approved';
        } else if (moderationStatus === 'REJECTED' || moderationStatus === 'UNSAFE') {
          status = 'rejected';
        } else if (moderationStatus === 'NEEDS_REVIEW' || moderationStatus === 'PENDING') {
          status = 'pending';
        }

        return {
          status,
          message: response.message || 'Image uploaded successfully',
          image_url: response.data.image_url || response.data.url,
          moderation_status: moderationStatus,
          moderation_reason: response.data.moderation_reason || response.data.reason_code,
        };
      } else {
        // Error response from backend
        return {
          status: 'rejected',
          message: response.message || 'Image rejected by moderation',
          moderation_status: response.data?.moderation_status || 'REJECTED',
          moderation_reason: response.data?.moderation_reason || response.data?.reason_code,
        };
      }
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
    const response = await api.get(API_ENDPOINTS.ADMIN_MODERATION_QUEUE);
    return response;
  },

  // Approve image (Admin only)
  approveImage: async (imageId: number | string) => {
    const response = await api.post(API_ENDPOINTS.ADMIN_MODERATION_APPROVE, {
      image_id: imageId,
    });
    return response;
  },

  // Reject image (Admin only)
  rejectImage: async (imageId: number | string, reason?: string) => {
    const response = await api.post(API_ENDPOINTS.ADMIN_MODERATION_REJECT, {
      image_id: imageId,
      reason: reason || 'Image does not meet quality standards',
    });
    return response;
  },
};

