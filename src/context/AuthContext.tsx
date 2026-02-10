import React, {createContext, useState, useEffect, useContext} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService} from '../services/auth.service';

export type UserRole = 'buyer' | 'seller' | 'agent';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  user_type: UserRole;
  profile_image?: string;
  address?: string;
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
  verifyOTP: (userId: number, otp: string) => Promise<void>;
  resendOTP: (userId: number) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (targetRole: 'buyer' | 'seller') => Promise<void>;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@propertyapp_user';
const TOKEN_STORAGE_KEY = '@auth_token';

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            const rawUserType = response.data.user_type || response.data.role || response.data.profile?.user_type || '';
            const normalizedUserType = rawUserType.toLowerCase() as UserRole;
            
            // Get user data from response (could be in data.user, data.profile, or data directly)
            const userDataFromResponse = response.data.user || response.data.profile || response.data;
            
            const userObj = {
              id: userDataFromResponse.id || userDataFromResponse.user_id,
              full_name: userDataFromResponse.full_name || userDataFromResponse.name || '',
              email: userDataFromResponse.email || '',
              phone: userDataFromResponse.phone || '',
              user_type: normalizedUserType || 'buyer', // Default to buyer if not found
              profile_image: userDataFromResponse.profile_image || null,
              address: userDataFromResponse.address || '',
            };
            setUser(userObj);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
          } else if (response && response.status === 404) {
            // If endpoint doesn't exist (404), use cached user data
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
          // - Agent (registered) → Can ONLY login as "agent" (backend returns 403 if they try buyer/seller)
          // - Buyer (registered) → Can login as "buyer" OR "seller" (backend allows both)
          // - Seller (registered) → Can login as "buyer" OR "seller" (backend allows both)
          let finalUserType: UserRole;
          
          // STRICT: if backend says this account is an agent, it can NEVER become buyer/seller in-app.
          // This prevents agents from "logging in as buyer/seller" via the role selector.
          if (normalizedUserType === 'agent') {
            console.log('[AuthContext] 🔒 Backend user_type is agent; forcing final user_type=agent');
            finalUserType = 'agent';
          }
          // ALWAYS prioritize the requested userType from login screen
          // This ensures that when a seller selects "seller" on login, they get seller dashboard
          // Even if backend returns registered type, we use the requested login type
          else if (userType && typeof userType === 'string' && userType.trim() !== '') {
            const loginUserType = userType.toLowerCase().trim() as UserRole;
            if (loginUserType === 'seller' || loginUserType === 'buyer' || loginUserType === 'agent') {
              console.log('[AuthContext] ✅ Using requested role from login screen:', loginUserType);
              finalUserType = loginUserType;
            } else {
              // Invalid userType, fall back to backend response
              console.log('[AuthContext] ⚠️ Invalid userType, using backend value:', normalizedUserType);
              finalUserType = (normalizedUserType || 'buyer') as UserRole;
            }
          } 
          // Fallback: Use backend response user_type if no userType was provided
          else if (normalizedUserType &&
                   (normalizedUserType === 'seller' || normalizedUserType === 'buyer' || normalizedUserType === 'agent')) {
            console.log('[AuthContext] ⚠️ No userType provided, using backend response:', normalizedUserType);
            finalUserType = normalizedUserType;
          } 
          // Last resort: Default to buyer
          else {
            console.log('[AuthContext] ⚠️ Defaulting to buyer (no valid userType found)');
            finalUserType = 'buyer';
          }
          
          console.log('[AuthContext] 🎯 Final user_type set to:', finalUserType);
          
          const userObj = {
            id: userData.id || userData.user_id,
            full_name: userData.full_name || userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            user_type: finalUserType,
            profile_image: userData.profile_image || null,
            address: userData.address || '',
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

  const switchRole = async (targetRole: 'buyer' | 'seller') => {
    try {
      console.log('[AuthContext] Switching role to:', targetRole);
      
      // Don't allow agents to switch roles
      if (user?.user_type === 'agent') {
        throw new Error('Agents cannot switch roles. You are locked to the Agent/Builder dashboard.');
      }
      
      // Call the API to switch role
      const response: any = await authService.switchRole(targetRole);
      
      if (response && response.success) {
        // Extract user data from response
        const userData = response.data?.user || response.data;
        
        if (userData) {
          // Normalize user_type to lowercase
          const rawUserType = userData.user_type || userData.role || targetRole;
          const normalizedUserType = rawUserType.toLowerCase().trim() as UserRole;
          
          console.log('[AuthContext] Role switch successful, new user_type:', normalizedUserType);
          
          const userObj = {
            id: userData.id || userData.user_id || user?.id || 0,
            full_name: userData.full_name || userData.name || user?.full_name || '',
            email: userData.email || user?.email || '',
            phone: userData.phone || user?.phone || '',
            user_type: normalizedUserType,
            profile_image: userData.profile_image || user?.profile_image || null,
            address: userData.address || user?.address || '',
          };
          
          // Update user state
          setUser(userObj);
          
          // Update AsyncStorage (token is already updated by authService.switchRole)
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
          
          // Update dashboard preference
          await AsyncStorage.setItem('@target_dashboard', targetRole);
          await AsyncStorage.setItem('@user_dashboard_preference', targetRole);
          
          console.log('[AuthContext] Role switch completed successfully');
        } else {
          throw new Error('Role switch failed: No user data in response');
        }
      } else {
        throw new Error(response?.message || 'Role switch failed');
      }
    } catch (error: any) {
      console.error('[AuthContext] Error switching role:', error);
      
      // Re-throw error so caller can handle it
      throw error;
    }
  };

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
