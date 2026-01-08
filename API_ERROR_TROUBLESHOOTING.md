# API Error Troubleshooting Guide

## 🔴 Current Errors Detected

Based on the console errors from your device, here are the issues:

### 1. **Login Error - 403 Forbidden**
```
POST /auth/login.php
Status: 403 (Forbidden)
```

**What it means:**
- The backend is rejecting the login request
- This could be due to:
  - Invalid credentials
  - Backend authentication/authorization issue
  - Missing required headers
  - CORS/security configuration (less likely on mobile)

**Solutions:**
1. **Verify credentials** - Make sure you're using correct email/password
2. **Check backend logs** - Server-side logs will show why 403 is returned
3. **Verify backend endpoint** - Ensure `/auth/login.php` exists and is accessible
4. **Check request format** - Verify the request body matches backend expectations

---

### 2. **OTP Email Error - 500 Internal Server Error**
```
POST /otp/send-email.php
Status: 500 (Internal Server Error)
```

**What it means:**
- Backend server encountered an error processing the request
- This is a server-side issue, not an app issue

**Possible causes:**
- MSG91 email service not configured
- SMTP settings incorrect
- Database connection issue
- PHP error in the endpoint code
- Missing environment variables

**Solutions:**
1. **Check backend logs** - Look for PHP errors in server logs
2. **Verify MSG91 configuration** - Ensure email service is set up
3. **Test backend directly** - Try calling the endpoint via Postman/curl
4. **Check database** - Verify database connection is working

---

### 3. **OTP SMS Error - 500 Internal Server Error**
```
POST /otp/send-sms.php
Status: 500 (Internal Server Error)
```

**What it means:**
- Same as email OTP - backend server error

**Possible causes:**
- MSG91 SMS service not configured
- Missing MSG91 API keys
- Invalid phone number format
- Rate limiting
- MSG91 service down

**Solutions:**
1. **Check MSG91 dashboard** - Verify API keys and account status
2. **Test phone number format** - Ensure number is in correct format (e.g., +919876543210)
3. **Check backend logs** - Look for MSG91 API errors
4. **Verify MSG91 service** - Test MSG91 API directly

---

## 🔧 Troubleshooting Steps

### Step 1: Verify Backend is Running

Test the backend directly:

```bash
# Test login endpoint
curl -X POST https://demo1.indiapropertys.com/backend/api/auth/login.php \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test OTP endpoint
curl -X POST https://demo1.indiapropertys.com/backend/api/otp/send-sms.php \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
```

### Step 2: Check Backend Logs

Look for errors in:
- PHP error logs
- Apache/Nginx error logs
- Application logs

### Step 3: Verify Backend Configuration

Check these backend files:
- `backend/config/config.php` - Database and service configuration
- MSG91 API keys are set
- SMTP settings are correct
- Database connection is working

### Step 4: Test with Postman

1. Import the API endpoints
2. Test each failing endpoint
3. Compare request/response with app

---

## 📱 App-Side Checks

### Verify API Configuration

The app is configured to use:
- **Base URL**: `https://demo1.indiapropertys.com/backend/api`
- **Timeout**: 30 seconds

### Check Network Connection

Ensure:
- Device has internet connection
- Can reach the backend URL
- No firewall blocking requests

### Test with Different Credentials

Try:
- Different user account
- Known working credentials from website
- Test account if available

---

## 🛠️ Quick Fixes

### For 403 Errors:

1. **Clear app data:**
   ```bash
   adb shell pm clear Indiapropertys.com
   ```

2. **Try login again** with fresh credentials

3. **Check if backend requires specific headers**

### For 500 Errors:

1. **Wait a few minutes** - Server might be temporarily down

2. **Check backend status** - Verify server is running

3. **Contact backend team** - These are server-side issues

---

## 📊 Error Status Code Reference

| Status Code | Meaning | App Action |
|------------|---------|------------|
| 200 | Success | ✅ Continue |
| 400 | Bad Request | ⚠️ Show validation errors |
| 401 | Unauthorized | 🔄 Try token refresh, then logout |
| 403 | Forbidden | ⚠️ Show "Access denied" message |
| 404 | Not Found | ⚠️ Show "Service not found" |
| 500 | Server Error | ⚠️ Show "Server error, try again" |
| 503 | Service Unavailable | ⚠️ Show "Service temporarily unavailable" |

---

## 🔍 Debugging Commands

### View App Logs

```bash
# View all React Native logs
adb logcat *:S ReactNative:V ReactNativeJS:V

# View API errors only
adb logcat | grep -i "\[API\]"

# View authentication errors
adb logcat | grep -i "\[AUTH\]"
```

### Test API Endpoints

```bash
# Test login
curl -X POST https://demo1.indiapropertys.com/backend/api/auth/login.php \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Test OTP SMS
curl -X POST https://demo1.indiapropertys.com/backend/api/otp/send-sms.php \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
```

---

## ✅ Next Steps

1. **Backend Team Should:**
   - Check server logs for detailed error messages
   - Verify MSG91 configuration
   - Test endpoints directly
   - Fix 500 errors in OTP endpoints
   - Investigate 403 error on login

2. **App is Working Correctly:**
   - ✅ Error handling is working
   - ✅ Errors are being caught and logged
   - ✅ User-friendly messages are being shown
   - ⚠️ Backend needs to be fixed

---

## 📞 Support

If errors persist:
1. Check backend server status
2. Verify backend configuration
3. Test endpoints with Postman
4. Review backend error logs
5. Contact backend development team

---

**Note:** These are backend API errors. The app is correctly catching and handling them. The backend team needs to fix the server-side issues.

