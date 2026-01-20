# Firebase Cloud Storage Integration Guide

## Overview

This guide documents the React Native Firebase Storage integration for property images. The implementation provides a hybrid approach that maintains your existing moderation workflow while adding Firebase Storage capabilities.

## Architecture

### Current Flow (Backend Storage)
```
Image → Moderation API → Backend Storage → Database
```

### New Flow (Firebase Storage - Optional)
```
Image → Moderation API → (If Approved) → Firebase Storage → Database
```

## Setup Steps

### 1. Firebase Console Setup ✅

**Storage Configuration:**
- Go to Firebase Console → Storage
- Click "Get Started"
- Select "Start in production mode"
- Choose location: **asia-south1 (Mumbai)** (closest to India)
- Wait for initialization (~30 seconds)

**Security Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Property images - anyone can read, authenticated users can upload
    match /properties/{propertyId}/{allPaths=**} {
      allow read: if true; // Public read for website/app
      allow write: if request.auth != null // Must be logged in to upload
                   && request.resource.size < 5 * 1024 * 1024 // Max 5MB per image
                   && request.resource.contentType.matches('image/.*'); // Only images
    }
    
    // Chat images (if needed later)
    match /chat/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 3 * 1024 * 1024;
    }
  }
}
```

### 2. Android Configuration ✅

**Already Configured:**
- ✅ `google-services.json` in `android/app/`
- ✅ Firebase BOM in `build.gradle`
- ✅ `@react-native-firebase/storage` package installed
- ✅ Google Services plugin applied

**No Additional Changes Needed:**
React Native Firebase handles native dependencies automatically through autolinking.

### 3. React Native Implementation ✅

**Files Created:**
- `src/services/firebaseStorage.service.ts` - Firebase Storage service
- `src/utils/imageCompression.ts` - Image compression utilities
- Updated `src/services/moderation.service.ts` - Added Firebase Storage option

## Usage

### Option 1: Use Existing Backend Storage (Default)

```typescript
import {moderationService} from '../services/moderation.service';

// Current flow - uploads to backend storage
const result = await moderationService.uploadWithModeration(
  imageUri,
  propertyId,
  false, // validateOnly
);
```

### Option 2: Use Firebase Storage After Moderation

```typescript
import {moderationService} from '../services/moderation.service';

// Hybrid flow - moderation via backend, storage via Firebase
const result = await moderationService.uploadWithModerationAndFirebase(
  imageUri,
  propertyId,
  false, // validateOnly
  true, // useFirebaseStorage
);
```

### Option 3: Direct Firebase Storage Upload (Skip Moderation)

```typescript
import {uploadImageToFirebase} from '../services/firebaseStorage.service';

// Direct upload to Firebase (no moderation)
const result = await uploadImageToFirebase(imageUri, {
  propertyId: '123',
  compress: true,
  quality: 0.8,
  maxSizeMB: 5,
  onProgress: (progress) => {
    console.log(`Upload: ${progress.progress}%`);
  },
});

if (result.success) {
  console.log('Image URL:', result.downloadUrl);
}
```

### Option 4: Upload Multiple Images

```typescript
import {uploadMultipleImagesToFirebase} from '../services/firebaseStorage.service';

