# MSG91 401 Authentication Error - Fix Guide

## 🔴 Error Identified

```
[MSG91] Email OTP sent: 
{
  code: "401",
  message: "AuthenticationFailure",
  type: "error"
}
```

**Root Cause:** MSG91 widget authentication is failing due to incorrect credentials (Widget ID or Auth Token).

---

## ✅ Solution

### Option 1: Verify MSG91 Credentials (Recommended)

The MSG91 widget credentials in `src/config/msg91.config.ts` may be incorrect or expired.

**Steps to Fix:**

1. **Login to MSG91 Dashboard**
   - Go to https://control.msg91.com/
   - Login with your MSG91 account

2. **Check Email Widget Configuration**
   - Navigate to **OTP Widgets** → **Email Widgets**
   - Find your email widget
   - Verify the **Widget ID** matches: `356c6c657650333535343933`
   - Copy the **Auth Token** (it should start with numbers and letters)

3. **Update Credentials in App**
   - Open `src/config/msg91.config.ts`
   - Update `EMAIL_AUTH_TOKEN` with the correct token from MSG91 dashboard
   - Verify `EMAIL_WIDGET_ID` is correct

4. **Check SMS Widget Configuration** (if SMS also fails)
   - Navigate to **OTP Widgets** → **SMS Widgets**
   - Verify SMS widget ID and auth token
   - Update in `msg91.config.ts` if needed

**Example:**
```typescript
export const MSG91_CONFIG = {
  EMAIL_WIDGET_ID: '356c6c657650333535343933', // Verify this matches dashboard
  EMAIL_AUTH_TOKEN: 'YOUR_CORRECT_TOKEN_FROM_DASHBOARD', // Update this
  // ... other configs
};
```

---

### Option 2: Use Backend API Only (Temporary Workaround)

If MSG91 credentials cannot be fixed immediately, the app will automatically fall back to backend API. However, you need to ensure:

