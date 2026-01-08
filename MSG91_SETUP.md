# MSG91 OTP SDK Integration Guide

## ✅ Implementation Complete

MSG91 OTP SDK has been integrated for email OTP verification in the registration flow.

---

## 📦 Package Installed

- **Package**: `@msg91comm/sendotp-react-native`
- **Version**: Latest (^1.0.0)

---

## ⚙️ Configuration

### MSG91 Credentials

**File**: `src/config/msg91.config.ts`

```typescript
export const MSG91_CONFIG = {
  // Email Verification Widget (Registration)
  EMAIL_WIDGET_ID: '356c6c657650333535343933',
  EMAIL_AUTH_TOKEN: '481618TX6cdMp7Eg69414e7eP1',
  
  // SMS Verification Widget (Registration)
  SMS_WIDGET_ID: '356c7067734f373437333438',
  SMS_AUTH_TOKEN: '481618TcNAx989nvQ69410832P1',
  
  // Forgot Password SMS Widget
  FORGOT_PASSWORD_WIDGET_ID: '356c686b6c57353338333631',
  FORGOT_PASSWORD_AUTH_TOKEN: '481618TsNUr9hYEGR694e174cP1',
};
```

---

## 🔧 Implementation Details

### 1. Initialization

**File**: `App.tsx`

MSG91 widget is initialized on app startup:

```typescript
import {initializeMSG91} from './src/config/msg91.config';

useEffect(() => {
  initializeMSG91();
}, []);
```

### 2. OTP Service Integration

**File**: `src/services/otp.service.ts`

The OTP service now uses MSG91 SDK for both Email and SMS OTP:

**Email OTP:**
- **`sendEmail(email)`** - Uses MSG91 SDK to send email OTP
- **`verifyEmail(email, otp)`** - Uses MSG91 SDK to verify email OTP
- **`resendEmail(email)`** - Resends email OTP via MSG91

**SMS OTP:**
- **`sendSMS(phone, context)`** - Uses MSG91 SDK to send SMS OTP
  - `context`: `'register'` (default) or `'forgotPassword'` - determines which widget to use
- **`verifySMS(phone, otp, context)`** - Uses MSG91 SDK to verify SMS OTP
  - `context`: `'register'` (default) or `'forgotPassword'` - determines which widget to use
- **`resendSMS(phone, context)`** - Resends SMS OTP via MSG91
  - `context`: `'register'` (default) or `'forgotPassword'` - determines which widget to use

**Fallback**: If MSG91 SDK is not available, it automatically falls back to backend API.

**Widget Switching**: The service automatically switches between:
- Email widget (for email OTP)
- Registration SMS widget (for registration SMS OTP)
- Forgot Password SMS widget (for forgot password SMS OTP)

### 3. Registration Screen

**File**: `src/screens/Auth/RegisterScreen.tsx`

- Email verification button uses MSG91 SDK
- Automatically sends OTP when "Verify" button is clicked
- Shows verification status

### 4. OTP Verification Screen

**File**: `src/screens/Auth/OTPVerificationScreen.tsx`

- Automatically detects if email or SMS OTP is being verified
- Detects context (`'register'` or `'forgotPassword'`) from route params
- Uses MSG91 SDK for OTP verification with appropriate widget:
  - Registration SMS widget for registration flow
  - Forgot Password SMS widget for forgot password flow
  - Email widget for email verification
- Falls back to backend API if MSG91 fails
- Supports resending OTP via MSG91 with correct widget context

---

## 📱 Usage Flow

### Registration with Email OTP:

1. **User enters email** in RegisterScreen
2. **Clicks "Verify" button** → MSG91 SDK sends OTP to email
3. **User receives OTP** in email inbox
4. **User enters OTP** in OTPVerificationScreen
5. **OTP verified** via MSG91 SDK
6. **Backend verification** completes registration
7. **User logged in** automatically

### Registration with SMS OTP:

1. **User enters phone number** in RegisterScreen
2. **Clicks "Verify" button** → MSG91 SDK sends OTP to phone (uses Registration SMS widget)
3. **User receives OTP** via SMS
4. **User enters OTP** in OTPVerificationScreen
5. **OTP verified** via MSG91 SDK (Registration SMS widget)
6. **Backend verification** completes registration
7. **User logged in** automatically

### Forgot Password with SMS OTP:

1. **User requests password reset** (via backend API)
2. **Backend sends OTP** to user's phone
3. **User navigates to OTPVerificationScreen** with `type: 'forgotPassword'`
4. **User enters OTP** in OTPVerificationScreen
5. **OTP verified** via MSG91 SDK (Forgot Password SMS widget)
6. **User navigates to ResetPasswordScreen** to set new password

**Note**: The forgot password flow uses a **separate MSG91 widget** (`FORGOT_PASSWORD_WIDGET_ID`) from the registration SMS widget. This ensures proper tracking and analytics separation between registration and password reset flows.

---

## 🔄 How It Works

### Send Email OTP:

```typescript
// In RegisterScreen
const response = await otpService.sendEmail(email);

// Internally uses:
const {OTPWidget} = require('@msg91comm/sendotp-react-native');
const response = await OTPWidget.sendOTP({
  identifier: email, // Email address
});
```

