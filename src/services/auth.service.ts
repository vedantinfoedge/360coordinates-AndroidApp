import api from './api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_ENDPOINTS} from '../config/api.config';

export const authService = {
  // Register
  register: async (userData: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    user_type: string;
  }) => {
    const response = await api.post(API_ENDPOINTS.REGISTER, userData);
    return response;
  },

  // Login
  login: async (email: string, password: string, userType?: string) => {
    const loginData: any = {email, password};
    // Include user_type if provided (some backends may use this for validation)
    if (userType) {
      loginData.user_type = userType;
    }
    
    console.log('[AuthService] Login request:', {email, userType});
    const response = await api.post(API_ENDPOINTS.LOGIN, loginData);
    console.log('[AuthService] Login response:', JSON.stringify(response, null, 2));
    
    if (response.success && response.data?.token) {
      await AsyncStorage.setItem('@auth_token', response.data.token);
      await AsyncStorage.setItem(
        '@propertyapp_user',
        JSON.stringify(response.data.user),
      );
    }
    
    return response;
  },

  // Verify OTP (exact backend structure: user_id, otp, phone)
  verifyOTP: async (userId: number, otp: string, phone?: string) => {
    const response = await api.post(API_ENDPOINTS.VERIFY_OTP, {
      user_id: userId,
      otp,
      phone: phone || '', // Phone is optional but backend may need it
    });
    
    if (response.success && response.data?.token) {
      await AsyncStorage.setItem('@auth_token', response.data.token);
      await AsyncStorage.setItem(
        '@propertyapp_user',
        JSON.stringify(response.data.user),
      );
    }
    
    return response;
  },

  // Resend OTP (exact backend structure: user_id, phone)
  resendOTP: async (userId: number, phone?: string) => {
    const response = await api.post(API_ENDPOINTS.RESEND_OTP, {
      user_id: userId,
      phone: phone || '', // Phone is required by backend
    });
    return response;
  },

  // Forgot Password
  forgotPassword: async (email: string) => {
    const response = await api.post(API_ENDPOINTS.FORGOT_PASSWORD, {email});
    return response;
  },

  // Reset Password
  resetPassword: async (
    resetToken: string,
    otp: string,
    newPassword: string,
  ) => {
    const response = await api.post(API_ENDPOINTS.RESET_PASSWORD, {
      reset_token: resetToken,
      otp,
      new_password: newPassword,
    });
    return response;
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.USER_PROFILE);
      return response;
    } catch (error: any) {
      // If 404, the endpoint might not exist yet - return graceful error
      if (error.status === 404) {
        return {
          success: false,
          message: 'Profile endpoint not available',
          data: null,
        };
      }
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      // If backend has logout endpoint, call it here
      // await api.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@propertyapp_user');
    }
  },
};
