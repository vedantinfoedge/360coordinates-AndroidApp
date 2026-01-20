# 403 Error Handling Implementation

## Overview
This document describes the implementation of graceful 403 error handling in the React Native app, matching the Android app's error handling approach.

## Changes Made

### 1. API Service (`src/services/api.service.ts`)
**Enhanced 403 error parsing:**
- Extracts specific error messages from backend responses
- Handles both JSON and string error responses
- Provides user-friendly default messages if parsing fails
- Preserves backend error messages for display to users

**Key Changes:**
```typescript
if (statusCode === 403) {
  // Try to extract specific error message from backend
  if (typeof errorData === 'string') {
    try {
      const parsed = JSON.parse(errorData);
      errorMessage = parsed.message || parsed.error || errorMessage;
    } catch {
      // Fallback handling
    }
  } else if (errorData?.message) {
    errorMessage = errorData.message;
  }
}
```

### 2. Auth Service (`src/services/auth.service.ts`)
**403 error handling with user type detection:**
- Catches 403 errors specifically
- Extracts error messages from backend
- Detects suggested user type from error message
- Returns structured error response with suggested user type

**Key Changes:**
```typescript
try {
  const response = await api.post(API_ENDPOINTS.LOGIN, loginData);
  // ... success handling
} catch (error: any) {
  if (error.status === 403) {
    const errorMessage = error.message || 'Access denied...';
    const errorResponse = {
      success: false,
      message: errorMessage,
      status: 403,
      error: error,
    };
    
    // Detect suggested user type from error message
    if (errorMessage.includes('Agent/Builder')) {
      errorResponse.data = {suggestedUserType: 'agent'};
    } else if (errorMessage.includes('Buyer/Tenant')) {
      errorResponse.data = {suggestedUserType: 'buyer'};
    } else if (errorMessage.includes('Seller/Owner')) {
      errorResponse.data = {suggestedUserType: 'seller'};
    }
    
    throw errorResponse;
  }
}
```

### 3. Login Screen (`src/screens/Auth/LoginScreen.tsx`)
**User-friendly 403 error handling with auto-retry:**
- Shows specific error messages from backend
- Detects suggested user type from error message
- Offers to auto-retry with correct user type
- Updates selected role based on error message
- Handles 401 errors separately

**Key Features:**
1. **Auto-retry with correct user type:**
   - If backend suggests a different user type, shows dialog
   - User can choose to switch and retry login automatically
   - Updates selected role in UI

2. **Error message display:**
   - Shows backend's specific error message
   - Provides clear guidance on what to do
   - Updates role selector to match suggested type

**Key Changes:**
```typescript
const handleLogin = async (retryUserType?: UserRole) => {
  // ... validation
  
  try {
    await login(email, password, userTypeToUse);
  } catch (error: any) {
    if (error.status === 403) {
      const errorMessage = error.message || 'Access denied...';
      const suggestedUserType = error.data?.suggestedUserType;
      
      // Offer auto-retry if suggested type is different
      if (suggestedUserType && !retryUserType && suggestedUserType !== userTypeToUse) {
        Alert.alert(
          'Access Denied',
          `${errorMessage}\n\nWould you like to switch to ${suggestedRoleLabel} login?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Switch & Login', 
              onPress: () => {
                setSelectedRole(suggestedUserType as UserRole);
                handleLogin(suggestedUserType as UserRole);
              }
            }
          ]
        );
      }
    }
  }
};
```

### 4. Auth Context (`src/context/AuthContext.tsx`)
**Error propagation:**
- Wraps login call in try-catch
- Re-throws 403 errors to let LoginScreen handle display
- Preserves error structure for proper handling

**Key Changes:**
```typescript
const login = async (email: string, password: string, userType?: string) => {
  try {
    const response: any = await authService.login(email, password, userType);
    // ... success handling
  } catch (error: any) {
    // Re-throw 403 errors with their specific messages
    if (error.status === 403) {
      throw error; // Let LoginScreen handle the 403 error display
    }
    throw error;
  }
};
```

## Expected Backend Response (403)

```json
{
  "success": false,
  "message": "You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.",
  "status": 403
}
```

## User Experience Flow

### Scenario 1: User selects wrong role
1. User selects "Buyer/Tenant" but is registered as "Agent/Builder"
2. User enters credentials and clicks "Sign In"
3. Backend returns 403 with message: "You are registered as an Agent/Builder..."
4. App shows dialog:
   - Title: "Access Denied"
   - Message: Backend error message + "Would you like to switch to Agent/Builder login?"
   - Buttons: "Cancel" (updates role selector) or "Switch & Login" (auto-retries)
5. If user chooses "Switch & Login":
   - Role selector updates to "Agent/Builder"
   - Login automatically retries with correct role
   - User is logged in successfully

### Scenario 2: Generic 403 error
1. Backend returns 403 without specific user type hint
2. App shows dialog:
   - Title: "Access Denied"
   - Message: Backend error message or default message
   - Button: "OK" (updates role selector if message contains user type hint)

### Scenario 3: 401 Unauthorized
1. Invalid credentials
2. App shows: "Login Failed - Invalid email or password. Please try again."

## Error Message Detection

The app detects user type hints from error messages:
- **"Agent/Builder"** → Suggests `userType: 'agent'`
- **"Buyer/Tenant"** → Suggests `userType: 'buyer'`
- **"Seller/Owner"** → Suggests `userType: 'seller'`

## Benefits

1. **Better UX:** Users get clear guidance on what went wrong
2. **Auto-recovery:** Users can quickly switch to correct role and retry
3. **Reduced confusion:** Specific error messages instead of generic "Access denied"
4. **Consistent with Android:** Matches Android app's error handling approach
5. **Graceful degradation:** Falls back to generic messages if backend doesn't provide specifics

## Testing

### Test Cases:
1. ✅ Login with wrong user type → Should show 403 with suggestion
2. ✅ Auto-retry with correct user type → Should succeed
3. ✅ Cancel auto-retry → Should update role selector only
4. ✅ Generic 403 error → Should show message without retry option
5. ✅ Invalid credentials (401) → Should show appropriate message
6. ✅ Network error → Should show network error message

## Summary

The React Native app now handles 403 errors gracefully by:
- Parsing backend error messages
- Detecting suggested user types
- Offering auto-retry with correct user type
- Providing clear, user-friendly error messages
- Matching the Android app's error handling behavior

This ensures users have a smooth experience even when they select the wrong account type during login.