### Verify Email OTP:

```typescript
// In OTPVerificationScreen
const response = await otpService.verifyEmail(email, otp);

// Internally uses:
const {OTPWidget} = require('@msg91comm/sendotp-react-native');
const response = await OTPWidget.verifyOTP({
  identifier: email,
  otp: otp,
});
```

### Send SMS OTP (Registration):

```typescript
// In RegisterScreen or OTPVerificationScreen
const response = await otpService.sendSMS(phone, 'register');

// Internally switches to Registration SMS widget and uses:
const {OTPWidget} = require('@msg91comm/sendotp-react-native');
await switchToSMSWidget(); // Registration widget
const response = await OTPWidget.sendOTP({
  identifier: phone,
});
```

### Verify SMS OTP (Registration):

```typescript
// In OTPVerificationScreen
const response = await otpService.verifySMS(phone, otp, 'register');

// Internally switches to Registration SMS widget and uses:
const {OTPWidget} = require('@msg91comm/sendotp-react-native');
await switchToSMSWidget(); // Registration widget
const response = await OTPWidget.verifyOTP({
  identifier: phone,
  otp: otp,
});
```

### Verify SMS OTP (Forgot Password):

```typescript
// In OTPVerificationScreen (when type === 'forgotPassword')
const context = params.type === 'forgotPassword' ? 'forgotPassword' : 'register';
const response = await otpService.verifySMS(phone, otp, context);

// Internally switches to Forgot Password SMS widget and uses:
const {OTPWidget} = require('@msg91comm/sendotp-react-native');
await switchToForgotPasswordWidget(); // Forgot Password widget
const response = await OTPWidget.verifyOTP({
  identifier: phone,
  otp: otp,
});
```

---

## 🛡️ Error Handling

The implementation includes robust error handling:

1. **MSG91 SDK fails** → Falls back to backend API
2. **Backend API fails** → Shows user-friendly error message
3. **Network errors** → Handled gracefully
4. **Invalid OTP** → Clear error messages

---

## 📋 Next Steps

### For Android:

1. ✅ Package installed
2. ✅ Code integrated
3. ⚠️ **Rebuild app** to link native modules:
   ```bash
   cd android && ./gradlew clean && cd ..
   npm run android
   ```

### For iOS (if needed later):

1. Install pods:
   ```bash
   cd ios && pod install && cd ..
   ```

---

## 🧪 Testing

### Test Email OTP Flow:

1. **Open RegisterScreen**
2. **Enter email address**
3. **Click "Verify" button**
4. **Check email inbox** for OTP
5. **Enter OTP** in verification screen
6. **Verify OTP** - should succeed

### Expected Behavior:

- ✅ MSG91 SDK sends OTP to email
- ✅ OTP received in email inbox
- ✅ OTP verification works
- ✅ Registration completes
- ✅ User logged in automatically

---

## 🐛 Troubleshooting

### Issue: "MSG91 SDK not available"

**Solution:**
- Rebuild app: `cd android && ./gradlew clean && cd ..`
- Reinstall package: `npm install @msg91comm/sendotp-react-native`
- Check if package is in `node_modules`

### Issue: "OTP not received"

**Solution:**
- Check email spam folder
- Verify email address is correct
- Check MSG91 dashboard for delivery status
- Verify widget ID and auth token are correct

### Issue: "OTP verification fails"

**Solution:**
- Ensure OTP is entered correctly (6 digits)
- Check OTP hasn't expired (usually 10 minutes)
- Verify MSG91 credentials are correct
- Check console logs for detailed errors

---

## 📝 Configuration Reference

### MSG91 Config File

**Location**: `src/config/msg91.config.ts`

```typescript
export const MSG91_CONFIG = {
  EMAIL_WIDGET_ID: '356c6c657650333535343933',
  EMAIL_AUTH_TOKEN: '481618TX6cdMp7Eg69414e7eP1',
};
```

### Update Credentials

If you need to update MSG91 credentials:

1. Get new widget ID and auth token from MSG91 dashboard
2. Update `src/config/msg91.config.ts`
3. Rebuild app

---

## ✅ Status

- ✅ Package added to `package.json`
- ✅ MSG91 config file created
- ✅ Initialization added to `App.tsx`
- ✅ OTP service updated with MSG91 SDK
- ✅ RegisterScreen uses MSG91 for email OTP
- ✅ OTPVerificationScreen uses MSG91 for verification
- ✅ Error handling and fallback implemented
- ⚠️ **Action Required**: Rebuild app to link native modules

---

## 🔗 Related Files

- `src/config/msg91.config.ts` - MSG91 configuration
- `src/services/otp.service.ts` - OTP service with MSG91 integration
- `src/screens/Auth/RegisterScreen.tsx` - Registration with email verification
- `src/screens/Auth/OTPVerificationScreen.tsx` - OTP verification
- `App.tsx` - MSG91 initialization

---

**Last Updated**: January 8, 2025  
**Status**: ✅ Implementation Complete - Rebuild Required

