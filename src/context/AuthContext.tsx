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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string, role: UserRole) => Promise<void>;
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
          const response = await authService.getCurrentUser();
          if (response.success) {
            const userObj = {
              id: response.data.id,
              full_name: response.data.full_name,
              email: response.data.email,
              phone: response.data.phone,
              user_type: response.data.user_type,
              profile_image: response.data.profile_image,
              address: response.data.address,
            };
            setUser(userObj);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
          } else {
            // Token invalid, clear storage
            await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
          }
        } catch (error) {
          // Token expired or invalid
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    if (response.success) {
      const userObj = {
        id: response.data.user.id,
        full_name: response.data.user.full_name,
        email: response.data.user.email,
        phone: response.data.user.phone,
        user_type: response.data.user.user_type,
      };
      setUser(userObj);
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole,
  ) => {
    const response = await authService.register(name, email, phone, password, role);
    if (response.success) {
      const userObj = {
        id: response.data.user.id,
        full_name: response.data.user.full_name,
        email: response.data.user.email,
        phone: response.data.user.phone,
        user_type: response.data.user.user_type,
      };
      setUser(userObj);
    } else {
      throw new Error(response.message || 'Registration failed');
    }
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
