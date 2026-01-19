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
  register: (name: string, email: string, phone: string, password: string, role: UserRole, emailToken?: string, phoneToken?: string) => Promise<any>;
  verifyOTP: (userId: number, otp: string) => Promise<void>;
  resendOTP: (userId: number) => Promise<void>;
  logout: () => Promise<void>;
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
          
          // ALWAYS prioritize the requested userType from login screen
          // This ensures that when a seller selects "seller" on login, they get seller dashboard
          // Even if backend returns registered type, we use the requested login type
          if (userType && typeof userType === 'string' && userType.trim() !== '') {
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
  ) => {
    const response: any = await authService.register({
      fullName: name,
      email,
      phone,
      password,
      userType: role,
      emailVerificationToken: emailToken,
      phoneVerificationToken: phoneToken,
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
      throw new Error(response?.message || 'Registration failed');
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
