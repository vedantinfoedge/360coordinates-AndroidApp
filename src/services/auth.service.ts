import api from './api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_ENDPOINTS} from '../config/api.config';

export const authService = {
  // Register
  register: async (userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    userType: string;
    emailVerificationToken?: string;
    phoneVerificationToken?: string;
    emailOtp?: string; // Backend OTP fallback
    phoneOtp?: string; // Backend OTP fallback
    phoneVerificationMethod?: string; // e.g. 'msg91' for MSG91 REST mobile flow
    phoneVerified?: boolean; // flag from app indicating MSG91-backed verification
  }) => {
    // Map to backend expected format
    const registerData: any = {
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      userType: userData.userType,
    };
    
    // Add MSG91 tokens if provided (preferred method)
    if (userData.emailVerificationToken) {
      registerData.emailVerificationToken = userData.emailVerificationToken;
    }
    if (userData.phoneVerificationToken) {
      registerData.phoneVerificationToken = userData.phoneVerificationToken;
    }
    
    // Add backend OTP fallback if MSG91 tokens not available
    if (!userData.emailVerificationToken && userData.emailOtp) {
      registerData.emailOtp = userData.emailOtp;
    }
    if (!userData.phoneVerificationToken && userData.phoneOtp) {
      registerData.phoneOtp = userData.phoneOtp;
    }

    // Add MSG91 REST metadata (mobile flow trusts MSG91 via backend proxy)
    if (userData.phoneVerificationMethod) {
      registerData.phoneVerificationMethod = userData.phoneVerificationMethod;
    }
    if (typeof userData.phoneVerified === 'boolean') {
      registerData.phoneVerified = userData.phoneVerified;
    }
    
    const response = await api.post(API_ENDPOINTS.REGISTER, registerData);
    return response;
  },

  // Login
  login: async (email: string, password: string, userType?: string): Promise<any> => {
    // Normalize inputs
    const normalizedEmail = email.trim().toLowerCase();
    // CRITICAL: userType is required - default to 'buyer' if not provided
    const normalizedUserType = (userType && typeof userType === 'string' ? userType : 'buyer').toLowerCase();
    
    // Login request MUST include userType (as per guide)
    const loginData: any = {
      email: normalizedEmail,
      password: password,
      userType: normalizedUserType, // CRITICAL: Must include this
    };
    
    console.log('[AuthService] Login request:', {email: normalizedEmail, userType: normalizedUserType});
    console.log('[AuthService] Request body:', JSON.stringify(loginData));
    
    try {
      const response: any = await api.post(API_ENDPOINTS.LOGIN, loginData);
      console.log('[AuthService] Response code: 200');
      console.log('[AuthService] Login response:', JSON.stringify(response, null, 2));
      console.log('[AuthService] Response success:', response?.success);
      console.log('[AuthService] Response data:', response?.data);
      
      // Check if response is successful
      if (!response || !response.success) {
        const errorMsg = response?.message || 'Login failed. Please check your credentials.';
        console.error('[AuthService] Login not successful:', errorMsg);
        throw {
          success: false,
          message: errorMsg,
          status: response?.status || 400,
          error: response,
        };
      }
      
      // Handle success - save token and user data
      if (response.success && response.data?.token) {
        await AsyncStorage.setItem('@auth_token', response.data.token);
        await AsyncStorage.setItem(
          '@propertyapp_user',
          JSON.stringify(response.data.user),
        );
        console.log('[AuthService] Token and user data saved successfully');
      } else {
        console.warn('[AuthService] No token in response:', response);
      }
      
      return response;
    } catch (error: any) {
      console.error('[AuthService] Login error:', error);
      console.log('[AuthService] Error status:', error.status);
      console.log('[AuthService] Error message:', error.message);
      console.log('[AuthService] Error body:', JSON.stringify(error, null, 2));
      
      // Handle 403 errors - Wrong userType (as per guide)
      if (error.status === 403) {
        // Extract error message from various possible formats
        let errorMessage = error.message || 'Access denied. You don\'t have permission to access this dashboard.';
        
        // Try to get message from error.error or error.response
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.error?.data?.message) {
          errorMessage = error.error.data.message;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }
        
        console.log('[AuthService] 403 Error - Role access denied:', errorMessage);
        
        // Auto-detect correct userType from error message (as per guide)
        // Only auto-retry for agents (they can only login as agent)
        // For buyer/seller, don't auto-retry - let user choose
        let correctType: string | null = null;
        if (errorMessage.includes('Agent/Builder')) {
          correctType = 'agent';
        } else if (errorMessage.includes('Buyer/Tenant') && normalizedUserType !== 'buyer') {
          // Only suggest buyer if they're not already trying buyer
          correctType = 'buyer';
        } else if (errorMessage.includes('Seller/Owner') && normalizedUserType !== 'seller') {
          // Only suggest seller if they're not already trying seller
          correctType = 'seller';
        }
        
        // Auto-retry ONLY for agents (they can only login as agent)
        // For buyer/seller switching, show error and let user manually select
        if (correctType === 'agent' && correctType !== normalizedUserType) {
          console.log('[AuthService] Auto-retrying with agent userType');
          try {
            return await authService.login(email, password, 'agent');
          } catch (retryError: any) {
            console.error('[AuthService] Auto-retry also failed:', retryError);
            // Fall through to throw error
          }
        }
        
        // Create a structured error response
        const errorResponse = {
          success: false,
          message: errorMessage,
          status: 403,
          error: error,
        };
        
        // Add suggested user type
        if (correctType) {
          (errorResponse as any).data = {suggestedUserType: correctType};
        }
        
        throw errorResponse;
      }
      
      // Handle validation errors (400)
      if (error.status === 400) {
        const errorMessage = error.message || error.error?.message || 'Validation failed. Please check your email, password, and selected role.';
        throw {
          success: false,
          message: errorMessage,
          status: 400,
          error: error,
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  },

  // Verify OTP (exact backend structure: user_id, otp, phone)
  verifyOTP: async (userId: number, otp: string, phone?: string) => {
    const response: any = await api.post(API_ENDPOINTS.VERIFY_OTP, {
      user_id: userId,
      otp,
      phone: phone || '', // Phone is optional but backend may need it
    });
    
    if (response && response.success && response.data?.token) {
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
  // Uses correct endpoint based on user type: /api/buyer/profile/get.php or /api/seller/profile/get.php
  // Note: userType here is the login type (buyer/seller/agent), not the registered type
  getCurrentUser: async (userType?: string) => {
    try {
      // Determine user type from parameter or from stored user data
      let finalUserType = userType;
      if (!finalUserType) {
        try {
          const userData = await AsyncStorage.getItem('@propertyapp_user');
          if (userData) {
            const parsed = JSON.parse(userData);
            finalUserType = parsed.user_type;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Normalize user type
      const normalizedUserType = finalUserType?.toLowerCase() || 'buyer';
      
      // Use correct endpoint based on user type
      // Buyers and Sellers use different endpoints, Agents might use seller endpoint or need their own
      let endpoint: string;
      if (normalizedUserType === 'buyer') {
        endpoint = API_ENDPOINTS.BUYER_PROFILE_GET;
      } else if (normalizedUserType === 'seller') {
        endpoint = API_ENDPOINTS.SELLER_PROFILE_GET;
      } else if (normalizedUserType === 'agent') {
        // Agents might use seller endpoint or need their own endpoint
        // For now, use seller endpoint (backend might handle it)
        endpoint = API_ENDPOINTS.SELLER_PROFILE_GET;
      } else {
        // Default to buyer for unknown types
        endpoint = API_ENDPOINTS.BUYER_PROFILE_GET;
      }
      
      console.log('[AuthService] Fetching profile from:', endpoint, 'for userType:', normalizedUserType);
      
      const response = await api.get(endpoint);
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

  // Refresh Token (workaround - backend doesn't have this endpoint yet)
  // When backend implements /auth/refresh-token.php, this will work
  refreshToken: async (refreshToken?: string) => {
    try {
      // Backend endpoint not implemented yet
      // When implemented, it should accept: { "refreshToken": "..." }
      // And return: { "success": true, "data": { "token": "new_jwt_token", "refreshToken": "new_refresh_token" } }
      
      const response: any = await api.post(API_ENDPOINTS.REFRESH_TOKEN, {
        refreshToken: refreshToken || '',
      });
      
      if (response && response.success && response.data?.token) {
        await AsyncStorage.setItem('@auth_token', response.data.token);
        if (response.data.refreshToken) {
          await AsyncStorage.setItem('@refresh_token', response.data.refreshToken);
        }
      }
      
      return response;
    } catch (error: any) {
      // Endpoint doesn't exist yet - return error
      console.warn('Refresh token endpoint not available:', error);
      throw new Error('Token refresh not available. Please login again.');
    }
  },

  // Verify Email (using OTP verify-email endpoint)
  verifyEmail: async (email: string, otp: string) => {
    const response: any = await api.post(API_ENDPOINTS.OTP_VERIFY_EMAIL, {
      email,
      otp,
    });
    return response;
  },

  // Delete Account (user self-delete - backend endpoint not implemented yet)
  deleteAccount: async (password?: string) => {
    try {
      const response: any = await api.delete(API_ENDPOINTS.DELETE_ACCOUNT, {
        data: password ? {password} : {},
      });
      
      if (response && response.success) {
        // Clear local storage on successful deletion
        await AsyncStorage.removeItem('@auth_token');
        await AsyncStorage.removeItem('@propertyapp_user');
        await AsyncStorage.removeItem('@refresh_token');
      }
      
      return response;
    } catch (error: any) {
      // Endpoint doesn't exist yet
      if (error.status === 404) {
        throw new Error('Delete account endpoint not available. Please contact support.');
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
      await AsyncStorage.removeItem('@refresh_token');
    }
  },
};
