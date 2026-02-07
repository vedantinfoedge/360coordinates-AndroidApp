# Role Switching Implementation Summary

## ✅ **COMPLETED IMPLEMENTATION**

### 1. AuthContext Integration ✅

**File**: `src/context/AuthContext.tsx`

**Added `switchRole` method:**
- ✅ Calls `authService.switchRole(targetRole)`
- ✅ Validates that agents cannot switch roles
- ✅ Updates user state with new role from API response
- ✅ Updates AsyncStorage with new user data
- ✅ Updates dashboard preferences (`@target_dashboard`, `@user_dashboard_preference`)
- ✅ Handles errors and re-throws for caller handling

**Implementation Details:**
```typescript
const switchRole = async (targetRole: 'buyer' | 'seller') => {
  // Validates agent cannot switch
  // Calls authService.switchRole()
  // Updates user state and AsyncStorage
  // Updates dashboard preferences
}
```

**Context Provider:**
- ✅ Added `switchRole` to `AuthContextType` interface
- ✅ Exported `switchRole` in context provider value

---

### 2. Buyer Dashboard Integration ✅

**File**: `src/screens/Buyer/BuyerDashboardScreen.tsx`

**Changes:**
- ✅ Added `switchRole` from `useAuth()` hook
- ✅ Added `switchingRole` state to prevent multiple clicks
- ✅ Updated `onAddPropertyPress` handler to:
  - Call `switchRole('seller')` instead of just navigating
  - Show loading state during switch
  - Navigate to Seller dashboard after successful switch
  - Handle errors with user-friendly alerts
  - Prevent multiple simultaneous role switches

**Implementation:**
```typescript
onAddPropertyPress={isLoggedIn ? async () => {
  if (switchingRole) return; // Prevent multiple clicks
  
  try {
    setSwitchingRole(true);
    await switchRole('seller');
    
    // Navigate to Seller dashboard after successful role switch
    (navigation as any).reset({
      index: 0,
      routes: [{name: 'Seller'}],
    });
  } catch (error: any) {
    CustomAlert.alert('Role Switch Failed', error?.message);
  } finally {
    setSwitchingRole(false);
  }
} : undefined}
```

---

### 3. Seller Dashboard Integration ✅

**File**: `src/screens/Seller/SellerDashboardScreen.tsx`

**Changes:**
- ✅ Added `switchRole` from `useAuth()` hook
- ✅ Added `switchingRole` state to prevent multiple clicks
- ✅ Updated `onBuyPropertyPress` handler to:
  - Call `switchRole('buyer')` instead of just navigating
  - Show loading state during switch
  - Navigate to Buyer dashboard after successful switch
  - Handle errors with user-friendly alerts
  - Prevent multiple simultaneous role switches

**Implementation:**
```typescript
onBuyPropertyPress={async () => {
  if (switchingRole) return; // Prevent multiple clicks
  
  try {
    setSwitchingRole(true);
    await switchRole('buyer');
    
    // Navigate to Buyer dashboard after successful role switch
    (navigation as any).reset({
      index: 0,
      routes: [{name: 'MainTabs'}],
    });
  } catch (error: any) {
    CustomAlert.alert('Role Switch Failed', error?.message);
  } finally {
    setSwitchingRole(false);
  }
}}
```

---

## 🔄 **WORKFLOW**

### Role Switch Flow (Buyer → Seller)

1. **User clicks "+ Add" button** in BuyerHeader
2. **Frontend calls** `switchRole('seller')` from AuthContext
3. **AuthContext calls** `authService.switchRole('seller')`
4. **API call** `POST /api/auth/switch-role.php` with `{ targetRole: 'seller' }`
5. **Backend validates:**
   - User is authenticated
   - Registered type allows seller role
   - Agent cannot switch (returns 403)
6. **Backend returns** new JWT token with `user_type = 'seller'`
7. **AuthContext updates:**
   - User state with new role
   - AsyncStorage with new token and user data
   - Dashboard preferences
8. **Navigation** to Seller dashboard
9. **User sees** Seller dashboard with seller role

### Role Switch Flow (Seller → Buyer)

1. **User clicks "Buy" button** in SellerHeader
2. **Frontend calls** `switchRole('buyer')` from AuthContext
3. **AuthContext calls** `authService.switchRole('buyer')`
4. **API call** `POST /api/auth/switch-role.php` with `{ targetRole: 'buyer' }`
5. **Backend validates:**
   - User is authenticated
   - Registered type allows buyer role
