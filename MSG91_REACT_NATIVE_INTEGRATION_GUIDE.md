# MSG91 OTP Widget Integration Guide for React Native Android

## 📚 Understanding MSG91 Credentials

### Three Types of Credentials:

1. **Widget ID** (`widgetId`)
   - Format: Hex string (24 characters, e.g., `356c6c6c4141303836323334`)
   - Location: MSG91 Dashboard → OTP → Your Widget → Widget ID
   - Used for: Both Native SDK and WebView Widget
   - ✅ **Current Value:** `356c6c6c4141303836323334`

2. **Token ID** (`authToken` / `tokenAuth`)
   - Format: Alphanumeric string starting with numbers (e.g., `481618Tel6uFr7IH69704db4P1`)
   - Location: MSG91 Dashboard → OTP → Your Widget → Tokens → Token ID
   - Used for: **Widget initialization** (Native SDK and WebView Widget)
   - ⚠️ **This is what goes in `tokenAuth` parameter for WebView widget**
   - ✅ **Current Value:** `481618Tel6uFr7IH69704db4P1`

3. **Auth Key** (`authKey` / API Key)
   - Format: Alphanumeric string (e.g., `481618AN27OcgiyMj6978a032P1`)
   - Location: MSG91 Dashboard → Settings → API Keys
   - Used for: **Backend REST API calls** (NOT for widgets)
   - ❌ **Do NOT use this for widget initialization**
   - ✅ **Current Value:** `481618AN27OcgiyMj6978a032P1` (for backend API only)

## 🔑 Key Difference:

- **Token ID** = Used for widget initialization (`tokenAuth` parameter)
- **Auth Key** = Used for backend REST API calls (different purpose)

## 📱 Two Integration Methods for React Native

### Method 1: Native SDK (RECOMMENDED for React Native)

**Package:** `@msg91comm/react-native-sendotp`

**Pros:**
- ✅ Native implementation (faster, more reliable)
- ✅ Better performance
- ✅ No WebView overhead
- ✅ Official MSG91 React Native package

**Implementation:**
```typescript
import { OTPVerification } from '@msg91comm/react-native-sendotp';

<OTPVerification
  onVisible={isModalVisible}
  widgetId={'356c6c6c4141303836323334'}  // Widget ID
  authToken={'481618Tel6uFr7IH69704db4P1'}  // Token ID (NOT Auth Key)
  identifier={'917588116737'}  // Phone number (91XXXXXXXXXX format)
  onCompletion={(data) => {
    if (data.success) {
      // OTP sent successfully
      const token = data.token || data.data?.token;
    } else {
      // Handle error
    }
  }}
/>
```

**Credentials Used:**
- `widgetId`: Widget ID from dashboard
- `authToken`: **Token ID** (NOT Auth Key)

---

### Method 2: WebView Widget (Current Implementation)

**Approach:** Load MSG91 widget script in WebView

**Cons:**
- ⚠️ Slower (WebView overhead)
- ⚠️ More complex error handling
- ⚠️ Timeout issues
- ⚠️ Callback reliability issues

**Implementation:**
```javascript
window.initSendOTP({
  widgetId: '356c6c6c4141303836323334',  // Widget ID
  tokenAuth: '481618Tel6uFr7IH69704db4P1',  // Token ID (NOT Auth Key)
  identifier: '917588116737',  // Phone number
  success: function(data) { ... },
  failure: function(error) { ... }
});
```

**Credentials Used:**
- `widgetId`: Widget ID from dashboard
- `tokenAuth`: **Token ID** (NOT Auth Key)

---

## ✅ Current Configuration (CORRECT)

```typescript
// src/config/msg91.config.ts
export const MSG91_CONFIG = {
  SMS_WIDGET_ID: '356c6c6c4141303836323334',  // ✅ Widget ID
  SMS_AUTH_TOKEN: '481618Tel6uFr7IH69704db4P1',  // ✅ Token ID (for widget)
  SMS_AUTH_KEY: '481618AN27OcgiyMj6978a032P1',  // ✅ Auth Key (for backend API)
};
```

## 🔍 Where We're Using What:

1. **Native SDK** (`otp.service.ts`, `msg91.config.ts`):
   - Uses: `SMS_AUTH_TOKEN` (Token ID) ✅ CORRECT

2. **WebView Widget** (`MSG91WebWidget.tsx`):
   - Uses: `resolvedAuthToken` which comes from `SMS_AUTH_TOKEN` ✅ CORRECT

