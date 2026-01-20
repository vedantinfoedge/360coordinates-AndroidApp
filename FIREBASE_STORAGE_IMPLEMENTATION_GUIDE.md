# Firebase Storage Implementation Guide

## ✅ Implementation Complete

This guide shows how to use the new Firebase Storage integration that matches your specification.

## Architecture

### New Flow (Firebase Storage)
```
Image → Firebase Storage → Backend Moderation API → Database
```

1. **Upload to Firebase Storage** - Image is uploaded to Firebase Cloud Storage
2. **Send Firebase URL to Backend** - Firebase download URL is sent to moderation API
3. **Backend Moderates** - Backend validates the image using Google Vision API
4. **Store in Database** - Backend stores the Firebase URL in database

## Files Created

### 1. `src/services/firebaseStorageProperty.service.ts`
- `uploadPropertyImageToFirebase()` - Uploads image to Firebase Storage
- `deletePropertyImageFromFirebase()` - Deletes image from Firebase Storage

### 2. `src/services/imageUpload.service.ts`
- `uploadPropertyImageWithModeration()` - Complete flow: Firebase → Backend moderation
- `uploadMultiplePropertyImagesWithModeration()` - Upload multiple images

### 3. `src/config/firebaseStorage.config.ts`
- Feature flag to enable/disable Firebase Storage
- Configuration settings

## Usage

### Step 1: Enable Firebase Storage

Edit `src/config/firebaseStorage.config.ts`:

```typescript
export const USE_FIREBASE_STORAGE = true; // Change to true
```

### Step 2: Update AddPropertyScreen

Add this import at the top:

```typescript
import {useAuth} from '../../context/AuthContext';
import {uploadPropertyImageWithModeration} from '../../services/imageUpload.service';
import {USE_FIREBASE_STORAGE} from '../../config/firebaseStorage.config';
```

Add user context:

```typescript
const AddPropertyScreen: React.FC<Props> = ({navigation}) => {
  const {user} = useAuth(); // Get user for userId
  // ... existing code
```

### Step 3: Update Image Upload Logic

Replace the moderation service call in `handleImagePicker`:

**Current code (around line 284):**
```typescript
moderationService.uploadWithModeration(img.uri, 0, true)
```

**New code (with Firebase Storage):**
```typescript
if (USE_FIREBASE_STORAGE && user?.id) {
  // Use Firebase Storage flow
  uploadPropertyImageWithModeration(
    img.uri,
    isEditMode ? propertyId : null, // propertyId or null for new properties
    user.id, // userId
    (progress) => {
      console.log(`Upload progress: ${progress}%`);
      // Update UI with progress if needed
    }
  )
    .then(result => {
      setPhotos(prev => {
        const updated = [...prev];
        const imgIndex = prev.length - newPhotos.length + index;
        if (updated[imgIndex]) {
          let moderationStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking' = 'checking';
          
          if (result.moderationStatus === 'SAFE') {
            moderationStatus = 'APPROVED';
          } else if (result.moderationStatus === 'REJECTED' || result.moderationStatus === 'UNSAFE') {
            moderationStatus = 'REJECTED';
          } else if (result.moderationStatus === 'PENDING' || result.moderationStatus === 'NEEDS_REVIEW') {
            moderationStatus = 'PENDING';
          }
          
          updated[imgIndex] = {
            ...updated[imgIndex],
            moderationStatus,
            moderationReason: result.moderationReason || undefined,
            imageUrl: result.firebaseUrl, // Firebase URL
          };
        }
        return updated;
      });
      
      // Show alerts based on moderation status
      if (result.moderationStatus === 'SAFE') {
        // Image approved - no alert needed
      } else if (result.moderationStatus === 'REJECTED' || result.moderationStatus === 'UNSAFE') {
        Alert.alert(
          'Image Rejected',
          result.moderationReason || 'Image does not meet our guidelines.',
          [{text: 'OK'}]
        );
      } else if (result.moderationStatus === 'PENDING' || result.moderationStatus === 'NEEDS_REVIEW') {
        Alert.alert(
          'Image Under Review',
          'Your image is being reviewed and will be visible after approval.',
          [{text: 'OK'}]
        );
      }
    })
    .catch(error => {
      console.error('[AddProperty] Firebase upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image');
      
      // Remove the image from photos array on error
      setPhotos(prev => prev.filter((_, i) => i !== prev.length - newPhotos.length + index));
    });
} else {
  // Fallback to existing backend storage flow
  moderationService.uploadWithModeration(img.uri, 0, true)
    .then(result => {
      // ... existing code
    });
}
```

## Complete Integration Example

Here's a complete example for the image picker section:

