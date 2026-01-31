# MSG91 Widget Troubleshooting Guide

## ✅ Current Configuration (VERIFIED CORRECT)

```typescript
// src/config/msg91.config.ts
SMS_WIDGET_ID: '356c6c6c4141303836323334'        // ✅ Widget ID
SMS_AUTH_TOKEN: '481618Tel6uFr7IH69704db4P1'      // ✅ Token ID (for widget)
SMS_AUTH_KEY: '481618AN27OcgiyMj6978a032P1'      // ✅ Auth Key (for backend API)
```

## 🔍 Issue Analysis

### What's Working:
- ✅ Widget script loads (`initSendOTP` is available)
- ✅ Container exists and has content
- ✅ Widget initializes (`initSendOTP` is called)
- ✅ Credentials are correct (Token ID, not Auth Key)

### What's Not Working:
- ❌ Callbacks (`success`/`failure`) are not firing
- ❌ Widget times out after 10-12 seconds
- ❌ No response from MSG91 server

## 🎯 Root Cause

The WebView widget approach has known limitations:
1. **Callback Reliability**: WebView widgets sometimes don't trigger callbacks even with correct config
2. **Network Issues**: WebView may have CORS or network restrictions
3. **Timing Issues**: Widget script may load but callbacks delayed or lost
4. **Mobile Integration**: Even when enabled, WebView widgets can be unreliable

## 🛠️ Solutions

### Solution 1: Switch to Native SDK (RECOMMENDED)

The Native SDK is more reliable for React Native apps:

```typescript
import { OTPVerification } from '@msg91comm/react-native-sendotp';
import { MSG91_CONFIG } from '../config/msg91.config';

<OTPVerification
  onVisible={showMSG91Widget}
  widgetId={MSG91_CONFIG.SMS_WIDGET_ID}
  authToken={MSG91_CONFIG.SMS_AUTH_TOKEN}  // Token ID
  identifier={formattedPhone}  // 91XXXXXXXXXX format
  onCompletion={(data) => {
    if (data && data.success) {
      // Success - extract token
      const token = data.token || data.data?.token;
      handleWidgetSuccess({ token });
    } else {
      // Failure
      handleWidgetFailure(data);
    }
  }}
/>
```

### Solution 2: Verify Dashboard Settings

If you want to keep WebView widget, verify:

1. **Mobile Integration:**
   - Dashboard → OTP → Your Widget → Settings
   - Mobile Integration: **ENABLED** ✅
   - Click **SAVE** (important!)

2. **Widget Status:**
   - Dashboard → OTP → Your Widget
   - Status: **ACTIVE** ✅

3. **IP Whitelisting:**
   - Dashboard → Settings → IP Whitelisting
   - Status: **DISABLED** ✅ (or whitelist your IP)

4. **Token Verification:**
   - Dashboard → OTP → Your Widget → Tokens
   - Verify Token ID matches: `481618Tel6uFr7IH69704db4P1`
   - Token Status: **ENABLED** ✅

5. **Widget ID Verification:**
   - Dashboard → OTP → Your Widget
   - Verify Widget ID matches: `356c6c6c4141303836323334`

### Solution 3: Check MSG91 Reports

1. Go to MSG91 Dashboard → Reports
2. Check for error logs related to your widget
3. Look for authentication failures or IP blocking
4. Check request logs to see if requests are reaching MSG91

## 📝 Credential Verification Checklist

- [ ] Widget ID: `356c6c6c4141303836323334` (24 chars, hex string)
- [ ] Token ID: `481618Tel6uFr7IH69704db4P1` (28 chars, starts with numbers)
- [ ] Auth Key: `481618AN27OcgiyMj6978a032P1` (28 chars, for backend API only)
- [ ] Mobile Integration: ENABLED and SAVED
- [ ] Widget Status: ACTIVE
- [ ] IP Whitelisting: DISABLED
- [ ] Phone Format: `91XXXXXXXXXX` (12 digits, no + sign)

## 🚀 Next Steps

1. **Verify Dashboard Settings** - Ensure all settings are correct
2. **Check MSG91 Reports** - Look for error logs
3. **Consider Native SDK** - More reliable for React Native
4. **Test with Backend API Fallback** - Already implemented ✅

The backend API fallback is already in place, so users can still register even if the widget fails.
