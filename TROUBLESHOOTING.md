# Troubleshooting: "Unable to Load Script" Error

If you're getting an "unable to load script" error when running the app on a USB-connected device, follow these steps:

## Quick Fix Steps

### 1. Set up ADB Port Forwarding (Required for USB debugging)
```bash
adb reverse tcp:8081 tcp:8081
```

This forwards port 8081 from your device to your computer, allowing the app to connect to Metro bundler.

### 2. Start Metro Bundler
In a terminal, run:
```bash
npm start
```
or
```bash
npm run start
```

Make sure Metro bundler is running before launching the app.

### 3. Run the App with Port Forwarding
Use the new script that automatically sets up port forwarding:
```bash
npm run android:device
```

Or manually:
```bash
adb reverse tcp:8081 tcp:8081
npm run android
```

## Alternative: Using Network Connection

If USB port forwarding doesn't work, you can connect via network:

1. Make sure your device and computer are on the same Wi-Fi network
2. Find your computer's IP address:
   - macOS/Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - Windows: `ipconfig`
3. Shake your device to open the developer menu
4. Go to "Settings" → "Debug server host & port for device"
5. Enter: `YOUR_IP_ADDRESS:8081` (e.g., `192.168.1.100:8081`)

## Additional Troubleshooting

### Clear Cache
If issues persist, try clearing Metro bundler cache:
```bash
npm run start:reset
```

### Rebuild the App
Sometimes a clean rebuild helps:
```bash
cd android
./gradlew clean
cd ..
npm run android:device
```

### Check ADB Connection
Verify your device is connected:
```bash
adb devices
```

You should see your device listed. If not:
- Enable USB debugging on your device
- Accept the USB debugging authorization prompt on your device
- Try a different USB cable or port

### Verify Metro is Running
Metro bundler should show:
```
Metro waiting on exp://YOUR_IP:8081
```

If you see errors, check:
- Port 8081 is not being used by another process
- Firewall is not blocking the connection
- Node.js and npm are properly installed

## Common Issues

### Issue: "Metro bundler failed to start"
**Solution**: Kill any existing Metro processes and restart:
```bash
# Kill Metro bundler
lsof -ti:8081 | xargs kill -9
# Restart
npm start
```

### Issue: "Device not found"
**Solution**: 
- Check USB debugging is enabled
- Run `adb devices` to verify connection
- Try `adb kill-server && adb start-server`

### Issue: "Network request failed"
**Solution**:
- Ensure cleartext traffic is enabled (already configured in AndroidManifest.xml)
- Check firewall settings
- Verify device and computer are on the same network (if using Wi-Fi)

