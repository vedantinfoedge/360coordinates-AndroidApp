# Mapbox Native Module Error - Fix Guide

## Error Message
```
@rnmapbox/maps native code not available. Make sure you have linked the library and rebuild your app.
```

## Solution

The Mapbox native module needs to be properly linked and the app needs to be rebuilt. Here's how to fix it:

### Step 1: Clean Build
```bash
cd android
./gradlew clean
cd ..
```

### Step 2: Rebuild the App
```bash
# Stop Metro bundler if running
# Then rebuild
npx react-native run-android
```

### Step 3: If Still Not Working

1. **Check if package is installed:**
   ```bash
   npm list @rnmapbox/maps
   ```

2. **Reinstall the package:**
   ```bash
   npm uninstall @rnmapbox/maps
   npm install @rnmapbox/maps
   ```

3. **Clear Metro cache and rebuild:**
   ```bash
   npm start -- --reset-cache
   # In another terminal:
   npx react-native run-android
   ```

### Step 4: Verify Android Configuration

Check that `android/build.gradle` has:
```gradle
repositories {
    google()
    mavenCentral()
}
```

### Step 5: Check Autolinking

React Native 0.60+ should auto-link, but verify:
```bash
npx react-native config
```

Look for `@rnmapbox/maps` in the output.

## Temporary Workaround

I've added error handling so the app won't crash. The map components will show an error message instead of crashing. The app will continue to work for all other features.

## After Rebuild

Once you rebuild the app, the Mapbox components should work. Make sure to:
1. Set your Mapbox access token in `src/config/mapbox.config.ts`
2. Rebuild the app
3. Test the map features

## Alternative: Disable Mapbox Temporarily

If you want to continue development without Mapbox:
1. The app will show error messages in map components
2. All other features will work normally
3. You can add Mapbox later when ready

