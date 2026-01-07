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
  register: (name: string, email: string, phone: string, password: string, role: UserRole) => Promise<any>;
  verifyOTP: (userId: number, otp: string) => Promise<void>;
  resendOTP: (userId: number) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
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
        // Verify token by fetching current user
        try {
          const response: any = await authService.getCurrentUser();
          if (response && response.success && response.data) {
            // Normalize user_type to lowercase
            const rawUserType = response.data.user_type || response.data.role || '';
            const normalizedUserType = rawUserType.toLowerCase() as UserRole;
            
            const userObj = {
              id: response.data.id || response.data.user_id,
              full_name: response.data.full_name || response.data.name,
              email: response.data.email,
              phone: response.data.phone,
              user_type: normalizedUserType || 'buyer', // Default to buyer if not found
              profile_image: response.data.profile_image,
              address: response.data.address,
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
    const response: any = await authService.login(email, password, userType);
    console.log('[AuthContext] Login Response:', JSON.stringify(response, null, 2));
    console.log('[AuthContext] Expected userType:', userType);
    
    if (response && response.success) {
      // Handle different response structures
      const userData = response.data?.user || response.data || response.user;
      
      if (userData) {
        // Normalize user_type to lowercase - check multiple possible fields
        const rawUserType = userData.user_type || userData.role || userData.user_role || '';
        const normalizedUserType = rawUserType.toLowerCase().trim() as UserRole;
        
        console.log('[AuthContext] Raw user_type from backend:', rawUserType, 'Normalized:', normalizedUserType);
        console.log('[AuthContext] Expected user_type from login:', userType);
        
        // Prioritize the selected role from login screen if provided
        // This allows users to switch between buyer/seller dashboards
        let finalUserType: UserRole;
        if (userType && (userType === 'seller' || userType === 'buyer' || userType === 'agent')) {
          // Use the selected role from login screen
          console.log('[AuthContext] Using selected role from login screen:', userType);
          finalUserType = userType as UserRole;
        } else if (normalizedUserType && 
                   (normalizedUserType === 'seller' || normalizedUserType === 'buyer' || normalizedUserType === 'agent')) {
          // Fall back to backend user_type if no role selected
          console.log('[AuthContext] Using user_type from backend:', normalizedUserType);
          finalUserType = normalizedUserType;
        } else {
          // Default to buyer if neither is valid
          console.log('[AuthContext] Defaulting to buyer');
          finalUserType = 'buyer';
        }
        
        const userObj = {
          id: userData.id || userData.user_id,
          full_name: userData.full_name || userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          user_type: finalUserType,
          profile_image: userData.profile_image,
          address: userData.address,
        };
        
        console.log('[AuthContext] Setting user object:', JSON.stringify(userObj, null, 2));
        setUser(userObj);
        // Also save to AsyncStorage
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
      } else {
        console.error('[AuthContext] No user data in response');
        throw new Error(response?.message || 'Login failed: No user data');
      }
    } else {
      console.error('[AuthContext] Login response not successful:', response);
      throw new Error(response?.message || 'Login failed');
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole,
  ) => {
    const response: any = await authService.register({
      full_name: name,
      email,
      phone,
      password,
      user_type: role,
    });
    
    if (response && response.success) {
      // Registration returns user_id and phone, OTP is sent
      // User needs to verify OTP before login
      // Don't set user yet, wait for OTP verification
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
