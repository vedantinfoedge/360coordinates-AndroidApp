# MSG91 OTP Widget & Profile Endpoint Fixes - Implementation Summary

## ✅ Changes Implemented

### 1. Fixed Profile Endpoint (Fix #1)

**Problem:** App was calling `/user/profile.php` which doesn't exist (404/500 error).

**Solution:** Updated `authService.getCurrentUser()` to use correct endpoints based on user type:
- **Buyers:** `/api/buyer/profile/get.php`
- **Sellers/Agents:** `/api/seller/profile/get.php`

**Files Modified:**
- `src/services/auth.service.ts` - Updated `getCurrentUser()` method to accept `userType` parameter and route to correct endpoint
- `src/services/user.service.ts` - Updated `getProfile()` method to accept `userType` parameter and route to correct endpoint
- `src/context/AuthContext.tsx` - Updated `loadUser()` to pass cached user type to `getCurrentUser()`

**Key Changes:**
```typescript
// Before
getCurrentUser: async () => {
  const response = await api.get(API_ENDPOINTS.USER_PROFILE); // Wrong endpoint
}

// After
getCurrentUser: async (userType?: string) => {
  const normalizedUserType = userType?.toLowerCase() || 'buyer';
  const endpoint = normalizedUserType === 'buyer' 
    ? API_ENDPOINTS.BUYER_PROFILE_GET
    : API_ENDPOINTS.SELLER_PROFILE_GET;
  const response = await api.get(endpoint);
}
```

**Also Fixed:**
- `userService.getProfile()` - Updated to use correct endpoint based on user type (used in profile screens)

---

### 2. Improved MSG91 Email OTP Widget Fallback (Fix #2)

**Problem:** MSG91 widget failures were not handled gracefully, and tokens weren't being extracted properly.

**Solution:** Enhanced OTP service to:
- Extract verification tokens from MSG91 widget responses
- Handle widget failures gracefully with automatic fallback to backend API
- Return method indicator (`widget` or `backend`) for proper verification flow

**Files Modified:**
- `src/services/otp.service.ts` - Updated `sendEmail()` and `sendSMS()` methods

**Key Changes:**
```typescript
// Enhanced response structure
{
  success: true,
  message: 'OTP sent successfully',
  data: response,
  token: extractedToken, // NEW: Token extracted from MSG91 response
  method: 'widget' | 'backend' // NEW: Indicates source
}

// Token extraction from MSG91 response
const token = response.token || 
             response.data?.token || 
             response.data?.verificationToken ||
             response.verificationToken ||
             response.data?.emailVerificationToken;
```

**Fallback Flow:**
1. Try MSG91 widget first
2. If widget fails → automatically fallback to backend API (`/api/otp/send-email.php`)
3. Log fallback gracefully (no error shown to user)
4. Return appropriate method indicator for verification

---

### 3. Enhanced OTP Verification with Method Support (Fix #3)

**Problem:** OTP verification didn't know whether to use MSG91 widget or backend API.

**Solution:** Updated verification methods to accept `method` parameter and handle both flows.

**Files Modified:**
- `src/services/otp.service.ts` - Updated `verifyEmail()` and `verifySMS()` methods

**Key Changes:**
```typescript
// Before
verifyEmail: async (email: string, otp: string)

// After
verifyEmail: async (email: string, otp: string, method?: 'widget' | 'backend')
```

**Verification Flow:**
- If `method === 'backend'` → Use backend API directly
- If `method === 'widget'` or not specified → Try MSG91 widget first, fallback to backend
- Returns method indicator for tracking

---

### 4. Updated Registration Service for Backend OTP Fallback (Fix #4)

**Problem:** Registration didn't support backend OTP fallback when MSG91 widget fails.

**Solution:** Enhanced `authService.register()` to accept both MSG91 tokens and backend OTP codes.

**Files Modified:**
- `src/services/auth.service.ts` - Updated `register()` method

**Key Changes:**
```typescript
// New parameters
register: async (userData: {
  // ... existing fields
  emailVerificationToken?: string; // MSG91 widget token (preferred)
  phoneVerificationToken?: string;  // MSG91 widget token (preferred)
  emailOtp?: string;                // Backend OTP fallback
  phoneOtp?: string;                // Backend OTP fallback
})
```

**Registration Flow:**
1. If MSG91 tokens provided → Use tokens (preferred)
2. If MSG91 tokens not available but backend OTP provided → Use backend OTP
3. Backend handles verification accordingly

---

### 5. Updated Registration Screen Token Extraction

**Problem:** Registration screen was looking for tokens in wrong location in response.

**Solution:** Updated token extraction to use new response structure.

**Files Modified:**
- `src/screens/Auth/RegisterScreen.tsx` - Updated `handleEmailVerify()` and `handlePhoneVerify()`

**Key Changes:**
```typescript
// Before
if (response.data?.token || response.data?.verificationToken) {
  setEmailToken(response.data.token || response.data.verificationToken);
}

// After
if (response.token) {
  setEmailToken(response.token); // Token at top level
} else if (response.data?.token || response.data?.verificationToken) {
  setEmailToken(response.data.token || response.data.verificationToken); // Fallback
}
```

---

## 📋 API Endpoints Used

### Profile Endpoints (Fixed)
- ✅ `GET /api/buyer/profile/get.php` - For buyers
- ✅ `GET /api/seller/profile/get.php` - For sellers/agents

