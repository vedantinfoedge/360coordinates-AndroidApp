# Firebase Storage Debug Guide

## 🔍 How to Debug Firebase Storage Upload Issues

### Step 1: Check Console Logs

When you upload an image, look for these logs in order:

#### ✅ Expected Logs (Success Flow):
```
[AddProperty] Using Firebase Storage for upload
[ImageUpload] Step 1: Uploading to Firebase Storage...
[FirebaseStorage] Uploading image: {...}
[FirebaseStorage] Upload successful: {...}
[ImageUpload] Image uploaded to Firebase: https://...
[ImageUpload] Step 2: Sending Firebase URL to backend for moderation...
[ImageUpload] Sending to moderation API: {...}
[ImageUpload] Moderation API response: {...}
[ImageUpload] Upload and moderation successful: {...}
```

#### ❌ Error Logs to Look For:

**Error 1: Firebase Storage Not Available**
```
[AddProperty] Using backend storage (Firebase disabled or not available)
```
**Fix:** Rebuild app or check Firebase configuration

**Error 2: Firebase Upload Failed**
```
[ImageUpload] Firebase upload failed: ...
[FirebaseStorage] Upload error: ...
```
**Fix:** Check Firebase Storage is enabled in Console, verify security rules

**Error 3: Backend Moderation Failed**
```
[ImageUpload] Moderation failed: 400/404/500
```
**Fix:** Backend API might not accept `firebase_url` parameter - needs backend update

**Error 4: User Not Authenticated**
```
Authentication token not found
```
**Fix:** Ensure user is logged in

### Step 2: Test Firebase Storage Availability

Add this to your component to test:

```typescript
import {diagnoseFirebaseStorage} from '../utils/firebaseStorageDiagnostics';

// In component
useEffect(() => {
  const testFirebase = async () => {
    const result = await diagnoseFirebaseStorage();
    console.log('Firebase Storage Diagnostic:', result);
    if (!result.available) {
      Alert.alert('Firebase Storage Unavailable', result.error);
    }
  };
  
  if (USE_FIREBASE_STORAGE) {
    testFirebase();
  }
}, []);
```

### Step 3: Check What's Actually Happening

When you upload an image, check:

1. **Is Firebase Storage being used?**
   - Look for: `[AddProperty] Using Firebase Storage for upload`
   - If you see: `[AddProperty] Using backend storage` → Firebase is disabled/not available

2. **Does Firebase upload succeed?**
   - Look for: `[FirebaseStorage] Upload successful`
   - If you see: `[FirebaseStorage] Upload error` → Check error message

3. **Does backend accept Firebase URL?**
   - Look for: `[ImageUpload] Moderation API response`
   - Check status code: 200 = success, 400/404/500 = backend issue

### Step 4: Common Issues & Solutions

#### Issue: "Firebase Storage enabled but not available"
**Logs:**
```
[AddProperty] Firebase Storage enabled but not available, falling back to backend storage
```

**Solution:**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

#### Issue: "Firebase upload failed: Permission denied"
**Logs:**
```
[FirebaseStorage] Upload error: Permission denied
```

**Solution:**
1. Check Firebase Console → Storage → Rules
2. Verify user is authenticated
3. Check security rules allow authenticated uploads

#### Issue: "Moderation failed: 400"
**Logs:**
```
[ImageUpload] Moderation failed: 400 - ...
```

**Possible Causes:**
- Backend API doesn't accept `firebase_url` parameter
- Backend expects `image` (file) instead of `firebase_url` (URL string)
- Backend needs to be updated to download from Firebase URL

**Solution:**
- Check backend `/images/moderate-and-upload.php` accepts `firebase_url`
- Backend should download image from Firebase URL for moderation
- If backend doesn't support it, you need to update backend API

### Step 5: Verify Backend API Support

The backend API needs to:
1. Accept `firebase_url` parameter (string, not file)
2. Download image from Firebase URL
3. Run moderation on downloaded image
4. Store Firebase URL in database

**Backend API Expected Format:**
```php
// Backend should accept:
$_POST['firebase_url'] = 'https://firebasestorage.googleapis.com/...';
$_POST['property_id'] = '123'; // or
$_POST['validate_only'] = 'true';

// Backend should:
// 1. Download image from Firebase URL
// 2. Run Google Vision API moderation
// 3. Return moderation status
// 4. Store Firebase URL in database
```

### Step 6: Manual Test

Test Firebase Storage directly:

```typescript
import {uploadPropertyImageToFirebase} from '../services/firebaseStorageProperty.service';
import {diagnoseFirebaseStorage} from '../utils/firebaseStorageDiagnostics';

// Test 1: Check availability
const diagnostic = await diagnoseFirebaseStorage();
console.log('Diagnostic:', diagnostic);

// Test 2: Try upload
try {
  const result = await uploadPropertyImageToFirebase(
    'file:///path/to/test-image.jpg',
    'test-user-id',
    null,
    (progress) => console.log(`Progress: ${progress}%`)
  );
  console.log('Upload successful:', result.url);
} catch (error) {
  console.error('Upload failed:', error);
}
```

## 📋 Quick Checklist

- [ ] `USE_FIREBASE_STORAGE = true` in config
- [ ] User is logged in (`user?.id` exists)
- [ ] Firebase Storage enabled in Firebase Console
- [ ] Security rules configured
- [ ] App rebuilt after Firebase setup
- [ ] Console shows "Using Firebase Storage for upload"
- [ ] Firebase upload succeeds (check logs)
- [ ] Backend API accepts `firebase_url` parameter
- [ ] Backend moderation succeeds

## 🐛 If Images Still Don't Upload

1. **Check console logs** - Look for error messages
2. **Run diagnostic** - Use `diagnoseFirebaseStorage()`
3. **Check Firebase Console** - Verify files appear in Storage
4. **Check backend logs** - Verify API receives `firebase_url`
5. **Test manually** - Use test function above

The most common issue is that the **backend API doesn't support `firebase_url` parameter yet** and needs to be updated to download images from Firebase URLs.
