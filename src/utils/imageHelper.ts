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
 * Fixes and normalizes image URLs
 * Handles various URL formats from backend
 * 
 * Backend may return:
 * - Full URL: "https://demo1.indiapropertys.com/backend/uploads/properties/74/img_1704067200_65a1b2c3d4e5f.jpg"
 * - Relative path: "uploads/properties/111/img_1767328756_69574bf41e6d4.jpeg"
 * - Relative path with slash: "/uploads/properties/74/img_1704067200_65a1b2c3d4e5f.jpg"
 * - Properties path: "properties/74/img_1704067200_65a1b2c3d4e5f.jpg" (from moderation API)
 * 
 * Property Image Naming Convention:
 * - Filename format: img_{timestamp}_{uniqid}.{extension}
 * - Storage path: /backend/uploads/properties/{propertyId}/
 * - Example: properties/74/img_1704067200_65a1b2c3d4e5f.jpg
 * 
 * @param imagePath Relative or absolute image path from API
 * @returns Full absolute image URL or null if invalid
 */
export const fixImageUrl = (imagePath: string | null | undefined): string | null => {
  // Input validation
  if (!imagePath || typeof imagePath !== 'string') {
    return null;
  }
  
  const trimmed = imagePath.trim();
  
  // Check for invalid values
  if (!trimmed || 
      trimmed === 'null' || 
      trimmed === 'undefined' || 
      trimmed === '' ||
      trimmed.length === 0) {
    return null;
  }
  
  // Reject base64 data URIs - backend should have converted these to file URLs
  // Check for direct data URIs: "data:image/jpeg;base64,..."
  if (trimmed.startsWith('data:image/') || trimmed.includes(';base64,')) {
    console.warn('[fixImageUrl] Rejected base64 data URI:', trimmed.substring(0, 100) + '...');
    return null;
  }
  
  // Reject URLs that contain base64 data URI patterns (even if embedded in a path)
  // Example: "https://domain.com/uploads/data:image/jpeg;base64,..."
  if (trimmed.includes('/data:image/') || trimmed.match(/data:image\/[^;]+;base64/)) {
    console.warn('[fixImageUrl] Rejected URL containing base64 pattern:', trimmed.substring(0, 100) + '...');
    return null;
  }
  
  // Already full URL (backend should normalize, but verify)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Validate URL format - be lenient with validation
    try {
      const urlObj = new URL(trimmed);
      // Only allow http and https protocols
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        return trimmed;
      }
      console.warn('[fixImageUrl] Invalid URL protocol:', trimmed, 'Protocol:', urlObj.protocol);
      return null;
    } catch (e) {
      // URL validation failed, but if it starts with http/https, trust it
      // Some valid URLs might fail URL constructor (encoding, etc.)
      // Log but still return the URL if it looks valid
      const isLikelyValid = trimmed.match(/^https?:\/\/[^\s]+$/i);
      if (isLikelyValid) {
        console.warn('[fixImageUrl] URL validation failed but appears valid:', trimmed);
        return trimmed;
      }
      console.warn('[fixImageUrl] Invalid URL format:', trimmed, 'Error:', e);
      return null;
    }
  }
  
  // Relative path starting with /uploads/
  if (trimmed.startsWith('/uploads/')) {
    return `${API_CONFIG.BASE_URL}${trimmed}`;
  }
  
  // Relative path starting with uploads/ (no leading slash)
  if (trimmed.startsWith('uploads/')) {
    return `${API_CONFIG.BASE_URL}/${trimmed}`;
  }
  
  // Handle properties/{propertyId}/ path format (from moderation API)
  // Format: properties/74/img_1704067200_65a1b2c3d4e5f.jpg
  if (trimmed.startsWith('properties/')) {
    return `${API_CONFIG.UPLOAD_BASE_URL}/${trimmed}`;
  }
  
  // Handle /properties/{propertyId}/ path format (with leading slash)
  if (trimmed.startsWith('/properties/')) {
    return `${API_CONFIG.UPLOAD_BASE_URL}${trimmed}`;
  }
  
  // Backend should normalize all URLs, so this shouldn't happen
  // But handle it gracefully - try to construct URL
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    // Looks like a path, try to construct URL
    const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    // Check if it's a properties path
    if (cleanPath.startsWith('properties/')) {
      return `${API_CONFIG.UPLOAD_BASE_URL}/${cleanPath}`;
    }
    return `${API_CONFIG.BASE_URL}/${cleanPath}`;
  }
  
  // Unexpected format
  console.warn('[fixImageUrl] Unexpected URL format:', trimmed);
  return null;
};

/**
 * Check if an image URL is valid
 * @param url Image URL to validate
 * @returns true if URL is valid, false otherwise
 */
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  // Reject base64 data URIs (backend should convert these to file URLs)
  if (url.includes('data:image/') || url.includes(';base64,')) {
    console.warn('[isValidImageUrl] Rejected base64 data URI:', url.substring(0, 100) + '...');
    return false;
  }
  
  // Reject URLs that contain base64 data URI patterns (even if embedded in a path)
  if (url.includes('/data:image/') || url.match(/data:image\/[^;]+;base64/)) {
    console.warn('[isValidImageUrl] Rejected URL containing base64 pattern:', url.substring(0, 100) + '...');
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') &&
           url.startsWith('http');
  } catch {
    return false;
  }
};

