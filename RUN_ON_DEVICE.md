# How to Run App on Your Android Device

## ⚠️ Important: Expo Go Won't Work

This is a **React Native CLI project**, not an Expo project. **Expo Go cannot run this app** because:
- Expo Go only works with Expo projects (created with `expo init` or `npx create-expo-app`)
- This project uses React Native CLI, which requires building a native Android app

## ✅ Methods to Run on Your Device

### **Method 1: USB Debugging (Recommended)**

#### Step 1: Enable Developer Options on Your Phone
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times until you see "You are now a developer"
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**

#### Step 2: Connect Your Phone
1. Connect your Android phone to your computer via USB
2. Allow USB debugging when prompted on your phone
3. Verify connection:
   ```bash
   adb devices
   ```
   You should see your device listed

#### Step 3: Run the App
```bash
cd "/Users/vedantlights/Desktop/Android App"
npx react-native run-android
```

The app will build and install on your connected device automatically.

---

### **Method 2: Build APK and Install Manually**

#### Step 1: Build Debug APK
```bash
cd "/Users/vedantlights/Desktop/Android App/android"
./gradlew assembleDebug
```

The APK will be created at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Step 2: Transfer to Phone
1. Copy `app-debug.apk` to your phone (via USB, email, or cloud storage)
2. On your phone, go to **Settings** → **Security** → Enable **Install from Unknown Sources**
3. Open the APK file on your phone and install it

#### Step 3: Start Metro Bundler
On your computer, run:
```bash
cd "/Users/vedantlights/Desktop/Android App"
npm start
```

#### Step 4: Connect to Metro
1. Open the app on your phone
2. Shake your device (or press `Ctrl+M` if using emulator)
3. Select **Settings** → **Debug server host & port for device**
4. Enter your computer's IP address: `YOUR_COMPUTER_IP:8081`
   - Find your IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)

---

### **Method 3: Using ADB Wireless (WiFi)**

#### Step 1: Connect via USB First
```bash
adb devices
adb tcpip 5555
```

#### Step 2: Disconnect USB and Connect via WiFi
1. Find your phone's IP address: **Settings** → **About Phone** → **Status** → **IP Address**
2. Connect via WiFi:
   ```bash
   adb connect YOUR_PHONE_IP:5555
   ```
3. Verify:
   ```bash
   adb devices
   ```

#### Step 3: Run the App
```bash
npx react-native run-android
```

---

## 🔧 Troubleshooting

### Device Not Detected
```bash
# Restart ADB
adb kill-server
adb start-server
adb devices
```

### Build Errors
```bash
# Clean build
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Metro Bundler Issues
```bash
# Clear cache and restart
npm start -- --reset-cache
```

### App Crashes on Device
1. Check Metro bundler is running
2. Ensure device and computer are on same network (for WiFi debugging)
3. Check logs:
   ```bash
   adb logcat | grep ReactNativeJS
   ```

---

## 📱 Alternative: Use Android Emulator

If you don't have a physical device, you can use an Android emulator:

1. Open **Android Studio**
2. Go to **Tools** → **Device Manager**
3. Create a new virtual device
4. Run:
   ```bash
   npx react-native run-android
   ```

---

## 🚀 Quick Start (USB Method)

```bash
# 1. Connect your phone via USB
# 2. Enable USB Debugging on phone
# 3. Run these commands:

cd "/Users/vedantlights/Desktop/Android App"
adb devices  # Verify device is connected
npx react-native run-android
```

The app will automatically:
- Build the Android APK
- Install it on your device
- Start Metro bundler
- Launch the app

---

## 📝 Notes

- **First build takes 5-10 minutes** (downloads dependencies)
- **Subsequent builds are faster** (2-3 minutes)
- **Keep Metro bundler running** while testing
- **Hot reload works** - save files and app updates automatically
- **Shake device** to open developer menu

---

## ❓ Need Help?

If you encounter issues:
1. Check that USB debugging is enabled
2. Verify device is connected: `adb devices`
3. Ensure Metro bundler is running
4. Check Android SDK is properly installed