### OTP Endpoints (Fallback)
- ✅ `POST /api/otp/send-email.php` - Email OTP (fallback)
- ✅ `POST /api/otp/verify-email.php` - Email OTP verification (fallback)
- ✅ `POST /api/otp/send-sms.php` - SMS OTP (fallback)
- ✅ `POST /api/otp/verify-sms.php` - SMS OTP verification (fallback)

---

## 🔄 Complete Flow

### Registration Flow with MSG91 Widget

1. **User enters email/phone** → Registration screen
2. **Send Email OTP:**
   - Try MSG91 email widget first
   - If widget succeeds → Extract token, store for registration
   - If widget fails → Fallback to backend API, store OTP for verification
3. **Send SMS OTP:**
   - Try MSG91 SMS widget first
   - If widget succeeds → Extract token, store for registration
   - If widget fails → Fallback to backend API, store OTP for verification
4. **User enters OTP** → OTP verification screen
5. **Verify OTP:**
   - If MSG91 widget was used → Verify with widget
   - If backend API was used → Verify with backend
6. **Register User:**
   - If MSG91 tokens available → Send tokens to backend
   - If backend OTP used → Send OTP codes to backend
7. **Get Profile:**
   - After registration → Use correct endpoint based on user type
   - Buyers → `/api/buyer/profile/get.php`
   - Sellers/Agents → `/api/seller/profile/get.php`

---

## 🐛 Error Handling

### MSG91 Widget Failures
- ✅ Graceful fallback to backend API
- ✅ No error shown to user (expected behavior)
- ✅ Logged for debugging

### Backend API Failures
- ✅ Proper error messages shown to user
- ✅ 500 errors handled gracefully
- ✅ Network errors handled

### Profile Endpoint Errors
- ✅ 404 errors → Use cached user data
- ✅ 401 errors → Clear storage, redirect to login
- ✅ Other errors → Show appropriate message

---

## ✅ Testing Checklist

### Profile Endpoint
- [ ] Test buyer profile fetch after login
- [ ] Test seller profile fetch after login
- [ ] Test agent profile fetch after login
- [ ] Test profile fetch with cached user type
- [ ] Test 404 handling (use cached data)

### MSG91 Email OTP
- [ ] Test successful MSG91 widget email OTP
- [ ] Test MSG91 widget failure → backend fallback
- [ ] Test token extraction from MSG91 response
- [ ] Test backend email OTP when widget unavailable
- [ ] Test email OTP verification (both methods)

### MSG91 SMS OTP
- [ ] Test successful MSG91 widget SMS OTP
- [ ] Test MSG91 widget failure → backend fallback
- [ ] Test token extraction from MSG91 response
- [ ] Test backend SMS OTP when widget unavailable
- [ ] Test SMS OTP verification (both methods)

### Registration Flow
- [ ] Test registration with MSG91 tokens (preferred)
- [ ] Test registration with backend OTP fallback
- [ ] Test registration with mixed (email widget + SMS backend)
- [ ] Test complete registration → profile fetch flow

---

## 📝 Notes

### MSG91 Widget Response Format
The MSG91 widget response format may vary. The code checks multiple possible locations for tokens:
- `response.token`
- `response.data.token`
- `response.data.verificationToken`
- `response.verificationToken`
- `response.data.emailVerificationToken` (for email)
- `response.data.phoneVerificationToken` (for SMS)

### Backend OTP Fallback
When MSG91 widget fails, the app automatically uses backend API. The backend should:
- Accept `emailOtp` and `phoneOtp` in registration request
- Verify OTPs against stored OTPs in database
- Return appropriate success/error responses

### Profile Endpoint Selection
The app determines user type from:
1. Parameter passed to `getCurrentUser(userType)`
2. Cached user data from AsyncStorage
3. Defaults to 'buyer' if not found

---

## 🔧 Backend Requirements

### Email OTP Backend (`/api/otp/send-email.php`)
- ✅ Should handle SMTP configuration properly
- ✅ Should store OTP in `otp_verifications` table
- ✅ Should return: `{ success: true, message: "OTP sent", data: { otpId? } }`

### SMS OTP Backend (`/api/otp/send-sms.php`)
- ✅ Should handle SMS gateway properly
- ✅ Should store OTP in `otp_verifications` table
- ✅ Should return: `{ success: true, message: "OTP sent", data: { reqId? } }`

### Registration Backend (`/api/auth/register.php`)
- ✅ Should accept `emailVerificationToken` and `phoneVerificationToken` (MSG91)
- ✅ Should accept `emailOtp` and `phoneOtp` (backend fallback)
- ✅ Should verify tokens/OTPs before creating user
- ✅ Should return user data with `user_id` and `user_type`

### Profile Endpoints
- ✅ `/api/buyer/profile/get.php` - Should require authentication, return buyer profile
- ✅ `/api/seller/profile/get.php` - Should require authentication, return seller/agent profile

---

## 🎯 Summary

All fixes have been implemented according to the guide:

1. ✅ **Profile Endpoint Fixed** - Uses correct endpoints based on user type
2. ✅ **MSG91 Widget Fallback** - Graceful fallback to backend API
3. ✅ **Token Extraction** - Properly extracts tokens from MSG91 responses
4. ✅ **Backend OTP Support** - Registration supports backend OTP fallback
5. ✅ **Error Handling** - Comprehensive error handling for all scenarios

The app now handles MSG91 widget failures gracefully and uses the correct profile endpoints based on user type.

