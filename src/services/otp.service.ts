import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';
import {MSG91_CONFIG, switchToSMSWidget, switchToEmailWidget, switchToForgotPasswordWidget} from '../config/msg91.config';

/**
 * OTP Service
 * 
 * Uses MSG91 SDK for both Email and SMS OTP (client-side)
 * Falls back to backend API if MSG91 is not available
 */
export const otpService = {
  // Send SMS OTP using MSG91 SDK
  // context: 'register' | 'forgotPassword' - determines which widget to use
  // skipMSG91: If true, skip MSG91 SDK and use backend API directly
  // Returns: { success, message, data, token? } where token is extracted from MSG91 widget response
  sendSMS: async (phone: string, context: 'register' | 'forgotPassword' = 'register', skipMSG91: boolean = false) => {
    // If skipMSG91 is true, go directly to backend API
    if (skipMSG91) {
      console.log('[OTP] Skipping MSG91 SDK, using backend API directly');
      // Format phone for backend API
      let backendPhone = phone.replace(/^\+/, '');
      if (backendPhone.startsWith('91') && backendPhone.length === 12) {
        backendPhone = `+${backendPhone}`;
      } else if (backendPhone.length === 10) {
        backendPhone = `+91${backendPhone}`;
      } else if (!backendPhone.startsWith('+')) {
        backendPhone = `+${backendPhone}`;
      }
      
      try {
        const response = await api.post(API_ENDPOINTS.OTP_SEND_SMS, {phone: backendPhone});
        if (response.success && response.data?.reqId) {
          console.log('[OTP] Request ID:', response.data.reqId);
        }
        return {
          ...response,
          method: 'backend',
        };
      } catch (apiError: any) {
        // Format error consistently with main flow
        let backendErrorMessage = 'Failed to send OTP';
        
        if (apiError.status === 500) {
          const errorData = apiError.response?.data || apiError.error;
          if (typeof errorData === 'string' && errorData.length > 0 && errorData.length < 500) {
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
        };
      }
    }
    
    try {
      // Try MSG91 SDK first
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');
      
      // Ensure widget is initialized before switching
      try {
        // Switch to appropriate widget based on context
        if (context === 'forgotPassword') {
          await switchToForgotPasswordWidget();
        } else {
          await switchToSMSWidget(); // Registration SMS widget
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
      
      // FIX: Format phone number without + sign (per MSG91 SDK docs: "must contain the country code without +")
      let formattedPhone = phone.replace(/^\+/, ''); // Remove + if present
      if (!formattedPhone.startsWith('91')) {
        formattedPhone = `91${formattedPhone}`;
      }
      
      const data = {
        identifier: formattedPhone, // Phone number for SMS OTP (format: 91XXXXXXXXXX)
      };
      
      const response = await OTPWidget.sendOTP(data);
      
      console.log(`[MSG91] SMS OTP sent (${context}):`, response);
      
      // Check for specific MSG91 errors FIRST (before checking success)
      // MSG91 can return errors in multiple formats: type='error', status='fail', hasError=true
      if (response && (response.type === 'error' || response.status === 'fail' || response.hasError === true)) {
        // Check for IP blocked error (code 408)
        if (response.message === 'IPBlocked' || response.code === '408' || response.code === 408) {
          console.warn('[MSG91] IP address is blocked. Please whitelist your IP in MSG91 dashboard or disable IP whitelisting. Falling back to backend API.');
          throw new Error('MSG91 IP Blocked - Your IP address is blocked. Please whitelist your IP in MSG91 dashboard or disable IP whitelisting.');
        }
        // Check for mobile integration not enabled error
        if (response.message && response.message.includes('Mobile requests are not allowed')) {
          console.warn('[MSG91] Mobile Integration not enabled for this widget. Please enable "Mobile Integration" in MSG91 dashboard widget settings. Falling back to backend API.');
          throw new Error('MSG91 Mobile Integration not enabled - Please enable Mobile Integration in widget settings');
        }
        // Check for authentication errors (401)
        if (response.code === '401' || response.code === 401 || response.message === 'AuthenticationFailure') {
          console.warn('[MSG91] Authentication failed (401) - Widget credentials may be incorrect. Falling back to backend API.');
          throw new Error('MSG91 Authentication Failure - Invalid credentials');
        }
        // Generic error - will be caught and fall through to backend
        console.warn('[MSG91] Error detected in response:', response.message || 'Unknown error');
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
                     response.data?.phoneVerificationToken;
        
        return {
          success: true,
          message: 'OTP sent successfully to your phone',
          data: response,
          reqId: reqId, // Store reqId for verification
          token: token, // Extract token for registration
          method: 'widget', // Indicate this came from MSG91 widget
        };
      } else {
        // If MSG91 fails, check for specific error types before falling back
        const errorMessage = response?.message || 'Unknown error';
        const errorType = response?.type || 'unknown';
        const errorStatus = response?.status || 'unknown';
        
        console.warn(`[MSG91] SMS OTP failed (${context}) - Response:`, JSON.stringify(response, null, 2));
        console.warn(`[MSG91] Error details - message: ${errorMessage}, type: ${errorType}, status: ${errorStatus}`);
        
        // Check if it's a known error that should be handled specifically
        if (response?.hasError || response?.status === 'fail' || response?.type === 'error') {
          // Create a more descriptive error
          const descriptiveError = new Error(`MSG91 SMS OTP failed: ${errorMessage}`);
          (descriptiveError as any).response = response;
          throw descriptiveError;
        }
        
        throw new Error('MSG91 SMS OTP failed, trying backend');
      }
    } catch (error: any) {
      // Fallback to backend API if MSG91 is not available or fails
      const errorMessage = error.message || error.toString();
      const isAuthError = errorMessage.includes('Authentication') || errorMessage.includes('401');
      const isMobileIntegrationError = errorMessage.includes('Mobile Integration not enabled') || errorMessage.includes('Mobile requests are not allowed');
      const isIPBlockedError = errorMessage.includes('IP Blocked') || errorMessage.includes('IPBlocked');
      
      if (isIPBlockedError) {
        console.warn(`[OTP] MSG91 IP Blocked (${context}). Your IP address is blocked in MSG91 dashboard. Please whitelist your IP or disable IP whitelisting. Using backend API instead.`);
      } else if (isMobileIntegrationError) {
        console.warn(`[OTP] MSG91 Mobile Integration not enabled (${context}). Please enable "Mobile Integration" in MSG91 dashboard widget settings. Using backend API instead.`);
      } else if (isAuthError) {
        console.warn(`[OTP] MSG91 authentication failed (${context}) - Widget credentials may be incorrect. Using backend API instead.`);
      } else {
        console.log(`[OTP] MSG91 widget failed (${context}), falling back to backend API:`, errorMessage);
      }
      
      try {
        // Format phone for backend API: Backend expects +91XXXXXXXXXX or 10-digit number
        // Convert from MSG91 format (91XXXXXXXXXX) to backend format (+91XXXXXXXXXX)
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
        
        const response = await api.post(API_ENDPOINTS.OTP_SEND_SMS, {phone: backendPhone});
        // Response format: { "success": true, "message": "OTP sent", "data": { "reqId": 123, "otpId": 123 } }
        // Store reqId if needed for verification
        if (response.success && response.data?.reqId) {
          console.log('[OTP] Request ID:', response.data.reqId);
        }
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

  // Verify SMS OTP using MSG91 SDK
  // reqId: Optional reqId from sendOTP response (required for widget verification)
  // context: 'register' | 'forgotPassword' - determines which widget to use
  // If MSG91 widget was used, verify with widget. Otherwise verify with backend.
  verifySMS: async (phone: string, otp: string, reqId?: string, context: 'register' | 'forgotPassword' = 'register', method?: 'widget' | 'backend') => {
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
    
    const formattedPhoneForBackend = formatPhoneForBackend(phone);
    
    // If method is 'backend' or not specified, try backend first (for fallback cases)
    if (method === 'backend' || !method) {
      try {
        const response = await api.post(API_ENDPOINTS.OTP_VERIFY_SMS, {
          phone: formattedPhoneForBackend,
          otp,
        });
        return {
          ...response,
          method: 'backend',
        };
      } catch (apiError: any) {
        // If backend fails and method wasn't explicitly 'backend', try MSG91 widget
        if (method !== 'backend') {
          console.log(`[OTP] Backend verification failed (${context}), trying MSG91 widget:`, apiError.message || apiError);
        } else {
          throw apiError;
        }
      }
    }
    
    // Try MSG91 SDK verification (requires reqId from sendOTP)
    if (reqId && method === 'widget') {
      try {
        const {OTPWidget} = require('@msg91comm/sendotp-react-native');
        
        // Switch to appropriate widget based on context
        if (context === 'forgotPassword') {
          await switchToForgotPasswordWidget();
        } else {
          await switchToSMSWidget(); // Registration SMS widget
        }
        
        // FIX: Use reqId instead of identifier (per MSG91 SDK docs)
        const data = {
          reqId: reqId,
          otp: otp,
        };
        
        const response = await OTPWidget.verifyOTP(data);
        
        console.log(`[MSG91] SMS OTP verification (${context}):`, response);
        
        // MSG91 response format may vary, normalize it
        if (response && (response.success || response.status === 'success' || response.type === 'success' || response.verified)) {
          return {
            success: true,
            message: 'SMS OTP verified successfully',
            data: response,
            method: 'widget',
          };
        } else {
          // If MSG91 verification fails, fall back to backend API
          throw new Error('MSG91 SMS verification failed, trying backend');
        }
      } catch (error: any) {
        // Fallback to backend API if MSG91 is not available or fails
        console.log(`[OTP] MSG91 widget verification failed (${context}), using backend API:`, error.message || error);
        try {
          const response = await api.post(API_ENDPOINTS.OTP_VERIFY_SMS, {
            phone: formatPhoneForBackend(phone),
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
        const response = await api.post(API_ENDPOINTS.OTP_VERIFY_SMS, {
          phone: formatPhoneForBackend(phone),
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
    // Resending is same as sending
    return otpService.sendSMS(phone, context);
  },

  // Resend Email OTP (using MSG91 SDK)
  resendEmail: async (email: string) => {
    // Resending is same as sending
    return otpService.sendEmail(email);
  },

  // Retry SMS OTP using MSG91 SDK
  // reqId: Request ID from sendOTP response
  // channel: Optional channel code ('SMS-11', 'VOICE-4', 'EMAIL-3', 'WHATSAPP-12')
  // context: 'register' | 'forgotPassword' - determines which widget to use
  retrySMS: async (reqId: string, channel?: 'SMS-11' | 'VOICE-4' | 'EMAIL-3' | 'WHATSAPP-12', context: 'register' | 'forgotPassword' = 'register') => {
    try {
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');
      
      // Switch to appropriate widget based on context
      if (context === 'forgotPassword') {
        await switchToForgotPasswordWidget();
      } else {
        await switchToSMSWidget();
      }
      
      const body: any = {
        reqId: reqId,
      };
      
      // Add channel if specified (extract channel code number)
      if (channel) {
        const channelCode = parseInt(channel.split('-')[1]);
        body.retryChannel = channelCode;
      }
      
      const response = await OTPWidget.retryOTP(body);
      
      console.log(`[MSG91] SMS OTP retry (${context}):`, response);
      
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
      console.error(`[OTP] MSG91 retry failed (${context}):`, error);
      // Fallback: try resending via sendSMS
      console.log(`[OTP] Falling back to sendSMS for retry`);
      try {
        // Extract phone from reqId if possible, or use a placeholder
        // Note: This is a fallback - ideally reqId should be stored with phone
        return await otpService.sendSMS('', context);
      } catch (fallbackError) {
        throw {
          ...error,
          message: error.message || 'Failed to retry OTP',
        };
      }
    }
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

