/**
 * Firebase Storage Configuration
 * Property image workflow: Device → Firebase Storage → backend receives URL for moderation only; images stored in Firebase.
 */

// Set to true to use Firebase Storage (required for correct workflow: upload to Firebase, backend gets URL for moderation)
export const USE_FIREBASE_STORAGE = true;

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
