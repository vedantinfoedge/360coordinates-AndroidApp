# Form Data Preservation Fix

## Problem
After returning from OTP verification screen:
1. Phone number field was blank (only showed "✓ Verified" badge)
2. All form fields (name, email, password, selectedRole) were cleared

## Root Cause
When navigating to OTP verification screen, form data was not being passed. When returning, React Navigation was remounting the component or state was being reset, causing all form fields to be cleared.

## Solution
Pass form data via navigation params when navigating to OTP verification, and restore it when returning.

## Fixes Applied

### 1. RegisterScreen.tsx - Pass Form Data When Navigating

**Updated `handleWidgetSuccess()` function:**
- Now passes `formData` object containing `name`, `email`, `phone`, and `selectedRole` when navigating to OTP verification

**Updated fallback paths in `handleWidgetFailure()`:**
- Both fallback scenarios now also pass form data when navigating to OTP verification

**Updated `useFocusEffect` hook:**
- Restores form data from navigation params when screen comes into focus
- Converts phone number from `91XXXXXXXXXX` format to 10 digits for display
- Restores name, email, and selectedRole

### 2. OTPVerificationScreen.tsx - Accept and Pass Back Form Data

**Updated `RouteParams` type:**
- Added `formData` property to accept form data from RegisterScreen

**Updated navigation back to Register:**
- Both MSG91 SDK verification path and backend fallback path now pass form data back
- Includes phone number (in 91XXXXXXXXXX format), name, email, and selectedRole

## Code Changes

### RegisterScreen.tsx

**When navigating to OTP verification:**
```typescript
(navigation as any).navigate('OTPVerification', {
  phone: formattedPhoneForNav,
  type: 'register',
  reqId: reqIdFromWidget || undefined,
  method: 'msg91-widget',
  // Pass form data to restore when returning
  formData: {
    name,
    email,
    phone: formattedPhoneForNav, // Pass full phone with country code
    selectedRole,
  },
});
```

**When returning from OTP verification:**
```typescript
useFocusEffect(
  React.useCallback(() => {
    const params = route.params as any;
    
    // Restore form data if provided
    if (params?.name !== undefined) {
      setName(params.name);
    }
    if (params?.email !== undefined) {
      setEmail(params.email);
    }
    if (params?.phone !== undefined) {
      // Convert from 91XXXXXXXXXX to 10 digits for display
      let phoneToRestore = params.phone;
      if (phoneToRestore.startsWith('91') && phoneToRestore.length === 12) {
        phoneToRestore = phoneToRestore.slice(2); // Remove '91' prefix
      }
      setPhone(phoneToRestore);
    }
    if (params?.selectedRole !== undefined) {
      setSelectedRole(params.selectedRole);
    }
    
    // ... phone verification logic
  }, [route.params, navigation])
);
```

### OTPVerificationScreen.tsx

**RouteParams type:**
```typescript
type RouteParams = {
  // ... existing params
  formData?: {
    name?: string;
    email?: string;
    phone?: string;
    selectedRole?: 'buyer' | 'seller' | 'agent' | null;
  };
};
```

**When navigating back to Register:**
```typescript
const navigationParams = {
  phoneVerified: true,
  phoneToken: verificationToken || undefined,
  phoneMethod: smsVerifyResponse.method || params.method || 'backend',
  // Restore form data if available
  phone: params.formData?.phone || phoneNumber,
  name: params.formData?.name,
  email: params.formData?.email,
  selectedRole: params.formData?.selectedRole,
};

navigation.navigate('Register', navigationParams as any);
```

## Phone Number Format Handling

- **Storage/Transmission**: Phone numbers are stored and transmitted in `91XXXXXXXXXX` format (12 digits with country code)
- **Display**: Phone numbers are displayed in `XXXXXXXXXX` format (10 digits) by removing the `91` prefix
- **Conversion**: Automatic conversion happens when restoring phone number from params

## Testing Checklist

- [ ] Fill in registration form (name, email, phone, select role)
- [ ] Click "Verify" button
- [ ] Navigate to OTP verification screen
- [ ] Enter OTP and verify
- [ ] Return to registration screen
- [ ] Verify phone number is displayed (not blank)
- [ ] Verify name field is preserved
- [ ] Verify email field is preserved
- [ ] Verify selected role is preserved
- [ ] Verify phone shows "✓ Verified" badge
- [ ] Click "Register" button
- [ ] Registration should proceed successfully

## Files Modified

1. `src/screens/Auth/RegisterScreen.tsx`
   - Updated `handleWidgetSuccess()` to pass form data
   - Updated `handleWidgetFailure()` fallback paths to pass form data
   - Updated `useFocusEffect` to restore form data from params

2. `src/screens/Auth/OTPVerificationScreen.tsx`
   - Updated `RouteParams` type to include `formData`
   - Updated navigation back to Register to pass form data

## Notes

- Password and confirmPassword fields are intentionally NOT preserved for security reasons
- Phone number format conversion (91XXXXXXXXXX ↔ XXXXXXXXXX) is handled automatically
- Form data is only passed for registration flow, not for login/forgot password flows
- All navigation paths (widget success, widget failure fallbacks) now consistently pass form data