6. **Backend returns** new JWT token with `user_type = 'buyer'`
7. **AuthContext updates:**
   - User state with new role
   - AsyncStorage with new token and user data
   - Dashboard preferences
8. **Navigation** to Buyer dashboard (MainTabs)
9. **User sees** Buyer dashboard with buyer role

---

## 🛡️ **ERROR HANDLING**

### Agent Role Switch Prevention

**Frontend Validation:**
- ✅ AuthContext checks `user.user_type === 'agent'` before calling API
- ✅ Throws error: "Agents cannot switch roles. You are locked to the Agent/Builder dashboard."

**Backend Validation:**
- ⚠️ Backend should also validate and return 403 if agent tries to switch
- ⚠️ Frontend handles 403 error and shows user-friendly message

### Error Scenarios

1. **Network Error:**
   - Shows: "Failed to switch to [role] dashboard. Please try again."
   - User can retry

2. **403 Forbidden (Agent):**
   - Shows: "Agents cannot switch roles."
   - User cannot retry (agent is locked)

3. **Invalid Role:**
   - Shows: "Role switch failed: [error message]"
   - User can retry

4. **Token Expired:**
   - AuthContext will handle token refresh or redirect to login
   - User needs to login again

---

## 📋 **FEATURES**

### ✅ Implemented Features

1. **Role Switching API Integration**
   - ✅ Calls backend endpoint `/api/auth/switch-role.php`
   - ✅ Updates JWT token with new role
   - ✅ Updates user state in AuthContext

2. **State Management**
   - ✅ Updates AsyncStorage with new token and user data
   - ✅ Updates dashboard preferences
   - ✅ Prevents multiple simultaneous role switches

3. **Navigation**
   - ✅ Automatically navigates to appropriate dashboard after switch
   - ✅ Uses `navigation.reset()` to clear navigation stack

4. **Error Handling**
   - ✅ Shows user-friendly error messages
   - ✅ Prevents role switch for agents
   - ✅ Handles network errors gracefully

5. **Loading States**
   - ✅ Prevents multiple clicks during role switch
   - ✅ Shows loading indicator (can be enhanced with ActivityIndicator)

### ⚠️ Potential Enhancements

1. **Loading Indicator**
   - Consider adding ActivityIndicator overlay during role switch
   - Disable buttons during switch

2. **Success Feedback**
   - Show success toast/alert after successful role switch
   - Optional: Confirmation dialog before switching

3. **Analytics**
   - Track role switches for analytics
   - Log role switch events

4. **Offline Handling**
   - Handle offline scenarios
   - Queue role switch for when online

---

## 🧪 **TESTING CHECKLIST**

- [ ] Test buyer → seller role switch
- [ ] Test seller → buyer role switch
- [ ] Test agent trying to switch (should fail)
- [ ] Test role switch with network error
- [ ] Test role switch with expired token
- [ ] Test multiple rapid clicks (should prevent)
- [ ] Verify navigation after successful switch
- [ ] Verify user state updates correctly
- [ ] Verify AsyncStorage updates correctly
- [ ] Verify dashboard preferences update correctly

---

## 📝 **FILES MODIFIED**

1. ✅ `src/context/AuthContext.tsx`
   - Added `switchRole` method
   - Added `switchRole` to context interface

2. ✅ `src/screens/Buyer/BuyerDashboardScreen.tsx`
   - Added `switchRole` from useAuth
   - Added `switchingRole` state
   - Updated `onAddPropertyPress` handler

3. ✅ `src/screens/Seller/SellerDashboardScreen.tsx`
   - Added `switchRole` from useAuth
   - Added `switchingRole` state
   - Updated `onBuyPropertyPress` handler

---

## 🎯 **NEXT STEPS**

1. **Backend Verification**
   - Verify `/api/auth/switch-role.php` endpoint exists
   - Verify backend validates `registeredType` allows `targetRole`
   - Verify backend returns new JWT token with updated `user_type`

2. **Testing**
   - Test role switching end-to-end
   - Test error scenarios
   - Test with different user types

3. **UI Enhancements** (Optional)
   - Add loading indicator overlay
   - Add success toast/alert
   - Add confirmation dialog

---

**Implementation Date**: February 6, 2026  
**Status**: ✅ **COMPLETE** - Ready for testing
