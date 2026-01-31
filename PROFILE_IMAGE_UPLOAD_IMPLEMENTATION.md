# Profile Image Upload — Firebase Storage Implementation

## Overview
Profile image upload now follows the same Firebase Storage pattern as property images:
**Firebase Storage → Backend API**

## Implementation Details

### 1. Firebase Storage Function
**File:** `src/services/firebaseStorageProperty.service.ts`

Added `uploadProfileImageToFirebase()` function:
- Uploads profile images to Firebase Storage at path: `profiles/{userId}/{filename}`
- Supports progress tracking
- Returns Firebase download URL and storage path

```typescript
const result = await uploadProfileImageToFirebase(
  imageUri,
  userId,
  onProgress, // optional
);
```

### 2. Profile Image Upload Service
**File:** `src/services/profileImageUpload.service.ts`

New service that handles the complete flow:
- Checks if Firebase Storage is enabled (`USE_FIREBASE_STORAGE`)
- Uploads to Firebase Storage first
- Sends Firebase URL to backend API (`/upload/profile-image.php`)
- Falls back to direct backend upload if Firebase Storage is unavailable

```typescript
import {uploadProfileImageWithFirebase} from './services/profileImageUpload.service';

const result = await uploadProfileImageWithFirebase(
  imageUri,
  userId,
  onProgress, // optional
);
```

### 3. Updated User Service
**File:** `src/services/user.service.ts`

Updated `uploadProfileImage()` to use Firebase Storage flow:
- Automatically gets user ID from AsyncStorage
- Uses `uploadProfileImageWithFirebase()` internally
- Maintains backward compatibility (same return format)
- Updates cached user data after successful upload

```typescript
// Existing usage still works:
const response = await userService.uploadProfileImage(imageUri);

// New: with progress tracking
const response = await userService.uploadProfileImage(imageUri, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});
```

## Usage in Profile Screens

All existing profile screens work without changes:
- `SellerProfileScreen.tsx`
- `BuyerProfileScreen.tsx`
- `BuilderProfileScreen.tsx`
- `AgentProfileScreen.tsx`

The function signature is backward compatible - existing calls continue to work.

## Configuration

Firebase Storage is controlled by the same flag as property images:
**File:** `src/config/firebaseStorage.config.ts`

```typescript
export const USE_FIREBASE_STORAGE = true; // Enable Firebase Storage
```

## Flow Diagram

```
User selects image
    ↓
uploadProfileImage() called
    ↓
Get userId from AsyncStorage
    ↓
uploadProfileImageWithFirebase()
    ↓
┌─────────────────────────────────┐
│ Firebase Storage Enabled?        │
└─────────────────────────────────┘
    ↓ YES                          ↓ NO
Upload to Firebase                 Direct backend upload
    ↓                              ↓
Get Firebase URL                   FormData upload
    ↓                              ↓
Send Firebase URL to backend       Return result
    ↓                              ↓
Backend processes & stores         ───┘
    ↓
Update cached user data
    ↓
Return success
```

## Backend API

The backend endpoint `/upload/profile-image.php` should accept:
- `firebase_url` parameter (when using Firebase Storage)
- `file` parameter (when using direct upload fallback)

## Benefits

1. **Consistent Pattern**: Same Firebase → Backend flow as property images
2. **Progress Tracking**: Optional progress callback support
3. **Automatic Fallback**: Falls back to direct upload if Firebase unavailable
4. **Backward Compatible**: Existing code continues to work
5. **Error Handling**: Comprehensive error messages

## Testing

1. **With Firebase Storage Enabled:**
   - Upload should go to Firebase Storage first
   - Check Firebase Console → Storage → `profiles/{userId}/`
   - Backend should receive Firebase URL

2. **With Firebase Storage Disabled:**
   - Upload should go directly to backend
   - Same behavior as before

3. **Progress Tracking:**
   - Pass progress callback to see upload progress
   - Useful for showing progress indicators in UI

## Notes

- Profile images are stored at: `profiles/{userId}/{filename}`
- Property images are stored at: `properties/{propertyId}/{filename}` or `properties/temp/{userId}/{filename}`
- Both use the same Firebase Storage instance
- Both follow the same Firebase → Backend pattern
