# Firebase Native Module Linking Fix

## Error Message
```
[Firebase Chat] Error getting Firestore: You attempted to use a Firebase module that's not installed natively on your project by calling firebase.app().

Ensure you have installed the npm package '@react-native-firebase/app', have imported it in your project, and have rebuilt your native application.
```

## Root Cause

The Firebase npm packages are installed, but the **native Android modules are not linked**. React Native Firebase requires:
1. ✅ npm packages installed (already done)
2. ❌ Native modules linked (needs rebuild)
3. ❌ App rebuilt with Firebase native code

## Solution: Rebuild the App

### Step 1: Clean Android Build
```bash
cd android
./gradlew clean
cd ..
```

### Step 2: Clear Metro Bundler Cache
```bash
npm start -- --reset-cache
```

**In a new terminal**, run:

### Step 3: Rebuild and Run
```bash
npm run android
```

Or if you have a device connected:
```bash
npm run android:device
```

## Why This Happens

React Native Firebase uses **native modules** that need to be compiled into the Android app. Simply installing npm packages isn't enough - you must:

1. Install npm packages ✅ (already done)
2. **Rebuild the native Android app** ❌ (needs to be done)

The native code is automatically linked by React Native's autolinking, but it only happens during the build process.

## Verification Steps

After rebuilding, check the console for:
```
[Firebase] Firebase initialized successfully
[Firebase] Firestore is available
[Firebase Chat] Firebase is available and ready
```

If you see these messages, Firebase is working correctly.

## If Rebuild Doesn't Work

### Option 1: Verify Packages
```bash
npm list @react-native-firebase/app @react-native-firebase/firestore
```

Both should show version `^20.5.0`.

### Option 2: Reinstall Packages
```bash
npm uninstall @react-native-firebase/app @react-native-firebase/firestore
npm install @react-native-firebase/app@^20.5.0 @react-native-firebase/firestore@^20.5.0
cd android && ./gradlew clean && cd ..
npm run android
```

### Option 3: Check google-services.json
Verify the file exists and is correct:
```bash
ls -la android/app/google-services.json
```

The file should exist and contain your Firebase project configuration.

### Option 4: Check Gradle Configuration
Verify `android/app/build.gradle` has:
```gradle
apply plugin: "com.google.gms.google-services"

dependencies {
    implementation platform('com.google.firebase:firebase-bom:34.7.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-firestore'
    implementation 'com.google.firebase:firebase-messaging'
}
```

## Current Behavior

Until you rebuild, the app will:
- ✅ Continue to work normally
- ✅ Use API-based chat (fallback)
- ⚠️ Show warning messages about Firebase not being available
- ❌ Not have real-time Firebase chat features

## After Rebuild

Once rebuilt, Firebase chat will:
- ✅ Create chat rooms in Firestore
- ✅ Send messages in real-time
- ✅ Listen to new messages instantly
- ✅ Sync with Firebase backend

## Quick Rebuild Command

Run this single command to clean and rebuild:
```bash
cd android && ./gradlew clean && cd .. && npm run android
```

## Status

**Current**: Firebase packages installed, but native modules not linked
**Action Required**: Rebuild the Android app
**Fallback**: App works with API-based chat until rebuild is done

