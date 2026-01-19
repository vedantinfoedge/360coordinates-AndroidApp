import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';
import {analyzeDetection} from './detection.service';
import {
  ModerationApiResponse,
  ModerationData,
  EnhancedImageUploadResult,
} from './moderation.types';

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

// Legacy interface for backwards compatibility
export interface ImageUploadResult {
  status: 'success' | 'approved' | 'pending' | 'rejected' | 'failed';
  message: string;
  image_url?: string;
  moderation_status?: 'SAFE' | 'UNSAFE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  moderation_reason?: string;
  // Optional detection details (for new implementation)
  detection?: ReturnType<typeof analyzeDetection>;
}

export const moderationService = {
  /**
   * Upload image with automatic moderation (as per Google Vision API documentation)
   * 
   * Image URL Format (from backend):
   * - Full URL: "https://demo1.indiapropertys.com/backend/uploads/properties/74/img_1704067200_65a1b2c3d4e5f.jpg"
   * - Relative path: "properties/74/img_1704067200_65a1b2c3d4e5f.jpg"
   * 
   * Filename pattern: img_{timestamp}_{uniqid}.{extension}
   * Storage path: /backend/uploads/properties/{propertyId}/
   * 
   * @param imageUri Local image URI to upload
   * @param propertyId Property ID (0 for validation-only mode)
   * @param validateOnly If true, only validates without saving
   * @returns ImageUploadResult with image_url following backend naming convention
   */
  uploadWithModeration: async (
    imageUri: string,
    propertyId?: number | string,
    validateOnly: boolean = false,
  ): Promise<ImageUploadResult> => {
    try {
      // Validate file type before upload
      const fileExtension = imageUri.split('.').pop()?.toLowerCase();
      const allowedTypes = ['jpg', 'jpeg', 'png', 'webp'];
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        return {
          status: 'rejected',
          message: 'Invalid image format. Please use JPEG, PNG, or WebP.',
          moderation_status: 'REJECTED',
          moderation_reason: 'Invalid file type',
        };
      }

      // Determine MIME type
      let mimeType = 'image/jpeg';
      if (fileExtension === 'png') mimeType = 'image/png';
      if (fileExtension === 'webp') mimeType = 'image/webp';

      const formData = new FormData();
      
      // FormData field name must be 'image' (not 'file' or 'images')
      formData.append('image', {
        uri: imageUri,
        type: mimeType, // 'image/jpeg', 'image/png', or 'image/webp'
        name: `property_image.${fileExtension}`, // e.g., 'property_image.jpg'
      } as any);

      // Add property_id (0 for validation-only mode for new properties)
      const propId = validateOnly ? 0 : (propertyId || 0);
      formData.append('property_id', String(propId));

      // Add validate_only flag for new properties
      if (validateOnly) {
        formData.append('validate_only', 'true');
      }

      console.log('[ModerationService] Uploading image with FormData:', {
        uri: imageUri,
        propertyId: propId,
        validateOnly,
        mimeType,
        fileExtension,
        formDataFields: ['image', 'property_id', validateOnly ? 'validate_only' : null].filter(Boolean),
      });

      // Don't set Content-Type header - axios will set it automatically with boundary for FormData
      const response = await api.post(API_ENDPOINTS.MODERATE_AND_UPLOAD, formData, {
        timeout: 30000, // 30 seconds for moderation
        // Let axios handle Content-Type automatically for FormData
      });

      // Handle response according to documentation format
      // Success Response: { status: "success", message: "...", data: { moderation_status, image_url, ... } }
      // Error Response: { status: "error", message: "...", error_code: "...", details: {...} }
      
      // Check if response has success status (could be response.success or response.status)
      const isSuccess = response.success === true || response.status === 'success';
      
      if (isSuccess && response.data) {
        const moderationData: ModerationData = response.data;
        const moderationStatus = moderationData.moderation_status || 'PENDING';
        
        // Map backend status to our format
        let status: 'success' | 'approved' | 'pending' | 'rejected' | 'failed' = 'success';
        if (moderationStatus === 'SAFE' || moderationStatus === 'APPROVED') {
          status = 'approved';
        } else if (moderationStatus === 'REJECTED' || moderationStatus === 'UNSAFE') {
          status = 'rejected';
        } else if (moderationStatus === 'NEEDS_REVIEW' || moderationStatus === 'PENDING') {
          status = 'pending';
        }

        // Analyze detection data (faces, objects, labels) if available
        const detection = moderationData ? analyzeDetection(moderationData) : undefined;

        // Extract image URL - prefer image_url, then relative_path
        // Backend returns full URL in image_url or relative path in relative_path
        // Format: image_url = "https://demo1.indiapropertys.com/backend/uploads/properties/74/img_1704067200_65a1b2c3d4e5f.jpg"
        //         relative_path = "properties/74/img_1704067200_65a1b2c3d4e5f.jpg"
        let imageUrl = moderationData.image_url || 
                      moderationData.relative_path || 
                      (response.data as any).image_url ||
                      (response.data as any).relative_path;
        
        // Fix image URL if it's a relative path
        if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          const {fixImageUrl} = require('../utils/imageHelper');
          imageUrl = fixImageUrl(imageUrl) || imageUrl;
        }
        
        return {
          status,
          message: response.message || 'Image uploaded successfully',
          image_url: imageUrl,
          moderation_status: moderationStatus as any,
          moderation_reason: moderationData.moderation_reason || response.message,
          detection,
          rawData: moderationData,
        };
      } else if (response.status === 'error' || response.success === false) {
        // Error response from backend (400 status)
        const errorCode = (response as any).error_code;
        const errorDetails = (response as any).details;
        
        // Get user-friendly error message based on error code
        const errorMessage = getErrorMessage(errorCode, errorDetails, response.message);
        
        return {
          status: 'rejected',
          message: errorMessage,
          moderation_status: 'REJECTED',
          moderation_reason: errorMessage,
        };
      } else {
        // Unexpected response format
        return {
          status: 'failed',
          message: response.message || 'Unexpected response from server',
        };
      }
    } catch (error: any) {
      // Enhanced error logging with all possible error fields
      const errorDetails = {
        message: error?.message || 'Unknown error',
        status: error?.status || error?.response?.status,
        statusText: error?.statusText || error?.response?.statusText,
        error_code: error?.error_code || error?.response?.data?.error_code,
        details: error?.details || error?.response?.data?.details,
        data: error?.response?.data || error?.data,
        code: error?.code,
        config: {
          url: error?.config?.url,
          method: error?.config?.method,
          headers: error?.config?.headers,
        },
        // Include full error serialization
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      };
      
      // Log comprehensive error details
      console.error('[ModerationService] Image upload error details:', JSON.stringify(errorDetails, null, 2));
      
      // Log raw error object for debugging
      console.error('[ModerationService] Raw error object:', error);
      
      // Log response data separately if available
      if (error?.response?.data) {
        console.error('[ModerationService] Error response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Log request config for debugging
      if (error?.config) {
        console.error('[ModerationService] Request config:', {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers,
          data: error.config.data instanceof FormData ? '[FormData]' : error.config.data,
        });
      }
      
      // Handle specific error cases
      if (error?.response?.status === 400) {
        const errorData = error.response.data;
        const errorCode = errorData?.error_code;
        const errorMessage = getErrorMessage(errorCode, errorData?.details, errorData?.message);
        
        console.log('[ModerationService] 400 Error details:', {
          errorCode,
          errorData,
          errorMessage,
        });
        
        return {
          status: 'rejected',
          message: errorMessage,
          moderation_status: 'REJECTED',
          moderation_reason: errorMessage,
        };
      }
      
      // Handle network errors
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        return {
          status: 'failed',
          message: 'Upload timeout. Please check your connection and try again.',
        };
      }
      
      // Handle other HTTP errors
      if (error?.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 401) {
          return {
            status: 'failed',
            message: 'Authentication failed. Please login again.',
          };
        }
        
        if (status === 413) {
          return {
            status: 'rejected',
            message: 'Image file is too large. Maximum size is 5MB.',
            moderation_status: 'REJECTED',
            moderation_reason: 'File too large',
          };
        }
        
        if (status === 500) {
          return {
            status: 'failed',
            message: 'Server error. Please try again later.',
          };
        }
        
        // Try to extract error message from response
        const errorMessage = errorData?.message || errorData?.error || error.message;
        return {
          status: 'failed',
          message: errorMessage || `Upload failed (${status}). Please try again.`,
        };
      }
      
      return {
        status: 'failed',
        message: error?.message || 'Failed to upload image. Please check your connection and try again.',
      };
    }
  },

  // Pre-validate image before upload (validation-only mode)
  validateImage: async (imageUri: string): Promise<ImageUploadResult> => {
    return moderationService.uploadWithModeration(imageUri, 0, true);
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

      // Don't set Content-Type header - axios will set it automatically with boundary for FormData
      const response = await api.post(API_ENDPOINTS.MODERATION_CHECK_IMAGE, formData, {
        // Let axios handle Content-Type automatically for FormData
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

// Helper function to get user-friendly error messages based on error codes
function getErrorMessage(
  errorCode?: string,
  details?: any,
  defaultMessage?: string,
): string {
  if (!errorCode) {
    return defaultMessage || 'Image upload failed. Please try again.';
  }

  switch (errorCode) {
    case 'human_detected':
      const confidence = details?.confidence 
        ? `${Math.round(details.confidence)}%` 
        : '';
      const method = details?.detection_method || 'detection';
      return `Image contains people${confidence ? ` (${confidence} confidence)` : ''}. Please upload property images only.`;
    
    case 'animal_detected':
      const animal = details?.detected || 'animal';
      return `Image contains ${animal}. Please upload property images only.`;
    
    case 'adult_content':
      return 'Image contains inappropriate content and cannot be uploaded.';
    
    case 'violence_content':
      return 'Image contains violent content and cannot be uploaded.';
    
    case 'racy_content':
      return 'Image contains suggestive content and cannot be uploaded.';
    
    case 'file_too_large':
      return 'Image size exceeds 5MB. Please compress or use a smaller image.';
    
    case 'invalid_file_type':
      return 'Invalid image format. Please use JPEG, PNG, or WebP.';
    
    case 'api_error':
      return 'Image verification temporarily unavailable. Image will be reviewed manually.';
    
    case 'config_error':
      return 'Server error. Please try again later.';
    
    default:
      return defaultMessage || `Image upload failed: ${errorCode}`;
  }
}

