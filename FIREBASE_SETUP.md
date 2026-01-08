# Firebase Setup Guide

This guide explains how to set up Firebase for the Android app.

## ⚠️ Important Notes

1. **The Firebase config in `src/config/firebase.config.ts` is from the web frontend**
2. **You MUST create an Android app in Firebase Console and use Android-specific credentials**
3. **The `google-services.json` file is required for Android**

## Step 1: Create Android App in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `my-chat-box-ec5b0`
3. Click "Add app" → Select Android
4. Enter package name: `com.propertyapp` (from `android/app/build.gradle`)
5. Download `google-services.json`

## Step 2: Add google-services.json

1. Place `google-services.json` in `android/app/` directory
2. The file structure should be:
   ```
   android/
   └── app/
       └── google-services.json  ← Place here
   ```

## Step 3: Verify Build Configuration

The following has already been configured:

### `android/build.gradle` (Project level)
```gradle
buildscript {
    dependencies {
        // Google services Gradle plugin (for Firebase)
        classpath("com.google.gms:google-services:4.4.4")
    }
}
```

### `android/app/build.gradle` (App level)
```gradle
// Google services Gradle plugin (for Firebase)
apply plugin: "com.google.gms.google-services"

dependencies {
    // Firebase BOM (Bill of Materials) for version management
    // Using BoM ensures all Firebase libraries use compatible versions
    implementation platform('com.google.firebase:firebase-bom:34.7.0')
    
    // Firebase products (versions are managed by BoM, don't specify versions)
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-firestore'
    implementation 'com.google.firebase:firebase-messaging'
}
```

**Note:** The Firebase BoM (Bill of Materials) automatically manages compatible versions of all Firebase libraries. When using the BoM, you should NOT specify individual library versions.

## Step 4: Install Dependencies

Firebase packages are already added to `package.json`:
- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `@react-native-firebase/firestore`
- `@react-native-firebase/messaging`
- `@react-native-firebase/storage`

Run:
```bash
npm install
cd android && ./gradlew clean && cd ..
```

## Step 5: Link Native Modules

For React Native 0.83+, autolinking should work automatically. If not:

```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

## Step 6: Verify Firebase Initialization

Firebase is initialized in `App.tsx`:
```typescript
import {initializeFirebase} from './src/config/firebase.config';

useEffect(() => {
  initializeFirebase();
}, []);
```

## Chat Room ID Format

Chat rooms use this format:
```
{min(buyerId, posterId)}_{max(buyerId, posterId)}_{propertyId}
```

Example: `1_5_123` (buyer: 1, seller: 5, property: 123)

## Backend Endpoint

Create chat room via backend:
- **Endpoint**: `POST /api/chat/create-room.php`
- **Headers**: `Authorization: Bearer {JWT_TOKEN}`
- **Body**:
  ```json
  {
    "receiverId": 5,
    "propertyId": 123
  }
  ```

## Troubleshooting

### Error: "google-services.json not found"
- Make sure `google-services.json` is in `android/app/` directory
- Clean and rebuild: `cd android && ./gradlew clean && cd ..`

### Error: "Firebase not initialized"
- Check that `google-services.json` is valid
- Verify package name matches in Firebase Console and `build.gradle`
- Check that Google Services plugin is applied in `build.gradle`

### Chat not working
- Verify Firebase Firestore is enabled in Firebase Console
- Check that Firestore rules allow read/write for authenticated users
- Verify JWT token is being sent with requests

## Firestore Security Rules

Make sure your Firestore rules allow chat access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
      
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## Next Steps

1. ✅ Add `google-services.json` to `android/app/`
2. ✅ Run `npm install`
3. ✅ Clean and rebuild Android project
4. ✅ Test chat functionality
5. ✅ Configure FCM for push notifications (optional)

