# Website Workflow Alignment - React Native App

## ✅ Changes Made to Match Website Workflow

### 1. Token Extraction (Matching Website)

**Website Logic:**
```javascript
let verificationToken = data?.token || 
                       data?.verificationToken || 
                       data?.data?.token || 
                       JSON.stringify(data);
```

**React Native Implementation:**
- ✅ Updated `handleEmailWidgetSuccess()` to extract token from multiple locations
- ✅ Handles JSON string format (parses if needed)
- ✅ Extracts from `parsed.message`, `parsed.token`, or `parsed.verificationToken`
- ✅ Falls back to full data object if no token found
- ✅ Same logic applied to `handlePhoneWidgetSuccess()`

### 2. Token Processing Before Registration

**Website Logic:**
```javascript
// Extract actual token from MSG91 response (handle JSON format)
let actualEmailToken = emailVerificationToken;
if (emailVerificationToken) {
  try {
    const parsed = typeof emailVerificationToken === 'string' 
      ? JSON.parse(emailVerificationToken) 
      : emailVerificationToken;
    
    actualEmailToken = parsed?.message || 
                       parsed?.token || 
                       parsed?.verificationToken || 
                       emailVerificationToken;
  } catch (e) {
    actualEmailToken = emailVerificationToken;
  }
}
```

**React Native Implementation:**
- ✅ Added token extraction logic in `handleRegister()` before calling register
- ✅ Handles JSON format tokens
- ✅ Extracts from `parsed.message`, `parsed.token`, or `parsed.verificationToken`
- ✅ Applied to both email and phone tokens

### 3. Phone Number Formatting

**Website Logic:**
```javascript
// Accept: 10 digits (starts with 6-9)
// Format: 91XXXXXXXXXX (country code + number, no + sign)
if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
  phone = "91" + digits; // Add country code
} else if (digits.length === 12 && digits.startsWith("91")) {
  phone = digits; // Already formatted
}
```

**React Native Implementation:**
- ✅ Updated `handlePhoneVerify()` to format phone as `91XXXXXXXXXX` (no + sign) for MSG91 widget
- ✅ Updated registration to send phone as `+91XXXXXXXXXX` (with + sign) to backend
- ✅ Validates 10-digit numbers starting with 6-9
- ✅ Handles 12-digit numbers starting with 91

### 4. Auto-Login After Registration

**Website Logic:**
```javascript
if (response.success && response.data) {
  const { token, user } = response.data;
  
  // Auto-login after registration
  setToken(token);
  setUser(user);
  
  // Navigate to dashboard
  navigate("/buyer-dashboard");
}
```

**React Native Implementation:**
- ✅ Updated `AuthContext.register()` to check for token and user in response
- ✅ Auto-login if token and user are present
- ✅ Saves token and user to AsyncStorage
- ✅ Sets user in AuthContext
- ✅ AppNavigator automatically routes to appropriate dashboard

### 5. Registration Request Format

**Website Format:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "password": "SecurePassword123!",
  "userType": "buyer",
  "emailVerificationToken": "msg91_email_token_here",
  "phoneVerificationToken": "msg91_phone_token_here"
}
```

**React Native Implementation:**
- ✅ Matches exact format
- ✅ Sends `emailVerificationToken` and `phoneVerificationToken`
- ✅ Phone format: `+91XXXXXXXXXX` (with + sign)
- ✅ All fields match website format

---

## 🔄 Complete Flow (Now Matching Website)

### Step 1: User Verifies Email
1. User clicks "Verify Email"
2. MSG91 widget modal appears (WebView)
3. User enters OTP in widget
4. Widget verifies OTP client-side
5. Widget returns token via success callback
6. Token extracted (handles JSON format)
7. Email marked as verified

### Step 2: User Verifies Phone
1. User clicks "Verify Phone"
2. MSG91 widget modal appears (WebView)
3. Phone formatted as `91XXXXXXXXXX` (no + sign) for widget
4. User enters OTP in widget
5. Widget verifies OTP client-side
6. Widget returns token via success callback
7. Token extracted (handles JSON format)
8. Phone marked as verified

### Step 3: User Submits Registration
1. Form validation passes
2. Tokens extracted and processed (handles JSON format)
3. Phone formatted as `+91XXXXXXXXXX` (with + sign) for backend
4. Registration request sent with tokens
5. Backend creates user account
6. Backend returns token and user (auto-login)
7. User automatically logged in
8. Navigate to dashboard (based on user type)

---

## 📋 Key Differences Resolved

| Aspect | Website | React Native (Before) | React Native (Now) |
|--------|---------|----------------------|---------------------|
| **Token Extraction** | Handles JSON format | Basic extraction | ✅ Matches website |
| **Phone Format (Widget)** | `91XXXXXXXXXX` | `+91XXXXXXXXXX` | ✅ `91XXXXXXXXXX` |
| **Phone Format (Backend)** | `+91XXXXXXXXXX` | `+91XXXXXXXXXX` | ✅ `+91XXXXXXXXXX` |
| **Auto-Login** | Yes | No | ✅ Yes |
| **Token Processing** | JSON parsing | None | ✅ JSON parsing |

---

## ✅ Verification Checklist

- [x] Token extraction matches website logic
- [x] Token processing before registration matches website
- [x] Phone formatting for widget matches website (`91XXXXXXXXXX`)
- [x] Phone formatting for backend matches website (`+91XXXXXXXXXX`)
- [x] Auto-login after registration matches website
- [x] Registration request format matches website
- [x] Error handling matches website (fallback to backend API)

---

## 🎯 Summary

The React Native app now **fully matches the website workflow**:

1. ✅ **MSG91 Widget Integration** - WebView-based widget (like website)
2. ✅ **Token Extraction** - Handles all formats (JSON, nested, plain)
3. ✅ **Token Processing** - Parses JSON format before registration
4. ✅ **Phone Formatting** - Correct format for widget and backend
5. ✅ **Auto-Login** - Automatically logs in after registration
6. ✅ **Dashboard Routing** - Automatically routes to correct dashboard

The app should now work exactly like the website! 🎉

