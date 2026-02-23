import React, {createContext, useState, useEffect, useContext} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService} from '../services/auth.service';

export type UserRole = 'buyer' | 'seller' | 'agent' | 'builder' | 'admin';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  user_type: UserRole; // active dashboard role
  profile_image?: string;
  address?: string;
  // Canonical account role from backend (does not change when switching buyer/seller dashboards)
  registered_role?: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, userType?: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole,
    emailToken?: string,
    phoneToken?: string,
    phoneOtp?: string,
    phoneVerificationMethod?: string,
    phoneVerifiedFlag?: boolean,
  ) => Promise<any>;
  verifyOTP: (userId: number, otp: string, phone?: string) => Promise<void>;
  resendOTP: (userId: number, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  // Legacy API (kept for backward compatibility). Internally delegates to switchUserRole.
  switchRole: (targetRole: 'buyer' | 'seller') => Promise<void>;
  // New centralized helper that enforces role access rules and updates AsyncStorage + navigation state.
  switchUserRole: (targetRole: 'buyer' | 'seller') => Promise<void>;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@propertyapp_user';
const TOKEN_STORAGE_KEY = '@auth_token';

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to derive the canonical registered role for access control.
  const getRegisteredRole = (u: User): UserRole => {
    const raw =
      (u as any).registered_role ||
      (u as any).original_user_type ||
      u.user_type;
    const lower = (raw || 'buyer').toString().toLowerCase();
    if (
      lower === 'buyer' ||
      lower === 'seller' ||
      lower === 'agent' ||
      lower === 'builder' ||
      lower === 'admin'
    ) {
      return lower as UserRole;
    }
    return 'buyer';
  };

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      
      if (token && userData) {
        // Get user type from cached data to use correct endpoint
        let cachedUserType: string | undefined;
        try {
          const cachedUser = JSON.parse(userData);
          cachedUserType = cachedUser.user_type;
        } catch (parseError) {
          // Ignore parsing errors, will default to buyer
        }
        
        // Verify token by fetching current user with correct endpoint
        try {
          const response: any = await authService.getCurrentUser(cachedUserType);
          if (response && response.success && response.data) {
            // Normalize user_type to lowercase
            const rawUserType =
              response.data.user_type ||
              response.data.role ||
              response.data.profile?.user_type ||
              '';
            const normalizedUserType = rawUserType.toLowerCase() as UserRole;
            const registeredRole: UserRole =
              (normalizedUserType as UserRole) || 'buyer';

            // Get user data from response (could be in data.user, data.profile, or data directly)
            const userDataFromResponse = response.data.user || response.data.profile || response.data;
            
            // Active dashboard role starts from registeredRole, then applies last buyer/seller preference if allowed
            let userType: UserRole = registeredRole;
            // Apply last dashboard preference so app restart opens correct dashboard with correct role UI
            const pref = await AsyncStorage.getItem('@user_dashboard_preference');
            const preferredRole = pref?.toLowerCase().trim();
            if (
              (preferredRole === 'buyer' || preferredRole === 'seller') &&
              (registeredRole === 'buyer' || registeredRole === 'seller')
            ) {
              userType = preferredRole as UserRole;
            }
            const userObj: User = {
              id: userDataFromResponse.id || userDataFromResponse.user_id,
              full_name: userDataFromResponse.full_name || userDataFromResponse.name || '',
              email: userDataFromResponse.email || '',
              phone: userDataFromResponse.phone || '',
              user_type: userType,
              profile_image: userDataFromResponse.profile_image || null,
              address: userDataFromResponse.address || '',
              registered_role: registeredRole,
            };
            setUser(userObj);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
          } else if (response && response.status === 404) {
            // If endpoint doesn't exist (404), use cached user data (may include last role from switchRole)
            try {
              const cachedUser = JSON.parse(userData);
              setUser(cachedUser);
            } catch (parseError) {
              console.error('Error parsing cached user:', parseError);
            }
          } else {
            // Token invalid, clear storage
            await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
          }
        } catch (error: any) {
          // If 404 error, use cached user data instead of clearing
          if (error.status === 404) {
            try {
              const cachedUser = JSON.parse(userData);
              setUser(cachedUser);
            } catch (parseError) {
              console.error('Error parsing cached user:', parseError);
            }
          } else {
            // Token expired or invalid (non-404 errors)
            await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, userType?: string) => {
    try {
      console.log('[AuthContext] Starting login with:', {email, userType});
      const response: any = await authService.login(email, password, userType);
      console.log('[AuthContext] Login Response:', JSON.stringify(response, null, 2));
      console.log('[AuthContext] Expected userType:', userType);
      
      if (response && response.success) {
        // Handle different response structures
        const userData = response.data?.user || response.data || response.user;
        
        console.log('[AuthContext] User data extracted:', userData);
        
        if (userData) {
          // CRITICAL: Always use the requested userType from login screen, not the backend response
          // The backend validates role access (returns 403 if not allowed), but may return registered type
          // We MUST use the requested login type to allow buyer/seller dashboard switching
          const rawUserType = userData.user_type || userData.role || userData.user_role || userData.userType || '';
          const normalizedUserType = rawUserType.toLowerCase().trim() as UserRole;
          
          console.log('[AuthContext] Raw user_type from backend:', rawUserType, 'Normalized:', normalizedUserType);
          console.log('[AuthContext] Requested userType from login screen:', userType);
          
          // Role access rules (as per website documentation):
          // - Agent/Builder/Admin (registered) → Can ONLY login into their own dashboard
          // - Buyer (registered) → Can login as "buyer" OR "seller" (backend allows both)
          // - Seller (registered) → Can login as "buyer" OR "seller" (backend allows both)
          let finalUserType: UserRole;
          
          // Determine canonical registered role from backend (does not change when switching dashboards)
          const registeredRole: UserRole =
            (normalizedUserType as UserRole) || 'buyer';

          // STRICT: if backend says this account is agent/builder/admin, it can NEVER become buyer/seller in-app.
          // This prevents restricted accounts from \"logging in as buyer/seller\" via the role selector.
          if (
            registeredRole === 'agent' ||
            registeredRole === 'builder' ||
            registeredRole === 'admin'
          ) {
            console.log('[AuthContext] 🔒 Backend user_type is restricted; forcing final user_type=', registeredRole);
            finalUserType = registeredRole;
          }
          // ALWAYS prioritize the requested userType from login screen
          // This ensures that when a seller selects "seller" on login, they get seller dashboard
          // Even if backend returns registered type, we use the requested login type
          else if (userType && typeof userType === 'string' && userType.trim() !== '') {
            const loginUserType = userType.toLowerCase().trim() as UserRole;
            if (
              loginUserType === 'seller' ||
              loginUserType === 'buyer' ||
              loginUserType === 'agent'
            ) {
              console.log('[AuthContext] ✅ Using requested role from login screen:', loginUserType);
              finalUserType = loginUserType;
            } else {
              // Invalid userType, fall back to backend response
              console.log('[AuthContext] ⚠️ Invalid userType, using backend value:', normalizedUserType);
              finalUserType = (normalizedUserType || 'buyer') as UserRole;
            }
          } 
          // Fallback: Use backend response user_type if no userType was provided
          else if (
            normalizedUserType &&
            (normalizedUserType === 'seller' ||
              normalizedUserType === 'buyer' ||
              normalizedUserType === 'agent' ||
              normalizedUserType === 'builder' ||
              normalizedUserType === 'admin')
          ) {
            console.log('[AuthContext] ⚠️ No userType provided, using backend response:', normalizedUserType);
            finalUserType = normalizedUserType;
          } 
          // Last resort: Default to buyer
          else {
            console.log('[AuthContext] ⚠️ Defaulting to buyer (no valid userType found)');
            finalUserType = 'buyer';
          }
          
          console.log('[AuthContext] 🎯 Final user_type set to:', finalUserType);
          
          const userObj: User = {
            id: userData.id || userData.user_id,
            full_name: userData.full_name || userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            user_type: finalUserType,
            profile_image: userData.profile_image || null,
            address: userData.address || '',
            registered_role: registeredRole,
          };
          
          console.log('[AuthContext] Setting user object:', JSON.stringify(userObj, null, 2));
          setUser(userObj);
          // Also save to AsyncStorage
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
          console.log('[AuthContext] Login successful, user set and saved');
        } else {
          console.error('[AuthContext] No user data in response');
          throw new Error(response?.message || 'Login failed: No user data');
        }
      } else {
        console.error('[AuthContext] Login response not successful:', response);
        const errorMsg = response?.message || 'Login failed. Please check your credentials.';
        throw {
          success: false,
          message: errorMsg,
          status: response?.status || 400,
          error: response,
        };
      }
    } catch (error: any) {
      console.error('[AuthContext] Login error caught:', error);
      // Re-throw 403 errors with their specific messages
      if (error.status === 403) {
        throw error; // Let LoginScreen handle the 403 error display
      }
      // Re-throw other errors
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole,
    emailToken?: string,
    phoneToken?: string,
    phoneOtp?: string, // For backend verification fallback
    phoneVerificationMethod?: string,
    phoneVerifiedFlag?: boolean,
  ) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:224',message:'AuthContext.register entry',data:{name,email,phone,role,hasEmailToken:!!emailToken,hasPhoneToken:!!phoneToken,hasPhoneOtp:!!phoneOtp,phoneVerificationMethod,phoneVerified:phoneVerifiedFlag},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    try {
      console.log('[AuthContext] Starting registration:', {email, phone, role});
      
      const response: any = await authService.register({
        fullName: name,
        email,
        phone,
        password,
        userType: role,
        emailVerificationToken: emailToken,
        phoneVerificationToken: phoneToken,
        phoneOtp: phoneOtp, // Pass OTP if no token available (backend verification)
        phoneVerificationMethod: phoneVerificationMethod,
        phoneVerified: phoneVerifiedFlag,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:252',message:'AuthContext.register - after authService call',data:{success:response?.success,hasToken:!!response?.data?.token,hasUser:!!response?.data?.user,hasUserId:!!response?.data?.user_id,message:response?.message,status:response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      console.log('[AuthContext] Registration response received:', {
        success: response?.success,
        hasToken: !!response?.data?.token,
        hasUser: !!response?.data?.user,
        hasUserId: !!response?.data?.user_id,
        message: response?.message,
      });
      
      if (response && response.success) {
        // Check if backend returns token and user (auto-login like website)
        if (response.data?.token && response.data?.user) {
          // Auto-login after registration (matching website workflow)
          const userData = response.data.user;
          const normalizedUserType = (userData.user_type || role).toLowerCase() as UserRole;
          
          const userObj = {
            id: userData.id || userData.user_id,
            full_name: userData.full_name || userData.name || name,
            email: userData.email || email,
            phone: userData.phone || phone,
            user_type: normalizedUserType,
            profile_image: userData.profile_image || null,
            address: userData.address || '',
          };
          
          // Save token and user (auto-login)
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
          setUser(userObj);
          
          console.log('[AuthContext] Auto-logged in after registration');
        } else {
          // Legacy flow: Registration returns user_id, OTP verification needed
          // This is for backward compatibility
          console.log('[AuthContext] Registration successful, OTP verification required');
        }
        
        return response;
      } else {
        // Registration failed - extract error message
        const errorMessage = response?.message || response?.error?.message || response?.error || 'Registration failed. Please check your information and try again.';
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:290',message:'AuthContext.register - response.success is false',data:{success:response?.success,message:errorMessage,status:response?.status,hasError:!!response?.error,errorMessage:response?.error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        console.error('[AuthContext] Registration failed:', {
          success: response?.success,
          message: errorMessage,
          status: response?.status,
        });
        
        const error: any = new Error(errorMessage);
        error.status = response?.status || 400;
        error.response = response;
        throw error;
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:303',message:'AuthContext.register - catch block',data:{message:error?.message,status:error?.status,hasResponse:!!error?.response,networkError:!error?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.error('[AuthContext] Registration error:', {
        message: error.message,
        status: error.status,
        error: error.error,
      });
      
      // Re-throw with better error structure
      if (error.status) {
        throw error; // Already formatted
      } else {
        // Network or unexpected error
        const formattedError: any = new Error(error.message || 'Registration failed. Please check your internet connection and try again.');
        formattedError.status = error.status || 500;
        formattedError.error = error;
        throw formattedError;
      }
    }
  };

  const verifyOTP = async (userId: number, otp: string, phone?: string) => {
    const response: any = await authService.verifyOTP(userId, otp, phone);
    
    if (response && response.success && response.data?.user) {
      // Normalize user_type to lowercase
      const rawUserType = response.data.user.user_type || response.data.user.role || '';
      const normalizedUserType = rawUserType.toLowerCase() as UserRole;
      
      const userObj = {
        id: response.data.user.id,
        full_name: response.data.user.full_name || response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone,
        user_type: normalizedUserType || 'buyer',
        profile_image: response.data.user.profile_image,
        address: response.data.user.address,
      };
      
      setUser(userObj);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
      
      // Token is already stored by authService.verifyOTP
      console.log('OTP verified, user logged in:', userObj);
    } else {
      throw new Error(response?.message || 'OTP verification failed');
    }
  };

  const resendOTP = async (userId: number, phone?: string) => {
    const response: any = await authService.resendOTP(userId, phone);
    
    if (!response || !response.success) {
      throw new Error(response?.message || 'Failed to resend OTP');
    }
    
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    // Clear dashboard preference on logout
    await AsyncStorage.removeItem('@user_dashboard_preference');
    await AsyncStorage.removeItem('@target_dashboard');
  };

  const switchUserRole = async (targetRole: 'buyer' | 'seller') => {
    try {
      const activeRole = user?.user_type ?? 'none';
      console.log('[DEBUG RoleSwitch] 1. BEFORE updating role → targetRole:', targetRole, 'activeRole:', activeRole, 'userId:', user?.id);

      if (!user) {
        throw new Error('You must be logged in to switch dashboards.');
      }

      const registeredRole = getRegisteredRole(user);

      // Enforce strict access rules based on registered role
      if (registeredRole === 'agent' || registeredRole === 'builder') {
        const message =
          registeredRole === 'agent'
            ? 'Your account is registered as Agent. Buyer/Seller dashboards are not available.'
            : 'Your account is registered as Builder. Buyer/Seller dashboards are not available.';
        throw new Error(message);
      }

      // Only buyer/seller accounts may switch between buyer and seller dashboards
      if (
        !(registeredRole === 'buyer' || registeredRole === 'seller') ||
        !(targetRole === 'buyer' || targetRole === 'seller')
      ) {
        throw new Error('You are not allowed to switch to this dashboard with your account.');
      }

      // Ask backend to switch role and issue a role-specific JWT token.
      // This keeps the Firebase Auth user the same but ensures seller/buyer APIs
      // receive the correct role context in JWT claims/authorization checks.
      try {
        await authService.switchRole(targetRole);
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        // If backend hasn't implemented /auth/switch-role.php yet, fall back to client-side role switch only.
        if (status === 404) {
          console.log(
            '[AuthContext] switchUserRole: switch-role endpoint not available, using local role switch only',
          );
        } else {
          // For all other errors (403, 500, etc.), surface the backend message to the UI
          // and DO NOT change the local role to avoid inconsistent state.
          throw err;
        }
      }

      // Build new user with active role set to targetRole (no new user, no Firebase change)
      const nextUser: User = {
        ...user,
        user_type: targetRole,
        registered_role: registeredRole,
      };

      console.log('[DEBUG RoleSwitch] 2. BEFORE AsyncStorage - nextUser.user_type:', nextUser.user_type);

      // Persist first so AppNavigator reads correct preference when it reacts to user change
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      await AsyncStorage.setItem('@target_dashboard', targetRole);
      await AsyncStorage.setItem('@user_dashboard_preference', targetRole);

      const storedPref = await AsyncStorage.getItem('@user_dashboard_preference');
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const tokenMasked = token ? (token.length > 14 ? `${token.slice(0, 10)}...${token.slice(-4)}` : '***') : 'null';
      console.log('[DEBUG RoleSwitch] 3. AFTER AsyncStorage - stored preference:', storedPref, 'token (masked):', tokenMasked);

      console.log('[DEBUG RoleSwitch] 4. BEFORE setUser (navigation reset will follow)');
      // Update global role state; AppNavigator useEffect will then navigate to the correct dashboard
      setUser(nextUser);
      console.log('[DEBUG RoleSwitch] 5. AFTER setUser - role switch complete. user_type:', targetRole);
    } catch (error: any) {
      console.error('[AuthContext] Error in switchUserRole:', error);
      throw error;
    }
  };

  // Backwards-compatible alias used by older call sites
  const switchRole = (targetRole: 'buyer' | 'seller') => switchUserRole(targetRole);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        verifyOTP,
        resendOTP,
        logout,
        switchRole,
        switchUserRole,
        isAuthenticated: !!user,
        setUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
