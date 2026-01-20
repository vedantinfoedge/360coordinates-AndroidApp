# Rebuild Instructions for MSG91 WebView Widget

## ⚠️ Error: RNCWebViewModule not found

This error occurs because `react-native-webview` needs to be linked in the native binary. The package is installed, but the app needs to be rebuilt.

---

## ✅ Solution: Rebuild the App

### Step 1: Clean Build (Recommended)

```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Clean Metro bundler cache
npm start -- --reset-cache
```

### Step 2: Rebuild Android App

```bash
# Stop any running Metro bundler (Ctrl+C)
# Then rebuild:
npm run android
```

### Step 3: If Still Not Working

Try these additional steps:

```bash
# 1. Clear node_modules and reinstall
rm -rf node_modules
npm install

# 2. Clear Android build cache
cd android
./gradlew clean
rm -rf app/build
cd ..

# 3. Rebuild
npm run android
```

---

## 🔄 Alternative: Use Backend API (Temporary)

If you need to test immediately without rebuilding:

1. The app will automatically fall back to backend API
2. Click "Use Backend API Instead" in the error modal
3. The existing OTP service will handle verification

---

## ✅ After Rebuild

Once rebuilt, the MSG91 widget should work:
- Click "Verify" → Widget modal appears
- Enter OTP in widget
- Automatic verification

---

## 📝 Notes

- React Native 0.83 uses auto-linking, so no manual linking needed
- Just rebuild the app after installing the package
- The error modal will guide users if WebView isn't available
- Fallback to backend API ensures the app always works