## ⚠️ Common Mistakes:

1. ❌ Using Auth Key instead of Token ID for widget
2. ❌ Confusing Token ID with Auth Key
3. ❌ Using Widget ID as Template ID for REST API
4. ❌ Not enabling Mobile Integration in dashboard
5. ❌ IP Whitelisting blocking requests

## 🛠️ Required Dashboard Settings:

1. **Mobile Integration**: MUST be ENABLED
   - Dashboard → OTP → Your Widget → Settings → Mobile Integration → Enable → SAVE

2. **IP Whitelisting**: Should be DISABLED (or whitelist your IP)
   - Dashboard → Settings → IP Whitelisting → Disable

3. **Widget Status**: Must be ACTIVE
   - Dashboard → OTP → Your Widget → Status → Active

## 📝 Verification Checklist:

- [ ] Widget ID matches exactly: `356c6c6c4141303836323334`
- [ ] Token ID matches exactly: `481618Tel6uFr7IH69704db4P1` (first 15: `481618Tel6uFr7I`)
- [ ] Auth Key is separate: `481618AN27OcgiyMj6978a032P1` (for backend API only)
- [ ] Mobile Integration is ENABLED and SAVED
- [ ] IP Whitelisting is DISABLED
- [ ] Widget status is ACTIVE
- [ ] Phone format is correct: `91XXXXXXXXXX` (12 digits, no + sign)

## 🚀 Recommended Solution:

Since you're using React Native, **switch to Native SDK** instead of WebView widget. The Native SDK is more reliable and is the official recommended approach for React Native apps.

## 🔍 Current Implementation Analysis:

### ✅ What's Correct:
1. **Credentials are correct:**
   - Widget ID: `356c6c6c4141303836323334` ✅
   - Token ID: `481618Tel6uFr7IH69704db4P1` ✅ (used for widget)
   - Auth Key: `481618AN27OcgiyMj6978a032P1` ✅ (used for backend API)

2. **Config is correct:**
   - `SMS_AUTH_TOKEN` contains Token ID ✅
   - `SMS_AUTH_KEY` contains Auth Key ✅
   - Widget uses `tokenAuth` with Token ID ✅

3. **Phone format is correct:**
   - Format: `91XXXXXXXXXX` (12 digits) ✅

### ⚠️ Potential Issues:

1. **WebView Widget Limitations:**
   - WebView widgets can be unreliable in React Native
   - Callbacks may not fire even with correct configuration
   - Timeout issues are common

2. **Better Alternative:**
   - Use Native SDK component `OTPVerification` from `@msg91comm/react-native-sendotp`
   - More reliable, faster, better error handling
   - Package is already installed ✅

## 🛠️ Implementation Fix Options:

### Option 1: Switch to Native SDK (RECOMMENDED)

Replace WebView widget with Native SDK component:

```typescript
import { OTPVerification } from '@msg91comm/react-native-sendotp';

// In RegisterScreen.tsx
<OTPVerification
  onVisible={showMSG91Widget}
  widgetId={MSG91_CONFIG.SMS_WIDGET_ID}
  authToken={MSG91_CONFIG.SMS_AUTH_TOKEN}  // Token ID
  identifier={formattedPhone}  // 91XXXXXXXXXX
  onCompletion={(data) => {
    if (data.success) {
      handleWidgetSuccess(data);
    } else {
      handleWidgetFailure(data);
    }
  }}
/>
```

### Option 2: Fix WebView Widget (Current Approach)

If you want to keep WebView widget, ensure:
1. Mobile Integration is enabled ✅
2. IP Whitelisting is disabled ✅
3. Widget status is ACTIVE ✅
4. Credentials match exactly ✅

The timeout might be due to:
- Network latency
- Widget script loading slowly
- MSG91 server response delay
- WebView callback issues

## 📋 Verification Steps:

1. **Check MSG91 Dashboard:**
   - Widget ID: `356c6c6c4141303836323334`
   - Token ID: `481618Tel6uFr7IH69704db4P1` (first 15: `481618Tel6uFr7I`)
   - Mobile Integration: ENABLED ✅
   - Widget Status: ACTIVE ✅

2. **Check MSG91 Dashboard → Reports:**
   - Look for any error logs
   - Check if requests are reaching MSG91
   - Verify authentication status

3. **Test Credentials:**
   - Widget ID length: 24 characters ✅
   - Token ID length: 28 characters ✅
   - Token ID format: Starts with numbers ✅
