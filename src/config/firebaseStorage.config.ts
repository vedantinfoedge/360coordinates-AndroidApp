/**
 * Firebase Storage Configuration
 * Feature flag to enable/disable Firebase Storage for property images
 */

// Set to true to use Firebase Storage (upload to Firebase → backend moderation)
// Set to false to use existing backend storage flow
export const USE_FIREBASE_STORAGE = true; // Enabled - uploads to Firebase Storage

// Firebase Storage settings
export const FIREBASE_STORAGE_CONFIG = {
  // Enable Firebase Storage for property images
  enabled: USE_FIREBASE_STORAGE,
  
  // Compression settings
  compress: true,
  quality: 0.8, // 0-1
  maxWidth: 1920,
  maxHeight: 1920,
  maxSizeMB: 5,
  
  // Upload settings
  maxImages: 10,
  enableProgressTracking: true,
};