1. **Backend Email OTP API is working**
   - Fix SMTP configuration (see Fix #3 in main guide)
   - Test `/api/otp/send-email.php` endpoint

2. **The app will automatically use backend**
   - When MSG91 widget fails with 401, app falls back to backend
   - No code changes needed - it's already implemented

---

## 🔧 Code Changes Made

### Enhanced Error Handling

The app now:
1. ✅ Detects 401 authentication errors specifically
2. ✅ Logs clear warning messages
3. ✅ Automatically falls back to backend API
4. ✅ Provides better error messages for debugging

**Updated Files:**
- `src/services/otp.service.ts` - Enhanced error detection and handling

**Key Changes:**
```typescript
// Now detects 401 errors specifically
if (response && (response.code === '401' || response.code === 401 || 
    response.type === 'error' && response.message === 'AuthenticationFailure')) {
  console.warn('[MSG91] Authentication failed (401) - Widget credentials may be incorrect.');
  throw new Error('MSG91 Authentication Failure - Invalid credentials');
}
```

---

## 🐛 Debugging Steps

### Step 1: Verify MSG91 Credentials

**Check current credentials:**
```typescript
// File: src/config/msg91.config.ts
console.log('Email Widget ID:', MSG91_CONFIG.EMAIL_WIDGET_ID);
console.log('Email Auth Token:', MSG91_CONFIG.EMAIL_AUTH_TOKEN);
```

**Compare with MSG91 Dashboard:**
1. Login to MSG91 dashboard
2. Go to OTP Widgets → Email Widgets
3. Find your widget
4. Copy Widget ID and Auth Token
5. Update in `msg91.config.ts` if different

### Step 2: Test MSG91 Widget Directly

**In MSG91 Dashboard:**
1. Go to OTP Widgets → Email Widgets
2. Click on your widget
3. Use "Test Widget" feature
4. Enter a test email
5. Check if OTP is sent successfully

**If test fails in dashboard:**
- Widget may be disabled
- Check widget status in dashboard
- Verify email service is enabled in MSG91 account

### Step 3: Check Backend API

**Test backend email OTP endpoint:**
```bash
curl -X POST https://demo1.indiapropertys.com/backend/api/otp/send-email.php \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**If backend also fails:**
- Check SMTP configuration (see main guide Fix #3)
- Verify PHPMailer is installed
- Check PHP error logs

---

## 📋 Checklist

### MSG91 Configuration
- [ ] Login to MSG91 dashboard
- [ ] Verify Email Widget ID matches app config
- [ ] Verify Email Auth Token matches app config
- [ ] Test widget in MSG91 dashboard
- [ ] Update credentials in `msg91.config.ts` if needed
- [ ] Restart app after updating credentials

### Backend API (Fallback)
- [ ] Verify SMTP configuration is correct
- [ ] Test `/api/otp/send-email.php` endpoint
- [ ] Check PHP error logs for SMTP errors
- [ ] Verify `otp_verifications` table exists

### App Testing
- [ ] Test email OTP with updated MSG91 credentials
- [ ] Verify fallback to backend works if MSG91 fails
- [ ] Check console logs for clear error messages
- [ ] Test complete registration flow

---

## 🔍 Common Issues

### Issue 1: Widget ID Mismatch
**Symptom:** 401 error even with correct auth token
**Solution:** Verify Widget ID exactly matches MSG91 dashboard (case-sensitive)

### Issue 2: Expired Auth Token
**Symptom:** 401 error after working previously
**Solution:** Generate new auth token in MSG91 dashboard and update app config

### Issue 3: Widget Disabled
**Symptom:** 401 error, widget not found in dashboard
**Solution:** Enable widget in MSG91 dashboard or create new widget

### Issue 4: Wrong Widget Type
**Symptom:** 401 error, widget exists but wrong type
**Solution:** Ensure you're using Email Widget for email OTP, SMS Widget for SMS OTP

---

## 📝 Notes

### Automatic Fallback

The app is designed to handle MSG91 failures gracefully:
1. Tries MSG91 widget first
2. If 401 error → Logs warning, falls back to backend
3. If backend also fails → Shows user-friendly error

**No user action needed** - the fallback is automatic.

### Error Messages

**Console Logs:**
- `[MSG91] Authentication failed (401)` - MSG91 credentials issue
- `[OTP] MSG91 widget failed, falling back to backend API` - Normal fallback
- `[OTP] Backend API also failed` - Both methods failed (backend issue)

**User Experience:**
- MSG91 failure → Silent fallback to backend (no error shown)
- Backend failure → User sees error message

---

## ✅ Expected Behavior After Fix

### With Correct MSG91 Credentials:
1. ✅ MSG91 widget sends OTP successfully
2. ✅ Token extracted from response
3. ✅ Used in registration
4. ✅ No backend API call needed

### With Incorrect MSG91 Credentials (Current State):
1. ⚠️ MSG91 widget returns 401 error
2. ✅ App detects error and falls back to backend
3. ✅ Backend API sends OTP (if backend is working)
4. ✅ Registration uses backend OTP

### If Both Fail:
1. ❌ MSG91 widget returns 401
2. ❌ Backend API returns 500 (SMTP issue)
3. ⚠️ User sees error message
4. 🔧 Need to fix backend SMTP configuration

---

## 🎯 Summary

**Current Status:**
- ✅ App correctly detects MSG91 401 error
- ✅ App automatically falls back to backend API
- ⚠️ MSG91 credentials need to be verified/updated
- ⚠️ Backend API also failing (SMTP issue - separate fix needed)

**Action Required:**
1. Verify MSG91 credentials in dashboard
2. Update `msg91.config.ts` with correct credentials
3. Fix backend SMTP configuration (see main guide)
4. Test complete flow after fixes

The app will work correctly once either:
- MSG91 credentials are fixed, OR
- Backend SMTP is fixed (for fallback)

