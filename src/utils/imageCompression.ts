/**
 * Image Compression Utilities for React Native
 * Compresses images before uploading to reduce file size
 */

import {Image, Platform} from 'react-native';
import {launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';

export interface CompressionOptions {
  maxWidth?: number; // Default: 1920
  maxHeight?: number; // Default: 1920
  quality?: number; // 0-1, default: 0.8
  maxSizeMB?: number; // Default: 5
}

/**
 * Get image dimensions
 */
const getImageSize = (uri: string): Promise<{width: number; height: number}> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => {
        resolve({width, height});
      },
      error => {
        reject(error);
      },
    );
  });
};

/**
 * Calculate new dimensions maintaining aspect ratio
 */
const calculateDimensions = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): {width: number; height: number} => {
  if (width <= maxWidth && height <= maxHeight) {
    return {width, height};
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

/**
 * Compress image for upload
 * 
 * Note: React Native doesn't have built-in image compression.
 * This function uses react-native-image-picker's built-in compression
 * or returns the original URI if compression isn't available.
 * 
 * For better compression, consider using:
 * - react-native-image-resizer
 * - react-native-image-crop-picker (already using react-native-image-picker)
 * 
 * @param imageUri Local image URI
 * @param options Compression options
 * @returns Compressed image URI (or original if compression fails)
 */
export const compressImageForUpload = async (
  imageUri: string,
  options: CompressionOptions = {},
): Promise<string> => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    maxSizeMB = 5,
  } = options;

  try {
    // Get original image dimensions
    const {width, height} = await getImageSize(imageUri);
    
    // Check if resizing is needed
    const needsResize = width > maxWidth || height > maxHeight;
    
    if (!needsResize) {
      console.log('[ImageCompression] Image dimensions OK, no resize needed:', {
        width,
        height,
      });
      return imageUri;
    }

    // Calculate new dimensions
    const newDimensions = calculateDimensions(width, height, maxWidth, maxHeight);
    
    console.log('[ImageCompression] Resizing image:', {
      original: {width, height},
      new: newDimensions,
    });

    // For React Native, we'll use a workaround:
    // Since react-native-image-picker doesn't support re-compression of existing images,
    // we'll return the original URI and let Firebase Storage handle it
    // OR use react-native-image-resizer if available
    
    // Check if react-native-image-resizer is available
    try {
      const ImageResizer = require('react-native-image-resizer').default;
      
      if (ImageResizer) {
        const resizedUri = await ImageResizer.createResizedImage(
          imageUri,
          newDimensions.width,
          newDimensions.height,
          'JPEG',
          quality * 100, // Convert 0-1 to 0-100
          0, // rotation
          undefined, // outputPath
          false, // keepMeta
          {
            mode: 'contain',
            onlyScaleDown: true,
          },
        );
        
        console.log('[ImageCompression] Image resized successfully:', {
          original: imageUri.substring(0, 50),
          resized: resizedUri.uri.substring(0, 50),
        });
        
        return resizedUri.uri;
      }
    } catch (resizerError) {
      console.warn('[ImageCompression] react-native-image-resizer not available:', resizerError);
    }

    // Fallback: Return original URI
    // Firebase Storage will handle the upload, but file size might be larger
    console.warn('[ImageCompression] Using original image (no compression library available)');
    return imageUri;
  } catch (error) {
    console.error('[ImageCompression] Compression error:', error);
    // Return original URI on error
    return imageUri;
  }
};

/**
 * Estimate file size from image dimensions
 * Rough estimation: width * height * 3 bytes (RGB) * compression ratio
 */
export const estimateFileSize = (
  width: number,
  height: number,
  quality: number = 0.8,
): number => {
  // Rough estimate: uncompressed size * quality factor
  const uncompressedSize = width * height * 3; // RGB
  const estimatedSize = uncompressedSize * quality;
  return estimatedSize;
};

/**
 * Check if image size is acceptable
 */
export const isImageSizeAcceptable = async (
  imageUri: string,
  maxSizeMB: number = 5,
): Promise<boolean> => {
  try {
    const {width, height} = await getImageSize(imageUri);
    const estimatedSize = estimateFileSize(width, height);
    const sizeMB = estimatedSize / (1024 * 1024);
    
    return sizeMB <= maxSizeMB;
  } catch {
    // If we can't determine size, assume it's acceptable
    return true;
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
