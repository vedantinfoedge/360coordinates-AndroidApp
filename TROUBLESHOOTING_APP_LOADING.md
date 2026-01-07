# 🔧 Troubleshooting: App Not Loading on Mobile Device

## Current Status
- ✅ Device Connected: `5039b811`
- ✅ App Installed: `com.propertyapp`
- ✅ Port Forwarding: Set up (tcp:8081)
- ⏳ Metro Bundler: Starting up

## Quick Fix Steps

### Step 1: Check Metro Bundler
Open a new terminal and run:
```bash
cd "/Users/vedantlights/Desktop/Android App"
npx react-native start --reset-cache
```

Wait until you see:
```
Metro waiting on exp://192.168.x.x:8081
```

### Step 2: Verify Port Forwarding
```bash
adb reverse tcp:8081 tcp:8081
adb reverse --list
```

Should show: `tcp:8081 tcp:8081`

### Step 3: Restart App on Device
```bash
adb shell am force-stop com.propertyapp
adb shell monkey -p com.propertyapp -c android.intent.category.LAUNCHER 1
```

### Step 4: Manual Reload
On your device:
1. **Shake the device** to open Developer Menu
2. Tap **"Reload"**
3. Or tap **"Settings"** → Enable **"Debug JS Remotely"**

## Common Issues & Solutions

### Issue 1: "Unable to load script"
**Solution:**
```bash
# Kill all Metro processes
pkill -f "react-native"
pkill -f "metro"

# Restart Metro with cache clear
cd "/Users/vedantlights/Desktop/Android App"
npx react-native start --reset-cache

# In another terminal, rebuild and install
npx react-native run-android
```

### Issue 2: "Network request failed"
**Solution:**
1. Check if device and computer are on same WiFi
2. Or use USB debugging with port forwarding:
```bash
adb reverse tcp:8081 tcp:8081
```

### Issue 3: App crashes on startup
**Solution:**
```bash
# Check logs
adb logcat | grep -i "error\|exception\|fatal"

# Rebuild app
cd "/Users/vedantlights/Desktop/Android App"
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### Issue 4: Metro bundler not connecting
**Solution:**
1. Check Metro is running: `lsof -ti:8081`
2. Check firewall isn't blocking port 8081
3. Try accessing: `http://localhost:8081/status`

## Manual Steps on Device

1. **Enable Developer Options:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options
   - Enable "USB Debugging"

2. **Check Developer Menu:**
   - Shake device or press `Ctrl+M` (Android)
   - Verify "Debug JS Remotely" is enabled

3. **Check Network:**
   - Ensure device and computer on same network
   - Or use USB with port forwarding

## Alternative: Build and Install Fresh

If nothing works, rebuild the app:
```bash
cd "/Users/vedantlights/Desktop/Android App"
cd android
./gradlew clean
cd ..
npx react-native run-android
```

This will:
- Clean build
- Rebuild APK
- Install on device
- Start Metro bundler

## Check Current Status

Run this to see current status:
```bash
echo "Device: $(adb devices | grep device | wc -l | xargs) connected"
echo "Port Forward: $(adb reverse --list | wc -l | xargs) rules"
echo "Metro: $(lsof -ti:8081 > /dev/null 2>&1 && echo 'Running' || echo 'Not running')"
```

## Still Not Working?

1. **Check device logs:**
   ```bash
   adb logcat | grep -i "react\|metro\|error"
   ```

2. **Verify app is debuggable:**
   ```bash
   adb shell dumpsys package com.propertyapp | grep -i debuggable
   ```

3. **Try connecting via WiFi:**
   - Find device IP: `adb shell ip addr show wlan0`
   - Use that IP in Metro bundler

4. **Rebuild completely:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   rm -rf node_modules
   npm install
   npx react-native run-android
   ```

