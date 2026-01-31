# OTP Verification Fix V2 - Phone Verified State Issue

## Problem
After OTP verification, when user returns to registration screen and clicks "Register", it shows "Please verify your phone number before registering" even though OTP was verified.

## Root Causes Identified

### Issue 1: useEffect Not Firing on Navigation Return
- **Location**: `RegisterScreen.tsx` line 59-73
- **Problem**: `useEffect` with `route.params` dependency doesn't reliably fire when navigating back to a screen
- **Solution**: Changed to `useFocusEffect` which fires every time the screen comes into focus

### Issue 2: Backend Fallback Not Passing Navigation Params
- **Location**: `OTPVerificationScreen.tsx` line 303-317
- **Problem**: When MSG91 verification fails and falls back to backend API, the code used `navigation.goBack()` without passing `phoneVerified: true` parameter
- **Solution**: Changed to `navigation.navigate('Register', { phoneVerified: true, ... })` to ensure params are passed

## Fixes Applied

### 1. RegisterScreen.tsx - useFocusEffect Implementation

**Before:**
```typescript
useEffect(() => {
  const params = route.params as any;
  if (params?.phoneVerified === true) {
    setPhoneVerified(true);
    // ...
  }
}, [route.params, navigation]);
```

**After:**
```typescript
useFocusEffect(
  React.useCallback(() => {
    const params = route.params as any;
    console.log('[Register] Screen focused, checking params:', {...});
    
    if (params?.phoneVerified === true) {
      console.log('[Register] Phone verified via OTP verification screen - setting verified state');
      setPhoneVerified(true);
      // ... set token and method
      navigation.setParams({phoneVerified: undefined, ...} as any);
      console.log('[Register] Phone verification state updated successfully');
    }
  }, [route.params, navigation])
);
```

**Benefits:**
- ✅ Fires every time screen comes into focus (more reliable)
- ✅ Better logging for debugging
- ✅ Ensures state is updated when returning from OTP verification

### 2. OTPVerificationScreen.tsx - Backend Fallback Navigation Fix

**Before:**
```typescript
} else if (isRegistrationFlow) {
  console.log('[OTP Verification] Registration flow - phone verified via backend fallback');
  CustomAlert.alert('Success', 'Phone number verified successfully!', [
    {
      text: 'OK',
      onPress: () => {
        navigation.goBack(); // ❌ No params passed!
      },
    },
  ]);
}
```

**After:**
```typescript
} else if (isRegistrationFlow) {
  console.log('[OTP Verification] Registration flow - phone verified via backend fallback');
  
  // Format phone for navigation
  let phoneNumber = params.phone?.replace(/^\+/, '') || '';
  if (phoneNumber.length === 10) {
    phoneNumber = `91${phoneNumber}`;
  } else if (!phoneNumber.startsWith('91') && phoneNumber.length > 0) {
    phoneNumber = `91${phoneNumber.slice(-10)}`;
  }
  
  // Navigate back with verification params ✅
  navigation.navigate('Register', {
    phoneVerified: true,
    phoneToken: params.reqId || undefined,
    phoneMethod: 'backend',
  } as any);
  
  CustomAlert.alert('Success', 'Phone number verified successfully!', [
    {
      text: 'OK',
      onPress: () => {
        // Navigation already handled above
      },
    },
  ]);
}
```

**Benefits:**
- ✅ Passes `phoneVerified: true` parameter
- ✅ Ensures RegisterScreen detects verification state
- ✅ Works for both MSG91 SDK and backend API verification paths

### 3. Enhanced Logging

Added comprehensive logging throughout the verification flow:
- OTP verification response details
- Navigation params being passed
- State updates in RegisterScreen
- Method used (MSG91 SDK vs backend)

## Verification Flow (Fixed)

### MSG91 SDK Verification Path:
1. User enters OTP → `otpService.verifySMS()` called
2. MSG91 SDK verification succeeds
3. ✅ Navigate to Register with `phoneVerified: true`
4. RegisterScreen `useFocusEffect` detects params
5. ✅ `setPhoneVerified(true)` called
6. User can register

### Backend API Fallback Path:
1. User enters OTP → `otpService.verifySMS()` called
2. MSG91 SDK verification fails
3. Falls back to backend API verification
4. Backend verification succeeds
5. ✅ Navigate to Register with `phoneVerified: true` (FIXED)
6. RegisterScreen `useFocusEffect` detects params
7. ✅ `setPhoneVerified(true)` called
8. User can register

## Testing Checklist

- [ ] Enter phone number and click "Verify"
- [ ] Receive OTP via SMS
- [ ] Navigate to OTP verification screen
- [ ] Enter OTP code
- [ ] Verify OTP (MSG91 SDK or backend fallback)
- [ ] Return to registration screen
- [ ] Check console logs for "Phone verified via OTP verification screen"
- [ ] Verify phone shows as "✓ Verified"
- [ ] Click "Register" button
- [ ] Should NOT show "Please verify your phone number" error
- [ ] Registration should proceed successfully

## Debugging

If issue persists, check console logs for:
1. `[OTP Verification] SMS verification response:` - Verify `success: true`
2. `[OTP Verification] Navigating back to Register with params:` - Verify `phoneVerified: true`
3. `[Register] Screen focused, checking params:` - Verify params are received
4. `[Register] Phone verified via OTP verification screen` - Verify state is updated

## Files Modified

1. `src/screens/Auth/RegisterScreen.tsx`
   - Changed `useEffect` to `useFocusEffect` for navigation params detection
   - Added comprehensive logging

2. `src/screens/Auth/OTPVerificationScreen.tsx`
   - Fixed backend fallback navigation to pass `phoneVerified: true`
   - Enhanced logging for verification flow
   - Improved token extraction for registration flow

## Notes

- The fix ensures `phoneVerified` state is set correctly regardless of verification method (MSG91 SDK or backend API)
- `useFocusEffect` is more reliable than `useEffect` for handling navigation params
- All navigation paths now consistently pass verification state back to RegisterScreen