```typescript
import {useAuth} from '../../context/AuthContext';
import {uploadPropertyImageWithModeration} from '../../services/imageUpload.service';
import {USE_FIREBASE_STORAGE} from '../../config/firebaseStorage.config';

const AddPropertyScreen: React.FC<Props> = ({navigation}) => {
  const {user} = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'AddProperty'>>();
  const routeParams = (route.params as any) || {};
  const isEditMode = !!routeParams.propertyId;
  const propertyId = routeParams.propertyId;
  
  // ... existing state declarations
  
  const handleImagePicker = async () => {
    // ... existing permission and limit checks
    
    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      // ... existing response handling
      
      if (response.assets && response.assets.length > 0) {
        const newPhotos = assetsToAdd.map(asset => ({
          uri: asset.uri || '',
          base64: undefined, // Not needed for Firebase flow
          moderationStatus: 'checking' as const,
          moderationReason: undefined,
          imageUrl: undefined,
        }));
        
        const updatedPhotos = [...photos, ...newPhotos];
        setPhotos(updatedPhotos);
        
        // Process each image
        newPhotos.forEach((img, index) => {
          if (img.uri && user?.id) {
            if (USE_FIREBASE_STORAGE) {
              // Firebase Storage flow
              uploadPropertyImageWithModeration(
                img.uri,
                isEditMode ? propertyId : null,
                user.id,
                (progress) => {
                  console.log(`Upload ${index + 1}: ${progress}%`);
                }
              )
                .then(result => {
                  // Update photo status
                  setPhotos(prev => {
                    const updated = [...prev];
                    const imgIndex = prev.length - newPhotos.length + index;
                    if (updated[imgIndex]) {
                      let status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking' = 'checking';
                      
                      if (result.moderationStatus === 'SAFE') status = 'APPROVED';
                      else if (result.moderationStatus === 'REJECTED' || result.moderationStatus === 'UNSAFE') status = 'REJECTED';
                      else if (result.moderationStatus === 'PENDING' || result.moderationStatus === 'NEEDS_REVIEW') status = 'PENDING';
                      
                      updated[imgIndex] = {
                        ...updated[imgIndex],
                        moderationStatus: status,
                        moderationReason: result.moderationReason || undefined,
                        imageUrl: result.firebaseUrl,
                      };
                    }
                    return updated;
                  });
                  
                  // Show alerts
                  if (result.moderationStatus === 'REJECTED' || result.moderationStatus === 'UNSAFE') {
                    Alert.alert('Image Rejected', result.moderationReason || 'Image does not meet guidelines.');
                  } else if (result.moderationStatus === 'PENDING' || result.moderationStatus === 'NEEDS_REVIEW') {
                    Alert.alert('Pending Review', 'Image is under review.');
                  }
                })
                .catch(error => {
                  console.error('Upload error:', error);
                  Alert.alert('Upload Failed', error.message);
                  setPhotos(prev => prev.filter((_, i) => i !== prev.length - newPhotos.length + index));
                });
            } else {
              // Existing backend storage flow
              moderationService.uploadWithModeration(img.uri, 0, true)
                .then(result => {
                  // ... existing code
                });
            }
          }
        });
      }
    });
  };
  
  // ... rest of component
};
```

## Backend API Requirements

Your backend moderation API (`/images/moderate-and-upload.php`) needs to accept:

**Request:**
- `firebase_url` (string) - Firebase Storage download URL
- `property_id` (optional, number) - Property ID (omit for validation-only)
- `validate_only` (optional, boolean) - If true, only validate without saving

**Response:**
```json
{
  "status": "success",
  "message": "Image uploaded successfully",
  "data": {
    "moderation_status": "SAFE" | "UNSAFE" | "PENDING" | "NEEDS_REVIEW",
    "moderation_reason": "string (optional)",
    "image_id": 123,
    "image_url": "firebase_url_or_backend_url"
  }
}
```

## Testing

### 1. Test Firebase Storage Availability

```typescript
import storage from '@react-native-firebase/storage';

try {
  const storageRef = storage().ref('test');
  console.log('✅ Firebase Storage is available');
} catch (error) {
  console.log('❌ Firebase Storage not available:', error);
  // Rebuild app: cd android && ./gradlew clean && cd .. && npm run android
}
```

### 2. Test Upload Flow

1. Enable Firebase Storage: Set `USE_FIREBASE_STORAGE = true`
2. Pick an image in AddPropertyScreen
3. Check console logs for upload progress
4. Verify image appears in Firebase Console → Storage
5. Check moderation status updates

### 3. Test Error Handling

- Test with no internet connection
- Test with invalid image
- Test with Firebase Storage disabled

## Troubleshooting

### "Firebase Storage is not available"

**Solution:**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### "Permission denied" error

**Check:**
1. Firebase Storage security rules allow authenticated uploads
2. User is logged in (has auth token)
3. File size < 5MB
4. Content type is image/*

### Images not uploading

**Check:**
1. Firebase Storage is enabled in Firebase Console
2. `google-services.json` is in `android/app/`
3. User is authenticated
4. Network connection is active

## Migration Path

### Phase 1: Testing (Current)
- Keep `USE_FIREBASE_STORAGE = false` (default)
- Test with feature flag enabled for specific users
- Monitor upload success rates

### Phase 2: Gradual Rollout
- Enable for new properties only
- Keep backend storage for existing properties
- Monitor costs and performance

### Phase 3: Full Migration
- Set `USE_FIREBASE_STORAGE = true` for all users
- Migrate existing images (optional)
- Deprecate backend storage endpoint

## Cost Considerations

### Firebase Storage Pricing
- **Storage:** $0.026/GB/month
- **Download:** $0.12/GB (first 1GB free/day)
- **Upload:** Free

### Estimated Monthly Cost (1000 properties, 5 images each)
- Storage: ~25GB = $0.65/month
- Downloads: ~50GB/month = $6/month (after free tier)
- **Total: ~$6.65/month**

## Next Steps

1. ✅ Services created
2. ✅ Configuration file created
3. ⏳ Update AddPropertyScreen (optional - can be done later)
4. ⏳ Test with real images
5. ⏳ Enable in production

## Support

For issues:
- Check Firebase Console → Storage for errors
- Review React Native Firebase docs: https://rnfirebase.io/storage/usage
- Check app logs for detailed error messages
