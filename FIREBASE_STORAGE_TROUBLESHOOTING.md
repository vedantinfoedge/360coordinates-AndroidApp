# Firebase Storage Troubleshooting Guide

## ✅ What Was Fixed

1. **Enabled Firebase Storage** - Changed `USE_FIREBASE_STORAGE = true` in config
2. **Integrated into AddPropertyScreen** - Added Firebase Storage upload flow
3. **Added Error Handling** - Better error messages and availability checks
4. **Added Fallback** - Automatically falls back to backend storage if Firebase unavailable

## 🔍 Why Images Might Not Be Uploading

### Issue 1: Firebase Storage Not Available (Most Common)

**Symptoms:**
- No Firebase Storage logs in console
- Error: "Firebase Storage is not available"
- Images fall back to backend storage

**Solution:**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

**Check:**
- Verify `google-services.json` is in `android/app/`
- Check Firebase Storage is enabled in Firebase Console
- Verify `@react-native-firebase/storage` is installed

### Issue 2: Firebase Storage Not Enabled in Console

**Symptoms:**
- Error: "Permission denied" or "Storage not found"
- Upload fails immediately

**Solution:**
1. Go to Firebase Console → Storage
2. Click "Get Started" if not already enabled
3. Select location: **asia-south1 (Mumbai)**
4. Configure security rules (see below)

### Issue 3: Security Rules Not Configured

**Symptoms:**
- Error: "Permission denied"
- Upload fails with 403 error

**Solution:**
Update Firebase Storage security rules in Firebase Console:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /properties/{propertyId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    match /properties/temp/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### Issue 4: User Not Authenticated

**Symptoms:**
- Error: "Authentication token not found"
- Firebase upload doesn't start

**Solution:**
- Ensure user is logged in
- Check `user?.id` is available
- Verify auth token in AsyncStorage

### Issue 5: Backend API Not Accepting Firebase URLs

**Symptoms:**
- Firebase upload succeeds
- Backend moderation fails
- Error from moderation API

**Solution:**
- Ensure backend `/images/moderate-and-upload.php` accepts `firebase_url` parameter
- Backend should download image from Firebase URL for moderation
- Check backend logs for errors

## 🧪 Testing Steps

### Step 1: Check Firebase Storage Availability

Add this to your component to test:

```typescript
import {isFirebaseStorageAvailable} from '../../services/firebaseStorageProperty.service';

// In component
useEffect(() => {
  if (USE_FIREBASE_STORAGE) {
    const available = isFirebaseStorageAvailable();
    console.log('Firebase Storage available:', available);
    if (!available) {
      Alert.alert(
        'Firebase Storage Unavailable',
        'Please rebuild the app to enable Firebase Storage.'
      );
    }
  }
}, []);
```

### Step 2: Check Console Logs

When uploading an image, you should see:

```
[AddProperty] Using Firebase Storage for upload
[ImageUpload] Step 1: Uploading to Firebase Storage...
[FirebaseStorage] Uploading image: {...}
[FirebaseStorage] Upload successful: {...}
[ImageUpload] Image uploaded to Firebase: https://...
[ImageUpload] Step 2: Sending Firebase URL to backend for moderation...
[ImageUpload] Upload and moderation successful: {...}
```

### Step 3: Check Firebase Console

1. Go to Firebase Console → Storage
2. Check if files appear in `properties/temp/{userId}/` or `properties/{propertyId}/`
3. Verify file sizes and names

### Step 4: Check Network Tab

- Verify Firebase upload request succeeds
- Check backend moderation API call
- Look for any 403/404/500 errors

## 📋 Checklist

- [ ] Firebase Storage enabled in Firebase Console
- [ ] Security rules configured
- [ ] `google-services.json` in `android/app/`
- [ ] `@react-native-firebase/storage` installed
- [ ] App rebuilt after Firebase setup
- [ ] User is authenticated (`user?.id` exists)
- [ ] `USE_FIREBASE_STORAGE = true` in config
- [ ] Backend API accepts `firebase_url` parameter
- [ ] Network connection is active
- [ ] Firebase Storage location set to Mumbai (asia-south1)

## 🔧 Quick Fixes

### Fix 1: Rebuild App
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### Fix 2: Check Config
```typescript
// src/config/firebaseStorage.config.ts
export const USE_FIREBASE_STORAGE = true; // Must be true
```

### Fix 3: Verify User
```typescript
// In AddPropertyScreen
const {user} = useAuth();
console.log('User ID:', user?.id); // Should not be undefined
```

### Fix 4: Test Firebase Storage Directly
```typescript
import {uploadPropertyImageToFirebase} from '../services/firebaseStorageProperty.service';

// Test upload
try {
  const result = await uploadPropertyImageToFirebase(
    'file:///path/to/image.jpg',
    'test-user-id',
    null
  );
  console.log('Test upload successful:', result.url);
} catch (error) {
  console.error('Test upload failed:', error);
}
```

## 📊 Current Implementation Status

✅ **Feature Flag:** Enabled (`USE_FIREBASE_STORAGE = true`)
✅ **Integration:** Added to AddPropertyScreen
✅ **Error Handling:** Improved with availability checks
✅ **Fallback:** Automatic fallback to backend storage
✅ **Logging:** Comprehensive console logs

## 🐛 Common Error Messages

### "Firebase Storage is not available"
- **Cause:** Native module not linked
- **Fix:** Rebuild app

### "Permission denied"
- **Cause:** Security rules or user not authenticated
- **Fix:** Check security rules, verify user is logged in

### "Firebase upload failed: [error]"
- **Cause:** Network issue, invalid file, or Firebase error
- **Fix:** Check network, verify file format, check Firebase Console

### "Authentication token not found"
- **Cause:** User not logged in
- **Fix:** Ensure user is authenticated before uploading

## 📞 Next Steps

1. **Test the upload** - Try uploading an image and check console logs
2. **Check Firebase Console** - Verify files appear in Storage
3. **Monitor errors** - Check for any error messages in console
4. **Verify backend** - Ensure backend accepts Firebase URLs

If images still don't upload, check the console logs for specific error messages and refer to the error handling section above.
