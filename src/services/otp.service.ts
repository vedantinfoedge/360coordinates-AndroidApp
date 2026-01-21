import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';
import {MSG91_CONFIG} from '../config/msg91.config';

/**
 * OTP Service
 * 
 * Uses MSG91 REST API directly (recommended approach for React Native)
 * Falls back to backend API if MSG91 REST API fails
 */
export const otpService = {
  // Send SMS OTP using MSG91 SDK first, then fallback to backend API
  // Strategy: SDK first → Backend fallback (NO REST API)
  // context: 'register' | 'forgotPassword' - determines which widget to use
  // Returns: { success, message, data, reqId?, token?, method: 'msg91-sdk' | 'backend' }
  sendSMS: async (phone: string, context: 'register' | 'forgotPassword' = 'register') => {
    // PRIMARY: Try MSG91 Native SDK first
    try {
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');
      
      // Switch to correct widget based on context
      const {switchToSMSWidget, switchToForgotPasswordWidget} = require('../config/msg91.config');
      
      // Ensure widget is initialized and switched correctly
      try {
        if (context === 'forgotPassword') {
          await switchToForgotPasswordWidget();
        } else {
          await switchToSMSWidget();
        }
      } catch (switchError) {
        // If switching fails, try to initialize first
        console.warn('[OTP] Widget switch failed, initializing:', switchError);
        const {initializeMSG91} = require('../config/msg91.config');
        await initializeMSG91();
        // Try switching again
        if (context === 'forgotPassword') {
          await switchToForgotPasswordWidget();
        } else {
          await switchToSMSWidget();
        }
      }
      
      // Format phone number for MSG91 SDK (91XXXXXXXXXX, no + sign)
      let formattedPhone = phone.replace(/^\+/, ''); // Remove + if present
      if (!formattedPhone.startsWith('91')) {
        // If it's a 10-digit number, add 91 prefix
        if (formattedPhone.length === 10) {
          formattedPhone = `91${formattedPhone}`;
        }
      }
      
      console.log(`[MSG91] Attempting to send OTP via Native SDK (${context}):`, {
        widgetType: context === 'forgotPassword' ? 'forgotPassword' : 'register',
        mobile: formattedPhone,
        mobileLength: formattedPhone.length,
        note: 'Using OTPWidget.sendOTP() native SDK method',
      });
      
      // Call MSG91 Native SDK (per SDK documentation)
      const data = {
        identifier: formattedPhone, // Phone number with country code (91XXXXXXXXXX)
      };
      
      const response = await OTPWidget.sendOTP(data);
      console.log(`[MSG91] SMS OTP Native SDK response (${context}):`, response);
      
      // Check for authentication errors (401)
      if (response && (response.code === '401' || response.code === 401 || (response.type === 'error' && response.message === 'AuthenticationFailure'))) {
        console.warn('[MSG91] Authentication failed (401) - Widget credentials may be incorrect.');
        throw new Error('MSG91 Authentication Failure - Invalid widget credentials. Please check Widget ID and Token ID in msg91.config.ts');
      }
      
      // MSG91 SDK response format may vary, normalize it
      if (response && (response.success || response.status === 'success' || response.type === 'success')) {
        // Extract reqId from response (required for verifyOTP)
        const reqId = response.reqId || 
                     response.data?.reqId || 
                     response.requestId ||
                     response.data?.requestId;
        
        // Extract token from MSG91 response
        const token = response.token || 
                     response.data?.token || 
                     response.data?.verificationToken ||
                     response.verificationToken ||
                     response.data?.phoneVerificationToken ||
                     response.message; // Sometimes token is in message field
        
        console.log(`[MSG91] ✅ OTP sent successfully via Native SDK (${context}):`, {
          reqId: reqId,
          token: token ? `${token.substring(0, 20)}...` : 'not provided',
          message: response.message || 'OTP sent successfully',
        });
        
        return {
          success: true,
          message: response.message || 'OTP sent successfully to your phone',
          data: response,
          reqId: reqId, // Store reqId for verification
          token: token, // Extract token for registration
          method: 'msg91-sdk', // Indicate this came from MSG91 Native SDK
        };
      } else {
        // If MSG91 SDK returns failure response
        const errorMsg = response?.message || response?.error || 'MSG91 SDK returned failure response';
        console.error('[MSG91] Native SDK returned failure:', errorMsg);
        throw new Error(`MSG91 SDK failed: ${errorMsg}`);
      }
    } catch (sdkError: any) {
      // Fallback to backend API if SDK fails
      const sdkErrorMessage = sdkError.message || sdkError.toString();
      console.warn(`[OTP] MSG91 Native SDK failed (${context}), falling back to backend API:`, sdkErrorMessage);
      
      try {
        // Format phone for backend API: Backend expects +91XXXXXXXXXX
        let backendPhone = phone.replace(/^\+/, ''); // Remove + if present
        if (backendPhone.startsWith('91') && backendPhone.length === 12) {
          // Format: 91XXXXXXXXXX -> +91XXXXXXXXXX
          backendPhone = `+${backendPhone}`;
        } else if (backendPhone.length === 10) {
          // Format: XXXXXXXXXX -> +91XXXXXXXXXX
          backendPhone = `+91${backendPhone}`;
        } else if (!backendPhone.startsWith('+')) {
          // If it doesn't start with +, add it
          backendPhone = `+${backendPhone}`;
        }
        
        console.log(`[OTP] Attempting backend API fallback (${context}):`, {
          phone: backendPhone,
          endpoint: API_ENDPOINTS.OTP_SEND_SMS,
        });
        
        const response = await api.post(API_ENDPOINTS.OTP_SEND_SMS, {phone: backendPhone});
        
        // Response format: { "success": true, "message": "OTP sent", "data": { "reqId": 123, "otpId": 123 } }
        // Store reqId if needed for verification
        if (response.success && response.data?.reqId) {
          console.log('[OTP] Backend API Request ID:', response.data.reqId);
        }
        
        console.log(`[OTP] ✅ OTP sent successfully via backend API (${context})`);
        
        return {
          ...response,
          method: 'backend', // Indicate this came from backend API
        };
      } catch (apiError: any) {
        // Log full error details for debugging
        console.error('[OTP] Backend API also failed:', {
          status: apiError.status,
          message: apiError.message,
          error: apiError.error,
          responseData: apiError.response?.data,
        });
        
        // Extract better error message from 500 errors
        let backendErrorMessage = 'Failed to send OTP';
        
        if (apiError.status === 500) {
          const errorData = apiError.response?.data || apiError.error;
          const responseHeaders = apiError.response?.headers || apiError.responseHeaders || {};
          const contentLength = responseHeaders['content-length'] || responseHeaders['Content-Length'];
          
          // Check if response is empty
          if (contentLength === '0' || contentLength === 0 || (!errorData || (typeof errorData === 'string' && errorData.length === 0))) {
            backendErrorMessage = 'Server error: Empty response from backend. The server may be experiencing issues. Please try again later or contact support.';
          } else if (typeof errorData === 'string' && errorData.length > 0 && errorData.length < 500) {
            try {
              const parsed = JSON.parse(errorData);
              backendErrorMessage = parsed.message || parsed.error || 'Server error occurred. Please try again later.';
            } catch {
              if (!errorData.includes('<!DOCTYPE') && !errorData.includes('<html')) {
                backendErrorMessage = errorData;
              } else {
                backendErrorMessage = 'Server error occurred. Please contact support or try again later.';
              }
            }
          } else if (errorData?.message) {
            backendErrorMessage = errorData.message;
          } else if (errorData?.error) {
            backendErrorMessage = errorData.error;
          } else {
            backendErrorMessage = apiError.message || 'Server error occurred. Please try again later.';
          }
        } else {
          backendErrorMessage = apiError.message || apiError.error?.message || 'Failed to send OTP';
        }
        
        throw {
          ...apiError,
          message: backendErrorMessage,
          originalError: sdkError, // Include original MSG91 error for debugging
        };
      }
    }
  },

  // Verify SMS OTP using MSG91 SDK first, then fallback to backend API
  // Strategy: SDK first → Notify backend on success OR Backend fallback on failure
  // reqId: Optional reqId from sendOTP response (required for SDK verification)
  // context: 'register' | 'forgotPassword' - determines which widget was used
  // method: Optional method indicator ('msg91-sdk' | 'backend' | undefined)
  // Returns: { success, message, data, method: 'msg91-sdk' | 'backend' }
  verifySMS: async (phone: string, otp: string, reqId?: string, context: 'register' | 'forgotPassword' = 'register', method?: 'msg91-sdk' | 'msg91-rest' | 'backend') => {
    // Format phone number for backend API: Backend expects +91XXXXXXXXXX
    const formatPhoneForBackend = (phoneNum: string): string => {
      let formatted = phoneNum.replace(/^\+/, ''); // Remove + if present
      if (formatted.startsWith('91') && formatted.length === 12) {
        return `+${formatted}`;
      } else if (formatted.length === 10) {
        return `+91${formatted}`;
      } else if (!formatted.startsWith('+')) {
        return `+${formatted}`;
      }
      return phoneNum; // Already formatted
    };
    
    // Format phone number for MSG91 SDK (mobile number without +, 12 digits: 91XXXXXXXXXX)
    const formatPhoneForMSG91 = (phoneNum: string): string => {
      let formatted = phoneNum.replace(/^\+/, ''); // Remove + if present
      if (formatted.startsWith('91') && formatted.length === 12) {
        return formatted; // Already 91XXXXXXXXXX
      } else if (formatted.length === 10) {
        return `91${formatted}`; // Convert 10 digits to 91XXXXXXXXXX
      } else if (!formatted.startsWith('91')) {
        // If it doesn't start with 91, add it
        return `91${formatted.slice(-10)}`; // Take last 10 digits and add 91
      }
      return formatted;
    };
    
    const formattedPhoneForBackend = formatPhoneForBackend(phone);
    const formattedPhoneForMSG91 = formatPhoneForMSG91(phone);
    
    // PRIMARY: Try MSG91 Native SDK first (if reqId is available and method allows SDK)
    // Method can be 'msg91-sdk', undefined (try SDK), or 'msg91-rest' (legacy support)
    if ((method === 'msg91-sdk' || !method || method === 'msg91-rest') && reqId) {
      try {
        const {OTPWidget} = require('@msg91comm/sendotp-react-native');
        
        // Switch to correct widget based on context
        const {switchToSMSWidget, switchToForgotPasswordWidget} = require('../config/msg91.config');
        
        try {
          if (context === 'forgotPassword') {
            await switchToForgotPasswordWidget();
          } else {
            await switchToSMSWidget();
          }
        } catch (switchError) {
          // If switching fails, try to initialize first
          console.warn('[OTP] Widget switch failed during verification, initializing:', switchError);
          const {initializeMSG91} = require('../config/msg91.config');
          await initializeMSG91();
          // Try switching again
          if (context === 'forgotPassword') {
            await switchToForgotPasswordWidget();
          } else {
            await switchToSMSWidget();
          }
        }
        
        console.log(`[MSG91] Attempting to verify OTP via Native SDK (${context}):`, {
          reqId: reqId ? `${reqId.substring(0, 15)}...` : 'MISSING',
          otp: otp,
          phone: formattedPhoneForMSG91,
        });
        
        // Call MSG91 Native SDK verifyOTP (requires reqId from sendOTP)
        const data = {
          reqId: reqId,
          otp: otp,
        };
        
        const response = await OTPWidget.verifyOTP(data);
        console.log(`[MSG91] SMS OTP Native SDK verification response (${context}):`, response);
        
        // Check for authentication errors (401)
        if (response && (response.code === '401' || response.code === 401 || (response.type === 'error' && response.message === 'AuthenticationFailure'))) {
          console.warn('[MSG91] Authentication failed (401) during verification - Widget credentials may be incorrect.');
          throw new Error('MSG91 Authentication Failure - Invalid widget credentials.');
        }
        
        // MSG91 SDK response format may vary, normalize it
        if (response && (response.success || response.status === 'success' || response.type === 'success' || response.verified)) {
          console.log(`[MSG91] ✅ OTP verified successfully via Native SDK (${context})`);
          
          // Extract verification token from response
          const verificationToken = response.token || 
                                   response.data?.token || 
                                   response.data?.verificationToken ||
                                   response.verificationToken ||
                                   response.data?.phoneVerificationToken ||
                                   reqId; // Use reqId as fallback token
          
          // Notify backend of successful SDK verification for audit trail
          try {
            console.log(`[OTP] Notifying backend of successful SDK verification (${context})`);
            await api.post(API_ENDPOINTS.OTP_VERIFY_MSG91_TOKEN, {
              phone: formattedPhoneForBackend,
              otp: otp,
              token: verificationToken,
              reqId: reqId,
              context: context,
            });
            console.log(`[OTP] ✅ Backend notified of SDK verification success (${context})`);
          } catch (backendNotifyError: any) {
            // Log error but don't fail the verification (SDK verification already succeeded)
            console.warn(`[OTP] Failed to notify backend of SDK verification (non-critical):`, {
              error: backendNotifyError.message || backendNotifyError,
              context: context,
              note: 'SDK verification succeeded, backend notification failed',
            });
          }
          
          return {
            success: true,
            message: 'SMS OTP verified successfully',
            data: response,
            token: verificationToken,
            method: 'msg91-sdk',
          };
        } else {
          // If MSG91 SDK returns failure response
          const errorMsg = response?.message || response?.error || 'MSG91 SDK verification returned failure response';
          console.error('[MSG91] Native SDK verification returned failure:', errorMsg);
          throw new Error(`MSG91 SDK verification failed: ${errorMsg}`);
        }
      } catch (sdkError: any) {
        // Fallback to backend API if SDK fails
        const sdkErrorMessage = sdkError.message || sdkError.toString();
        console.warn(`[OTP] MSG91 Native SDK verification failed (${context}), falling back to backend API:`, sdkErrorMessage);
        
        // Continue to backend fallback below
      }
    }
    
    // FALLBACK: Use backend API for verification
    try {
      console.log(`[OTP] Attempting backend API verification (${context}):`, {
        phone: formattedPhoneForBackend,
        endpoint: API_ENDPOINTS.OTP_VERIFY_SMS,
      });
      
      const response = await api.post(API_ENDPOINTS.OTP_VERIFY_SMS, {
        phone: formattedPhoneForBackend,
        otp,
      });
      
      console.log(`[OTP] ✅ Backend API verification successful (${context})`);
      return {
        ...response,
        method: 'backend',
      };
    } catch (apiError: any) {
      console.error('[OTP] Backend API verification failed:', {
        error: apiError.message || apiError,
        status: apiError.status,
      });
      throw apiError;
    }
  },

  // Send Email OTP using MSG91 SDK
  // Returns: { success, message, data, token? } where token is extracted from MSG91 widget response
  sendEmail: async (email: string) => {
    try {
      // Try MSG91 SDK first
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');
      
      // Ensure widget is initialized before switching
      try {
        // Switch to Email widget
        await switchToEmailWidget();
      } catch (switchError) {
        // If switching fails, try to initialize first
        console.warn('[OTP] Widget switch failed, initializing:', switchError);
        const {initializeMSG91} = require('../config/msg91.config');
        await initializeMSG91();
        // Try switching again
        await switchToEmailWidget();
      }
      
      const data = {
        identifier: email, // Email address for email OTP
      };
      
      const response = await OTPWidget.sendOTP(data);
      
      console.log('[MSG91] Email OTP sent:', response);
      
      // Check for authentication errors (401)
      if (response && (response.code === '401' || response.code === 401 || response.type === 'error' && response.message === 'AuthenticationFailure')) {
        console.warn('[MSG91] Authentication failed (401) - Widget credentials may be incorrect. Falling back to backend API.');
        throw new Error('MSG91 Authentication Failure - Invalid credentials');
      }
      
      // MSG91 response format may vary, normalize it
      if (response && (response.success || response.status === 'success' || response.type === 'success')) {
        // FIX: Extract reqId from response (required for verifyOTP)
        const reqId = response.reqId || 
                     response.data?.reqId || 
                     response.requestId ||
                     response.data?.requestId;
        
        // Extract token from MSG91 response
        // Token might be in: response.token, response.data.token, response.data.verificationToken, etc.
        const token = response.token || 
                     response.data?.token || 
                     response.data?.verificationToken ||
                     response.verificationToken ||
                     response.data?.emailVerificationToken;
        
        return {
          success: true,
          message: 'OTP sent successfully to your email',
          data: response,
          reqId: reqId, // Store reqId for verification
          token: token, // Extract token for registration
          method: 'widget', // Indicate this came from MSG91 widget
        };
      } else {
        // If MSG91 fails, fall back to backend API
        console.warn('[MSG91] Email OTP failed - Response:', response);
        throw new Error('MSG91 Email OTP failed, trying backend');
      }
    } catch (error: any) {
      // Fallback to backend API if MSG91 is not available or fails
      const errorMessage = error.message || error.toString();
      const isAuthError = errorMessage.includes('Authentication') || errorMessage.includes('401');
      
      if (isAuthError) {
        console.warn('[OTP] MSG91 authentication failed - Widget credentials may be incorrect. Using backend API instead.');
      } else {
        console.log('[OTP] MSG91 widget failed, falling back to backend API:', errorMessage);
      }
      
      try {
        const response = await api.post(API_ENDPOINTS.OTP_SEND_EMAIL, {email});
        // Backend response format: { success, message, data: { otpId?, reqId? } }
        return {
          ...response,
          method: 'backend', // Indicate this came from backend API
        };
      } catch (apiError: any) {
        // Log full error details for debugging
        console.error('[OTP] Backend API also failed:', JSON.stringify({
          status: apiError.status,
          message: apiError.message,
          error: apiError.error,
          responseData: apiError.response?.data,
          responseStatus: apiError.response?.status,
          responseHeaders: apiError.response?.headers,
        }, null, 2));
        
        // Extract better error message from 500 errors
        let backendErrorMessage = 'Failed to send OTP';
        
        if (apiError.status === 500) {
          // Try to extract error message from response
          const errorData = apiError.response?.data || apiError.error;
          const responseHeaders = apiError.response?.headers || apiError.responseHeaders || {};
          const contentLength = responseHeaders['content-length'] || responseHeaders['Content-Length'];
          
          // Check if response is empty (content-length: 0 or no data)
          if (contentLength === '0' || contentLength === 0 || (!errorData || (typeof errorData === 'string' && errorData.length === 0))) {
            backendErrorMessage = 'Server error: Empty response from backend. The server may be experiencing issues. Please try again later or contact support.';
          } else if (typeof errorData === 'string' && errorData.length > 0 && errorData.length < 500) {
            try {
              const parsed = JSON.parse(errorData);
              backendErrorMessage = parsed.message || parsed.error || 'Server error occurred. Please try again later.';
            } catch {
              // If not JSON, check if it's a readable error message
              if (!errorData.includes('<!DOCTYPE') && !errorData.includes('<html')) {
                backendErrorMessage = errorData;
              } else {
                backendErrorMessage = 'Server error occurred. Please contact support or try again later.';
              }
            }
          } else if (errorData?.message) {
            backendErrorMessage = errorData.message;
          } else if (errorData?.error) {
            backendErrorMessage = errorData.error;
          } else {
            backendErrorMessage = apiError.message || 'Server error occurred. Please try again later.';
          }
        } else {
          backendErrorMessage = apiError.message || apiError.error?.message || 'Failed to send OTP';
        }
        
        throw {
          ...apiError,
          message: backendErrorMessage,
          originalError: error, // Include original MSG91 error for debugging
        };
      }
    }
  },

  // Verify Email OTP using MSG91 SDK
  // reqId: Optional reqId from sendOTP response (required for widget verification)
  // If MSG91 widget was used, verify with widget. Otherwise verify with backend.
  verifyEmail: async (email: string, otp: string, reqId?: string, method?: 'widget' | 'backend') => {
    // If method is 'backend' or not specified, try backend first (for fallback cases)
    if (method === 'backend' || !method) {
      try {
        const response = await api.post(API_ENDPOINTS.OTP_VERIFY_EMAIL, {
          email,
          otp,
        });
        return response;
      } catch (apiError: any) {
        // If backend fails and method wasn't explicitly 'backend', try MSG91 widget
        if (method !== 'backend') {
          console.log('[OTP] Backend verification failed, trying MSG91 widget:', apiError.message || apiError);
        } else {
          throw apiError;
        }
      }
    }
    
    // Try MSG91 SDK verification (requires reqId from sendOTP)
    if (reqId && method === 'widget') {
      try {
        const {OTPWidget} = require('@msg91comm/sendotp-react-native');
        
        // Switch to Email widget
        await switchToEmailWidget();
        
        // FIX: Use reqId instead of identifier (per MSG91 SDK docs)
        const data = {
          reqId: reqId,
          otp: otp,
        };
        
        const response = await OTPWidget.verifyOTP(data);
        
        console.log('[MSG91] Email OTP verification:', response);
        
        // MSG91 response format may vary, normalize it
        if (response && (response.success || response.status === 'success' || response.type === 'success' || response.verified)) {
          return {
            success: true,
            message: 'Email OTP verified successfully',
            data: response,
            method: 'widget',
          };
        } else {
          // If MSG91 verification fails, fall back to backend API
          throw new Error('MSG91 Email verification failed, trying backend');
        }
      } catch (error: any) {
        // Fallback to backend API if MSG91 is not available or fails
        console.log('[OTP] MSG91 widget verification failed, using backend API:', error.message || error);
        try {
          const response = await api.post(API_ENDPOINTS.OTP_VERIFY_EMAIL, {
            email,
            otp,
          });
          return {
            ...response,
            method: 'backend',
          };
        } catch (apiError: any) {
          console.error('[OTP] Backend API verification also failed:', apiError);
          throw apiError;
        }
      }
    } else {
      // No reqId provided or method is not 'widget', use backend
      try {
        const response = await api.post(API_ENDPOINTS.OTP_VERIFY_EMAIL, {
          email,
          otp,
        });
        return {
          ...response,
          method: 'backend',
        };
      } catch (apiError: any) {
        console.error('[OTP] Backend API verification failed:', apiError);
        throw apiError;
      }
    }
  },

  // Resend SMS OTP (using MSG91 SDK)
  // context: 'register' | 'forgotPassword' - determines which widget to use
  resendSMS: async (phone: string, context: 'register' | 'forgotPassword' = 'register') => {
    console.log(`[OTP] Resending SMS OTP (${context}) to:`, phone);
    console.log(`[OTP] Resend will use same flow as sendSMS: Native SDK → Backend fallback`);
    // Resending is same as sending
    const result = await otpService.sendSMS(phone, context);
    console.log(`[OTP] Resend SMS result:`, {
      success: result.success,
      method: result.method,
      reqId: result.reqId,
      message: result.message,
    });
    return result;
  },

  // Resend Email OTP (using MSG91 SDK)
  resendEmail: async (email: string) => {
    // Resending is same as sending
    return otpService.sendEmail(email);
  },

  // Retry SMS OTP by calling sendOTP again with the same phone number
  // Note: Retry is done by calling sendOTP again (SDK first → Backend fallback)
  // reqId: Request ID from sendOTP response (not used, but kept for compatibility)
  // phone: Phone number to resend OTP to (required)
  // channel: Optional channel code ('SMS-11', 'VOICE-4', 'EMAIL-3', 'WHATSAPP-12') - not used in SDK, but kept for compatibility
  // context: 'register' | 'forgotPassword' - determines which widget to use
  retrySMS: async (reqId: string, phone?: string, channel?: 'SMS-11' | 'VOICE-4' | 'EMAIL-3' | 'WHATSAPP-12', context: 'register' | 'forgotPassword' = 'register') => {
    // Retry is just calling sendOTP again with the same phone number
    // If phone is not provided, we can't retry - this shouldn't happen
    if (!phone) {
      throw new Error('Phone number is required for retry SMS OTP');
    }
    
    // Note: reqId is not used, but kept in signature for compatibility
    // Note: channel is not used, but kept for compatibility
    console.log(`[OTP] Retrying SMS OTP (${context}) for phone:`, phone);
    return await otpService.sendSMS(phone, context);
  },

  // Retry Email OTP using MSG91 SDK
  // reqId: Request ID from sendOTP response
  // channel: Optional channel code ('SMS-11', 'VOICE-4', 'EMAIL-3', 'WHATSAPP-12')
  retryEmail: async (reqId: string, channel?: 'SMS-11' | 'VOICE-4' | 'EMAIL-3' | 'WHATSAPP-12') => {
    try {
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');
      
      // Switch to Email widget
      await switchToEmailWidget();
      
      const body: any = {
        reqId: reqId,
      };
      
      // Add channel if specified (extract channel code number)
      if (channel) {
        const channelCode = parseInt(channel.split('-')[1]);
        body.retryChannel = channelCode;
      }
      
      const response = await OTPWidget.retryOTP(body);
      
      console.log('[MSG91] Email OTP retry:', response);
      
      if (response && (response.success || response.status === 'success' || response.type === 'success')) {
        return {
          success: true,
          message: 'OTP resent successfully',
          data: response,
          method: 'widget',
        };
      } else {
        throw new Error('MSG91 retry failed');
      }
    } catch (error: any) {
      console.error('[OTP] MSG91 email retry failed:', error);
      // Fallback: try resending via sendEmail
      console.log('[OTP] Falling back to sendEmail for retry');
      try {
        // Note: This is a fallback - ideally reqId should be stored with email
        return await otpService.sendEmail('');
      } catch (fallbackError) {
        throw {
          ...error,
          message: error.message || 'Failed to retry OTP',
        };
      }
    }
  },
};

