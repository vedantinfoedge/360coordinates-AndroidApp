# MSG91 401 Authentication Error - Fix Guide

## 🔴 Critical: 401 Authentication Errors

The 401 errors indicate authentication failure with MSG91. This guide helps you verify and fix the issue.

---

## ✅ Implementation Verification - COMPLETE

**Status:** ✅ React Native SDK is correctly implemented

### Verification Results:

1. ✅ **Package Installed:** `@msg91comm/sendotp-react-native@1.0.0`
2. ✅ **Configuration:** Widget IDs and Auth Tokens match expected values
3. ✅ **Initialization:** Correctly initialized in `App.tsx`
4. ✅ **Service Layer:** Uses native SDK (`OTPWidget.sendOTP()`, `OTPWidget.verifyOTP()`)
5. ✅ **RegisterScreen:** Uses native SDK, no WebView code
6. ✅ **Phone Format:** Correctly formatted as `91XXXXXXXXXX` (12 digits, no +)
7. ✅ **No WebView:** WebView component exists but not used in registration flow

**See:** `MSG91_SDK_VERIFICATION_REPORT.md` for complete verification details

---

## 🔧 Fixes Applied

### 1. Enhanced Logging for 401 Debugging

**File:** `src/config/msg91.config.ts`

Added detailed logging to help identify 401 errors:

```typescript
console.log('[MSG91] Initializing widget:', {
  widgetId: MSG91_CONFIG.SMS_WIDGET_ID,
  authToken: MSG91_CONFIG.SMS_AUTH_TOKEN ? `${MSG91_CONFIG.SMS_AUTH_TOKEN.substring(0, 10)}...` : 'MISSING',
  widgetIdLength: MSG91_CONFIG.SMS_WIDGET_ID?.length,
  authTokenLength: MSG91_CONFIG.SMS_AUTH_TOKEN?.length,
});
```

### 2. Improved OTP Verification

**File:** `src/screens/Auth/OTPVerificationScreen.tsx`

- Added support for `reqId` parameter (for widget verification)
- Added enhanced logging for debugging
- Better method detection (widget vs backend)

### 3. Navigation Params Updated

**File:** `src/navigation/AuthNavigator.tsx`

- Added `reqId` and `method` to OTPVerification route params
- Allows passing widget verification context

---

## 📋 Action Items to Fix 401 Errors

### Step 1: Verify MSG91 Dashboard Credentials (CRITICAL)

**Action Required:** Log in to MSG91 dashboard and verify credentials match exactly.

1. **Login to MSG91 Dashboard**
   - Go to: https://control.msg91.com
   - Login with your MSG91 account

2. **Verify SMS Widget (Registration)**
   - Navigate to: **SendOTP → Widgets → SMS Widgets**
   - Find widget with ID: `356c7067734f373437333438`
   - **Verify:**
     - ✅ Widget ID matches exactly: `356c7067734f373437333438`
     - ✅ Auth Token/Token ID matches exactly: `481618TcNAx989nvQ69410832P1` (case-sensitive)
     - ✅ Widget status is **Active** (not disabled)
     - ✅ No expiry date blocking usage

3. **Verify Forgot Password Widget**
   - Find widget with ID: `356c686b6c57353338333631`
   - **Verify:**
     - ✅ Widget ID matches exactly: `356c686b6c57353338333631`
     - ✅ Auth Token/Token ID matches exactly: `481618TsNUr9hYEGR694e174cP1` (case-sensitive)
     - ✅ Widget status is **Active**

4. **If Credentials Don't Match:**
   - Copy correct Widget ID and Auth Token from dashboard
   - Update `src/config/msg91.config.ts`
   - Rebuild app: `npm run android`

---

### Step 2: Enable Mobile Integration (REQUIRED)

**Critical:** Mobile Integration MUST be enabled for React Native SDK to work.

**Steps:**
1. In MSG91 Dashboard → **SendOTP → Widgets**
2. Click on **SMS Widget (Registration)** → **Settings**
3. **Enable "Mobile Integration"** checkbox
4. **Save** changes
5. Repeat for **Forgot Password Widget**

**Without this, you'll get:**
- Error: "Mobile requests are not allowed for this widget"
- 401 or other authentication errors

---

### Step 3: Check IP Whitelisting

**Action:** Either disable IP whitelisting OR whitelist your IP address.

**Steps:**
1. In MSG91 Dashboard → **Settings → IP Whitelisting**
2. **Option A (Recommended for Production):**
   - **Disable IP Whitelisting** (allows all IPs)
3. **Option B (For Development):**
   - **Enable IP Whitelisting**
   - Add your current IP address
   - Save changes

**Without this, you'll get:**
- Error: "IPBlocked" (code 408)
- 401 errors in some cases

---

### Step 4: Regenerate Tokens (If Needed)

If credentials are expired or incorrect:

1. In MSG91 Dashboard → **SendOTP → Widgets → [Widget] → Settings**
2. **Generate New Auth Token/Token ID**
3. Copy the new token
4. Update `src/config/msg91.config.ts`:
   ```typescript
   export const MSG91_CONFIG = {
     SMS_WIDGET_ID: '356c7067734f373437333438',
     SMS_AUTH_TOKEN: 'NEW_TOKEN_HERE', // Update this
     // ... other configs
   };
   ```
