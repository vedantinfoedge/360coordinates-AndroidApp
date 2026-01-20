# Firebase Storage Implementation Guide (React Native)

This guide implements Firebase Cloud Storage for property images in the React Native app, following the same pattern as the website implementation.

## ✅ Implementation Complete

All services have been implemented according to the guide:

### 1. Firebase Configuration
- **File**: `src/config/firebase.config.ts`
- **Status**: ✅ Configured with project credentials
- **Config Values**:
  ```typescript
  apiKey: "AIzaSyBjD9KHuVjUNSvPpa6y-pElD7lIElCiXmE"
  authDomain: "my-chat-box-ec5b0.firebaseapp.com"
  projectId: "my-chat-box-ec5b0"
  storageBucket: "my-chat-box-ec5b0.firebasestorage.app"
  ```

### 2. Firebase Storage Service
- **File**: `src/services/firebaseStorageProperty.service.ts`
- **Status**: ✅ Implemented with enhanced logging
- **Features**:
  - Upload property images to Firebase Storage
  - Progress tracking
  - Error handling with specific error codes
  - Automatic path generation (temp vs permanent)
  - Enhanced logging with emoji indicators (🔥 ✅ ❌)

### 3. API Service (Image Upload)
- **File**: `src/services/firebaseImageUpload.service.ts`
- **Status**: ✅ Implemented according to guide
- **Features**:
  - User fetching from AsyncStorage with fallback to backend
  - Firebase upload with automatic fallback to server upload
  - Backend moderation integration
  - Unified `uploadImage()` function
  - Property update function

### 4. Usage Example
- **File**: `src/examples/FirebaseImageUploadExample.tsx`
- **Status**: ✅ Complete example component
- **Shows**:
  - Image picking with `react-native-image-picker`
  - Uploading multiple images
  - Progress tracking
  - Error handling
  - Property update

## 📦 Installed Packages

All required packages are already installed:
- ✅ `@react-native-firebase/app`
- ✅ `@react-native-firebase/storage`
- ✅ `react-native-image-picker`
- ✅ `@react-native-async-storage/async-storage`

## 🔄 Upload Flow

1. **User selects image** → Image picker returns URI
2. **Get user ID** → From AsyncStorage, fallback to backend verify token
3. **Upload to Firebase** → `uploadPropertyImageToFirebase()` uploads to Firebase Storage
4. **Send to backend** → Firebase URL sent to `/images/moderate-and-upload.php`
5. **Backend moderates** → Backend downloads from Firebase URL and runs moderation
6. **Return result** → Moderation status and Firebase URL returned

## 📝 Usage

### Basic Usage

```typescript
import {uploadImage} from '../services/firebaseImageUpload.service';

// Upload single image
const result = await uploadImage(
  imageUri,      // Local file URI
  propertyId,    // Property ID
  true          // useFirebase (default: true)
);

if (result.success) {
  console.log('Image URL:', result.data.url);
  console.log('Moderation Status:', result.data.moderation_status);
  console.log('Storage Type:', result.data.storage_type); // 'firebase' or 'server'
}
```

### In Component (Full Example)

See `src/examples/FirebaseImageUploadExample.tsx` for a complete example.

### Current Integration

The app currently uses `uploadPropertyImageWithModeration()` from `imageUpload.service.ts` in:
- `src/screens/Seller/AddPropertyScreen.tsx`
- `src/screens/Agent/AddPropertyScreen.tsx`
- `src/screens/Builder/AddPropertyScreen.tsx`

You can switch to the new `uploadImage()` function from `firebaseImageUpload.service.ts` if you prefer the guide's approach.

## 🔍 Key Differences from Website

| Aspect | Website | React Native |
|--------|---------|--------------|
| Storage | `localStorage` | `AsyncStorage` |
| File Handling | `File` objects | Image URI from picker |
| Firebase | `firebase/storage` | `@react-native-firebase/storage` |
| FormData | Standard | React Native format `{uri, type, name}` |
| Image Picker | HTML `<input>` | `react-native-image-picker` |

## 🎯 Features

### ✅ Implemented
- Firebase Storage upload with progress tracking
- Automatic user ID detection (AsyncStorage → Backend fallback)
- Backend moderation integration
- Error handling with specific error codes
- Fallback to server upload if Firebase fails
- Enhanced logging with emoji indicators
- TypeScript types and interfaces

### 🔄 Backend Requirements

The backend API `/images/moderate-and-upload.php` must:
1. Accept `firebase_url` parameter (string URL)
2. Download image from Firebase URL using `file_get_contents()` or cURL
3. Run Google Vision API moderation on downloaded image
4. Store Firebase URL in database (not backend URL)
5. Return moderation status and image metadata

**Backend Example:**
```php
if (isset($_POST['firebase_url'])) {
    $firebaseUrl = $_POST['firebase_url'];
    $imageData = file_get_contents($firebaseUrl);
    
    // Save temporarily for moderation
    $tempFile = tempnam(sys_get_temp_dir(), 'firebase_img_');
    file_put_contents($tempFile, $imageData);
    
    // Run moderation...
    // Store Firebase URL in database...
}
```

## 🐛 Troubleshooting

### Issue: "Firebase Storage not available"
**Solution**: Rebuild the app
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### Issue: "User ID not found"
**Solution**: The service will automatically:
1. Try AsyncStorage first
2. Fallback to backend verify token
3. Try alternative field names (id, user_id, ID)
4. Fallback to server upload if all fail

### Issue: "Moderation failed: 400"
**Solution**: Backend API might not accept `firebase_url` parameter. Update backend to:
- Accept `firebase_url` POST parameter
- Download image from Firebase URL
- Run moderation on downloaded image

### Issue: Images not uploading
**Check**:
1. Console logs for error messages
2. Firebase Console → Storage for files
3. Network tab for API requests
4. User authentication status

## 📚 Files Reference

- **Firebase Config**: `src/config/firebase.config.ts`
- **Firebase Service**: `src/services/firebaseStorageProperty.service.ts`
- **Upload Service**: `src/services/firebaseImageUpload.service.ts`
- **Alternative Service**: `src/services/imageUpload.service.ts` (existing)
- **Example Component**: `src/examples/FirebaseImageUploadExample.tsx`
- **Diagnostics**: `src/utils/firebaseStorageDiagnostics.ts`

## 🚀 Next Steps

1. **Test Upload**: Try uploading an image and check console logs
2. **Verify Backend**: Ensure backend accepts `firebase_url` parameter
3. **Check Firebase Console**: Verify files appear in Storage
4. **Monitor Logs**: Watch for error messages in console

## 📝 Notes

- Firebase Storage auto-initializes from `google-services.json` (Android)
- No manual Firebase initialization needed
- All services use TypeScript for type safety
- Enhanced logging helps with debugging
- Automatic fallback ensures reliability

The implementation is complete and ready to use! 🎉
