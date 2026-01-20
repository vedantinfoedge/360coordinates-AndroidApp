# Firebase Storage Upload Issues - Checklist

## ✅ What Was Fixed

1. **Enabled Firebase Storage** - `USE_FIREBASE_STORAGE = true`
2. **Integrated into AddPropertyScreen** - Firebase upload flow added
3. **Added Error Handling** - Better error messages and fallback
4. **Added Image Error Handling** - Placeholder for failed image loads

## 🔍 Why Images Might Not Be Uploading to Firebase

### Most Likely Issue #1: Backend API Doesn't Support `firebase_url`

**Problem:**
The backend `/images/moderate-and-upload.php` might not accept `firebase_url` parameter. It might only accept file uploads via `image` field.

**How to Check:**
Look for this error in console:
```
[ImageUpload] Moderation failed: 400 - ...
```

**Solution:**
Update backend API to:
1. Accept `firebase_url` parameter (string)
2. Download image from Firebase URL using `file_get_contents()` or cURL
3. Run moderation on downloaded image
4. Store Firebase URL in database

**Backend Code Example:**
```php
// In moderate-and-upload.php
if (isset($_POST['firebase_url'])) {
    // Download from Firebase
    $firebaseUrl = $_POST['firebase_url'];
    $imageData = file_get_contents($firebaseUrl);
    
    // Save temporarily for moderation
    $tempFile = tempnam(sys_get_temp_dir(), 'firebase_img_');
    file_put_contents($tempFile, $imageData);
    
    // Run moderation on temp file
    // ... moderation code ...
    
    // Store Firebase URL in database (not backend URL)
    // ... database code ...
}
```

### Most Likely Issue #2: Firebase Storage Not Available

**Problem:**
Firebase Storage native module not linked or not initialized.

**How to Check:**
Look for this in console:
```
[AddProperty] Using backend storage (Firebase disabled or not available)
```

**Solution:**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### Most Likely Issue #3: User Not Authenticated

**Problem:**
`user?.id` is undefined, so Firebase upload doesn't start.

**How to Check:**
Look for this in console:
```
[AddProperty] Using backend storage (Firebase disabled or user not available)
```

**Solution:**
- Ensure user is logged in
- Check `useAuth()` returns valid user
- Verify `user.id` exists

### Most Likely Issue #4: Firebase Storage Not Enabled in Console

**Problem:**
Firebase Storage not enabled in Firebase Console.

**How to Check:**
- Go to Firebase Console → Storage
- Check if Storage is enabled
- Check if location is set

**Solution:**
1. Enable Storage in Firebase Console
2. Set location to Mumbai (asia-south1)
3. Configure security rules

## 🧪 Quick Test

Add this to your AddPropertyScreen to test:

```typescript
import {diagnoseFirebaseStorage} from '../../utils/firebaseStorageDiagnostics';

// In component, add useEffect:
useEffect(() => {
  if (USE_FIREBASE_STORAGE) {
    diagnoseFirebaseStorage().then(result => {
      console.log('🔍 Firebase Storage Diagnostic:', result);
      if (!result.available) {
        Alert.alert(
          'Firebase Storage Issue',
          result.error || 'Firebase Storage is not available',
          [{text: 'OK'}]
        );
      }
    });
  }
}, []);
```

## 📊 Current Status

**Configuration:**
- ✅ `USE_FIREBASE_STORAGE = true` (enabled)
- ✅ Integration added to AddPropertyScreen
- ✅ Error handling improved
- ⚠️ Backend API might not support `firebase_url` parameter

**Next Steps:**
1. **Test upload** - Try uploading an image and check console logs
2. **Check backend** - Verify backend accepts `firebase_url`
3. **Update backend** - If needed, update backend to download from Firebase URLs
4. **Monitor logs** - Watch for specific error messages

## 🔧 Debugging Steps

1. **Check Console Logs:**
   - Look for `[AddProperty] Using Firebase Storage for upload`
   - Look for `[FirebaseStorage] Upload successful`
   - Look for `[ImageUpload] Moderation API response`

2. **Check Firebase Console:**
   - Go to Storage → Files
   - Check if files appear in `properties/temp/{userId}/` or `properties/{propertyId}/`

3. **Check Backend:**
   - Verify backend receives `firebase_url` parameter
   - Check backend logs for errors
   - Verify backend can download from Firebase URLs

4. **Test Manually:**
   - Use diagnostic function
   - Test Firebase upload directly
   - Check network tab for API calls

## 💡 Most Common Issue

**The backend API likely doesn't support `firebase_url` parameter yet.**

The backend `/images/moderate-and-upload.php` probably expects:
- `image` (file upload via FormData)

But we're sending:
- `firebase_url` (string URL)

**You need to update the backend API to:**
1. Accept `firebase_url` parameter
2. Download image from Firebase URL
3. Run moderation on downloaded image
4. Store Firebase URL (not backend URL) in database

See `FIREBASE_STORAGE_DEBUG_GUIDE.md` for detailed debugging steps.
