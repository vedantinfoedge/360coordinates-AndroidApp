# Firebase Native Module Rebuild Instructions

## Problem
The error message indicates:
```
"You attempted to use a Firebase module that's not installed natively on your project by calling firebase.app().

Ensure you have installed the npm package '@react-native-firebase/app', have imported it in your project, and have rebuilt your native application."
```

This means Firebase packages are installed but the native Android app hasn't been rebuilt to link them.

## Solution: Rebuild the Android App

### Step 1: Clean the Android Build
```bash
cd android
./gradlew clean
cd ..
```

### Step 2: Clean Metro Bundler Cache (Optional but Recommended)
```bash
npm start -- --reset-cache
```
(Press `Ctrl+C` to stop after it starts, or run this in a separate terminal)

### Step 3: Rebuild and Run the App
```bash
# If using a physical device:
npm run android:device

# OR if using emulator:
npm run android
```

### Alternative: Manual Clean and Rebuild
```bash
# Clean
cd android && ./gradlew clean && cd ..

# Rebuild
npm run android
```

## What This Does

1. **Clean**: Removes old build artifacts and cached native modules
2. **Rebuild**: Recompiles the native Android code with Firebase modules linked
3. **Auto-linking**: React Native will automatically link Firebase native modules during build

## Verification

After rebuilding, you should see:
- ✅ No "Firebase module not installed natively" errors
- ✅ Firebase Auth operations work
- ✅ Firestore operations work

## If Still Having Issues

1. **Check google-services.json exists**: Already verified ✅
2. **Check build.gradle has Firebase plugin**: Already verified ✅
3. **Enable Anonymous Auth in Firebase Console**:
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Anonymous"
4. **Ensure packages are installed**:
   ```bash
   npm install
   ```

## Note

React Native Firebase requires native compilation. After installing Firebase packages, you MUST rebuild the native app (Android/iOS) - hot reload won't work for native module linking.