const results = await uploadMultipleImagesToFirebase(
  [imageUri1, imageUri2, imageUri3],
  {
    propertyId: '123',
    compress: true,
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.progress}%`);
    },
  },
);

const successfulUrls = results
  .filter(r => r.success)
  .map(r => r.downloadUrl);
```

## Integration with AddPropertyScreen

### Current Implementation

The `AddPropertyScreen.tsx` currently uses:
```typescript
moderationService.uploadWithModeration(imageUri, propertyId, validateOnly)
```

### To Enable Firebase Storage

Update the image upload logic in `AddPropertyScreen.tsx`:

```typescript
// Option 1: Add feature flag
const USE_FIREBASE_STORAGE = true; // Set via config or user preference

const result = await moderationService.uploadWithModerationAndFirebase(
  imageUri,
  propertyId,
  validateOnly,
  USE_FIREBASE_STORAGE,
);
```

## Storage Path Structure

### Properties
```
properties/{propertyId}/img_{timestamp}_{randomId}.jpg
```

Example:
```
properties/123/img_1704067200_abc123def456.jpg
```

### Chat Images
```
chat/{userId}/{messageId}/img_{timestamp}_{randomId}.jpg
```

## Image Compression

The service automatically compresses images before upload:
- **Max Resolution:** 1920x1920px
- **Quality:** 80% (0.8)
- **Max Size:** 5MB
- **Format:** JPEG (converted from PNG/WebP if needed)

### Optional: Enhanced Compression

For better compression, install `react-native-image-resizer`:

```bash
npm install react-native-image-resizer
cd ios && pod install && cd ..
```

The service will automatically use it if available.

## Error Handling

### Firebase Storage Unavailable

If Firebase Storage is not available (e.g., not properly linked), the service will:
1. Return an error with a clear message
2. Fall back to backend storage (if using hybrid approach)

### Upload Failures

```typescript
const result = await uploadImageToFirebase(imageUri, options);

if (!result.success) {
  console.error('Upload failed:', result.error);
  // Handle error (show user message, retry, etc.)
}
```

## Progress Tracking

```typescript
const result = await uploadImageToFirebase(imageUri, {
  propertyId: '123',
  onProgress: (progress) => {
    const percent = Math.round(progress.progress);
    console.log(`Upload: ${percent}%`);
    // Update UI progress bar
    setUploadProgress(percent);
  },
});
```

## Deleting Images

```typescript
import {deleteImageFromFirebase} from '../services/firebaseStorage.service';

const result = await deleteImageFromFirebase(downloadUrl);

if (result.success) {
  console.log('Image deleted successfully');
} else {
  console.error('Delete failed:', result.error);
}
```

## Migration Strategy

### Phase 1: Testing (Current)
- Keep existing backend storage as default
- Test Firebase Storage with feature flag
- Monitor upload success rates and performance

### Phase 2: Gradual Rollout
- Enable Firebase Storage for new properties
- Keep backend storage for existing properties
- Monitor costs and performance

### Phase 3: Full Migration
- Switch all new uploads to Firebase Storage
- Migrate existing images (optional)
- Deprecate backend storage endpoint

## Cost Considerations

### Firebase Storage Pricing (as of 2024)
- **Storage:** $0.026/GB/month
- **Download:** $0.12/GB (first 1GB free/day)
- **Upload:** Free

### Estimated Costs (1000 properties, 5 images each)
- **Storage:** ~25GB = $0.65/month
- **Download:** ~50GB/month = $6/month (after free tier)
- **Total:** ~$6.65/month

## Security Best Practices

1. **Authentication Required:** Only authenticated users can upload
2. **File Size Limits:** 5MB max per image
3. **Content Type Validation:** Only images allowed
4. **Public Read:** Images are publicly readable (for website/app display)
5. **Consider Adding:** User ownership validation in security rules

### Enhanced Security Rules (Optional)

```javascript
match /properties/{propertyId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/.*')
               && request.auth.uid == resource.metadata.userId; // User ownership
}
```

## Troubleshooting

### Issue: "Firebase Storage is not available"

**Solution:**
1. Rebuild the app: `cd android && ./gradlew clean && cd .. && npm run android`
2. Verify `google-services.json` is in `android/app/`
3. Check Firebase Storage is enabled in Firebase Console

### Issue: "Permission denied"

**Solution:**
1. Check Firebase Storage security rules
2. Verify user is authenticated
3. Check file size and content type

### Issue: "Upload timeout"

**Solution:**
1. Check network connection
2. Reduce image size/quality
3. Implement retry logic

## Testing

### Test Firebase Storage Availability

```typescript
import {isFirebaseStorageAvailable} from '../services/firebaseStorage.service';

if (isFirebaseStorageAvailable()) {
  console.log('Firebase Storage is ready');
} else {
  console.log('Firebase Storage not available - using backend storage');
}
```

### Test Upload

```typescript
// Test single image upload
const testUri = 'file:///path/to/test-image.jpg';
const result = await uploadImageToFirebase(testUri, {
  propertyId: 'test-123',
  onProgress: (p) => console.log(`${p.progress}%`),
});

console.log('Test result:', result);
```

## Next Steps

1. ✅ Firebase Storage service created
2. ✅ Image compression utilities added
3. ✅ Moderation service updated
4. ⏳ Test with real images
5. ⏳ Add feature flag to AddPropertyScreen
6. ⏳ Monitor performance and costs
7. ⏳ Gradual rollout to production

## Support

For issues or questions:
- Check Firebase Console for storage usage and errors
- Review React Native Firebase documentation: https://rnfirebase.io/storage/usage
- Check app logs for detailed error messages
