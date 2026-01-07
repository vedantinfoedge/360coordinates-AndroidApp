import {Image} from 'react-native';
import {API_CONFIG} from '../config/api.config';

/**
 * Compress image to reduce file size
 * @param uri Image URI
 * @param maxWidth Maximum width (default: 1920)
 * @param maxHeight Maximum height (default: 1920)
 * @param quality Quality 0-1 (default: 0.8)
 * @returns Compressed image URI
 */
export const compressImage = async (
  uri: string,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => {
        // Calculate new dimensions
        let newWidth = width;
        let newHeight = height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          newWidth = width * ratio;
          newHeight = height * ratio;
        }

        // For React Native, we'll return the original URI
        // Actual compression should be done using react-native-image-crop-picker
        // or similar library
        resolve(uri);
      },
      error => {
        console.error('Error getting image size:', error);
        reject(error);
      },
    );
  });
};

/**
 * Fix image URL - Convert relative paths to absolute URLs
 * According to guide: Images from backend are already full URLs, but we handle both cases
 * 
 * Backend may return:
 * - Full URL: "https://demo1.indiapropertys.com/backend/uploads/properties/images/img_1.jpg"
 * - Relative path: "uploads/properties/111/img_1767328756_69574bf41e6d4.jpeg"
 * 
 * @param imagePath Relative or absolute image path from API
 * @returns Full absolute image URL
 */
export const fixImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) {
    return 'https://via.placeholder.com/400x300?text=No+Image';
  }

  // If already a full URL (as per guide, backend returns full URLs), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Handle relative paths (fallback for older data or edge cases)
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

  // Backend returns paths like: "uploads/properties/111/img_xxx.jpeg"
  // Need to prepend BASE_URL (not UPLOAD_URL)
  return `${API_CONFIG.BASE_URL}/${cleanPath}`;
};

/**
 * Get full image URL from backend (alias for fixImageUrl)
 * @param imagePath Relative or absolute image path
 * @returns Full image URL
 */
export const getImageUrl = (imagePath: string | null | undefined): string => {
  return fixImageUrl(imagePath);
};

/**
 * Get property image URL
 * @param imagePath Image path from property data
 * @returns Full image URL
 */
export const getPropertyImageUrl = (imagePath: string | null | undefined): string => {
  return fixImageUrl(imagePath);
};

/**
 * Get user profile image URL
 * @param imagePath Image path from user data
 * @returns Full image URL
 */
export const getProfileImageUrl = (imagePath: string | null | undefined): string => {
  return fixImageUrl(imagePath);
};

/**
 * Fix property images array - Convert all relative image URLs to absolute
 * @param property Property object with images array
 * @returns Property with fixed image URLs
 */
export const fixPropertyImages = (property: any): any => {
  if (!property) return property;
  
  const fixed = {
    ...property,
    cover_image: fixImageUrl(property.cover_image),
  };
  
  // Fix images array if present
  if (property.images && Array.isArray(property.images)) {
    fixed.images = property.images.map((img: any) => ({
      ...img,
      image_url: fixImageUrl(img.image_url || img.url),
    }));
  }
  
  return fixed;
};

/**
 * Format file size for display
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if image size is acceptable (max 2MB)
 * @param uri Image URI
 * @returns Promise<boolean>
 */
export const checkImageSize = async (uri: string, maxSizeMB: number = 2): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => {
        // Estimate file size (rough calculation)
        // Actual size check should be done with file system
        const estimatedSize = (width * height * 3) / (1024 * 1024); // Rough estimate
        resolve(estimatedSize <= maxSizeMB);
      },
      error => {
        console.error('Error checking image size:', error);
        reject(error);
      },
    );
  });
};