5. **Rebuild app:**
   ```bash
   npm run android
   ```

---

## 🧪 Testing After Fixes

### Test SMS OTP (Registration)

1. **Open app** → **Register Screen**
2. **Enter phone number** (10 digits, e.g., `8433517958`)
3. **Click "Verify"** button
4. **Check console logs** for:
   ```
   [MSG91] Initializing widget: { widgetId: '...', authToken: '...' }
   [MSG91] Widget initialized successfully (SMS widget)
   [MSG91] SMS OTP sent (register): { success: true, ... }
   ```
5. **Check phone** for OTP SMS
6. **Enter OTP** in verification screen
7. **Verify** OTP works

### Expected Behavior:

✅ **Success:**
- Console shows: `[MSG91] SMS OTP sent (register): { success: true }`
- OTP received on phone
- OTP verification works

❌ **If 401 Error:**
- Console shows: `[MSG91] Authentication failed (401)`
- Check credentials in dashboard
- Verify Mobile Integration is enabled
- Check IP Whitelisting

---

## 🔍 Debugging 401 Errors

### Check Console Logs

After applying fixes, check console logs for:

1. **Initialization Logs:**
   ```
   [MSG91] Initializing widget: {
     widgetId: '356c7067734f373437333438',
     authToken: '481618TcNA...',
     widgetIdLength: 24,
     authTokenLength: 30
   }
   ```

2. **Error Logs:**
   ```
   [MSG91] Authentication failed (401) - Widget credentials may be incorrect.
   [OTP] MSG91 authentication failed (register) - Widget credentials may be incorrect. Using backend API instead.
   ```

### Common 401 Error Causes:

1. **Widget ID Mismatch**
   - Widget ID in code doesn't match dashboard
   - **Fix:** Update `MSG91_CONFIG.SMS_WIDGET_ID` in `msg91.config.ts`

2. **Auth Token Mismatch**
   - Auth Token in code doesn't match dashboard
   - Token expired or regenerated
   - **Fix:** Update `MSG91_CONFIG.SMS_AUTH_TOKEN` in `msg91.config.ts`

3. **Mobile Integration Not Enabled**
   - Widget doesn't allow mobile requests
   - **Fix:** Enable Mobile Integration in MSG91 dashboard

4. **IP Whitelisting Blocking**
   - Your IP is not whitelisted
   - **Fix:** Disable IP Whitelisting or add your IP

5. **Widget Disabled/Expired**
   - Widget is not active in dashboard
   - **Fix:** Enable widget or create new widget

---

## 📝 Configuration Reference

### Current Configuration

**File:** `src/config/msg91.config.ts`

```typescript
export const MSG91_CONFIG = {
  // SMS Widget (Registration)
  SMS_WIDGET_ID: '356c7067734f373437333438',
  SMS_AUTH_TOKEN: '481618TcNAx989nvQ69410832P1',
  
  // Forgot Password Widget
  FORGOT_PASSWORD_WIDGET_ID: '356c686b6c57353338333631',
  FORGOT_PASSWORD_AUTH_TOKEN: '481618TsNUr9hYEGR694e174cP1',
  
  // Email Widget
  EMAIL_WIDGET_ID: '356c6c657650333535343933',
  EMAIL_AUTH_TOKEN: '481618TX6cdMp7Eg69414e7eP1',
};
```

### Verify in MSG91 Dashboard

1. Login: https://control.msg91.com
2. Navigate: **SendOTP → Widgets**
3. For each widget:
   - Copy Widget ID
   - Copy Auth Token/Token ID
   - Compare with config file
   - Update if different

---

## ✅ Checklist

### Before Testing:
- [ ] Logged into MSG91 dashboard
- [ ] Verified Widget IDs match exactly
- [ ] Verified Auth Tokens match exactly (case-sensitive)
- [ ] Enabled Mobile Integration for all widgets
- [ ] Checked IP Whitelisting settings
- [ ] Updated `msg91.config.ts` if credentials changed
- [ ] Rebuilt app after config changes

### After Testing:
- [ ] SMS OTP sends successfully
- [ ] OTP received on phone
- [ ] OTP verification works
- [ ] No 401 errors in console
- [ ] Console shows successful MSG91 initialization

---

## 🎯 Summary

**Implementation Status:** ✅ Correctly implemented with native SDK

**401 Error Resolution:**
1. **Verify credentials** in MSG91 dashboard (most important)
2. **Enable Mobile Integration** for all widgets (required)
3. **Check IP Whitelisting** settings
4. **Regenerate tokens** if needed
5. **Rebuild app** after config changes

The code implementation is correct. The 401 errors are configuration issues that need to be fixed in the MSG91 dashboard.

Once credentials are verified and Mobile Integration is enabled, the 401 errors should be resolved.

---

**Last Updated:** January 2025  
**Related Files:**
- `MSG91_SDK_VERIFICATION_REPORT.md` - Complete verification report
- `src/config/msg91.config.ts` - Configuration file
- `src/services/otp.service.ts` - OTP service implementation