/**
 * Get full image URL from backend (alias for fixImageUrl)
 * Returns placeholder if URL is invalid
 * @param imagePath Relative or absolute image path
 * @returns Full image URL or placeholder
 */
export const getImageUrl = (imagePath: string | null | undefined): string => {
  const fixed = fixImageUrl(imagePath);
  return fixed || 'https://via.placeholder.com/400x300?text=No+Image';
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
 * Property Image type (matches website format)
 */
export interface PropertyImage {
  id: number;
  url: string;
  alt: string;
}

/**
 * Validate and process property images array
 * Converts array of strings/objects to standardized PropertyImage objects
 * Filters out invalid URLs and ensures all URLs are absolute
 * 
 * @param images Array of image URLs (strings) or image objects from API
 * @param propertyTitle Title of the property (for alt text)
 * @param coverImage Fallback cover image URL if images array is empty
 * @returns Array of validated PropertyImage objects
 */
export const validateAndProcessPropertyImages = (
  images: any[] | null | undefined,
  propertyTitle: string = 'Property',
  coverImage?: string | null | undefined
): PropertyImage[] => {
  const propertyImages: PropertyImage[] = [];
  
  console.log('[validateAndProcessPropertyImages] Input:', {
    imagesType: typeof images,
    isArray: Array.isArray(images),
    imagesLength: Array.isArray(images) ? images.length : 0,
    images: images,
    coverImage: coverImage,
  });
  
  // Primary: Process images array
  if (Array.isArray(images) && images.length > 0) {
    console.log(`[validateAndProcessPropertyImages] Processing ${images.length} images`);
    
    images.forEach((img: any, idx: number) => {
      let imageUrl: string | null = null;
      let rawValue: any = null;
      
      // Handle string URLs (primary format from backend)
      if (typeof img === 'string') {
        rawValue = img;
        const trimmed = img.trim();
        if (trimmed && trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
          imageUrl = fixImageUrl(trimmed);
          console.log(`[validateAndProcessPropertyImages] Image ${idx + 1} (string):`, {
            raw: trimmed,
            fixed: imageUrl,
            isValid: !!imageUrl,
          });
        } else {
          console.warn(`[validateAndProcessPropertyImages] Image ${idx + 1} empty/invalid string:`, trimmed);
        }
      }
      // Handle object format (if backend returns objects)
      else if (typeof img === 'object' && img !== null) {
        rawValue = img;
        const url = img.url || img.image_url || img.src || img.path || img.image || '';
        if (url && typeof url === 'string') {
          const trimmed = url.trim();
          if (trimmed && trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
            imageUrl = fixImageUrl(trimmed);
            console.log(`[validateAndProcessPropertyImages] Image ${idx + 1} (object):`, {
              raw: trimmed,
              fixed: imageUrl,
              isValid: !!imageUrl,
            });
          } else {
            console.warn(`[validateAndProcessPropertyImages] Image ${idx + 1} empty/invalid URL in object:`, url);
          }
        } else {
          console.warn(`[validateAndProcessPropertyImages] Image ${idx + 1} no URL found in object:`, img);
        }
      } else {
        console.warn(`[validateAndProcessPropertyImages] Image ${idx + 1} unexpected type:`, typeof img, img);
      }
      
      // Only include if we have a valid URL
      if (imageUrl) {
        propertyImages.push({
          id: idx + 1,
          url: imageUrl,
          alt: propertyTitle || `Property image ${idx + 1}`
        });
        console.log(`[validateAndProcessPropertyImages] ✅ Added image ${idx + 1}:`, imageUrl);
      } else {
        console.warn(`[validateAndProcessPropertyImages] ❌ Skipped image ${idx + 1} - invalid URL:`, rawValue);
      }
    });
  } else {
    console.log('[validateAndProcessPropertyImages] No images array or empty array');
  }
  
  // Fallback: Use cover_image if no images array found
  if (propertyImages.length === 0 && coverImage) {
    console.log('[validateAndProcessPropertyImages] Using fallback cover_image:', coverImage);
    const coverImageUrl = fixImageUrl(coverImage);
    if (coverImageUrl) {
      propertyImages.push({
        id: 1,
        url: coverImageUrl,
        alt: propertyTitle || 'Property image'
      });
      console.log('[validateAndProcessPropertyImages] ✅ Added cover_image:', coverImageUrl);
    } else {
      console.warn('[validateAndProcessPropertyImages] ❌ Cover image invalid URL:', coverImage);
    }
  }
  
  console.log(`[validateAndProcessPropertyImages] Final result: ${propertyImages.length} valid images`);
  console.log('[validateAndProcessPropertyImages] Images:', propertyImages.map(img => ({id: img.id, url: img.url})));
  
  return propertyImages;
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

