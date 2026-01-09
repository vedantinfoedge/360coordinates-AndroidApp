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
  sendSMS: async (phone: string, context: 'register' | 'forgotPassword' = 'register') => {
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
      
      // Format phone number (ensure it starts with country code)
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      const data = {
        identifier: formattedPhone, // Phone number for SMS OTP
      };
      
      const response = await OTPWidget.sendOTP(data);
      
      console.log(`[MSG91] SMS OTP sent (${context}):`, response);
      
      // MSG91 response format may vary, normalize it
      if (response && (response.success || response.status === 'success' || response.type === 'success')) {
        return {
          success: true,
          message: 'OTP sent successfully to your phone',
          data: response,
        };
      } else {
        // If MSG91 fails, fall back to backend API
        throw new Error('MSG91 SMS OTP failed, trying backend');
      }
    } catch (error: any) {
      // Fallback to backend API if MSG91 is not available or fails
      console.warn(`[OTP] MSG91 SDK not available for SMS (${context}), using backend API:`, error);
      try {
        const response = await api.post(API_ENDPOINTS.OTP_SEND_SMS, {phone});
        // Response format: { "success": true, "message": "OTP sent", "data": { "reqId": 123, "otpId": 123 } }
        // Store reqId if needed for verification
        if (response.success && response.data?.reqId) {
          console.log('[OTP] Request ID:', response.data.reqId);
        }
        return response;
      } catch (apiError: any) {
        console.error('[OTP] Backend API also failed:', apiError);
        throw apiError;
      }
    }
  },

  // Verify SMS OTP using MSG91 SDK
  // context: 'register' | 'forgotPassword' - determines which widget to use
  verifySMS: async (phone: string, otp: string, context: 'register' | 'forgotPassword' = 'register') => {
    try {
      // Try MSG91 SDK first
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');
      
      // Switch to appropriate widget based on context
      if (context === 'forgotPassword') {
        await switchToForgotPasswordWidget();
      } else {
        await switchToSMSWidget(); // Registration SMS widget
      }
      
      // Format phone number (ensure it starts with country code)
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      const data = {
        identifier: formattedPhone,
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
        };
      } else {
        // If MSG91 verification fails, fall back to backend API
        throw new Error('MSG91 SMS verification failed, trying backend');
      }
    } catch (error: any) {
      // Fallback to backend API if MSG91 is not available or fails
      console.warn(`[OTP] MSG91 SDK verification not available for SMS (${context}), using backend API:`, error);
      try {
        const response = await api.post(API_ENDPOINTS.OTP_VERIFY_SMS, {
          phone,
          otp,
        });
        return response;
      } catch (apiError: any) {
        console.error('[OTP] Backend API verification also failed:', apiError);
        throw apiError;
      }
    }
  },

  // Send Email OTP using MSG91 SDK
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
      
      // MSG91 response format may vary, normalize it
      if (response && (response.success || response.status === 'success' || response.type === 'success')) {
        return {
          success: true,
          message: 'OTP sent successfully to your email',
          data: response,
        };
      } else {
        // If MSG91 fails, fall back to backend API
        throw new Error('MSG91 Email OTP failed, trying backend');
      }
    } catch (error: any) {
      // Fallback to backend API if MSG91 is not available or fails
      console.warn('[OTP] MSG91 SDK not available for Email, using backend API:', error);
      try {
        const response = await api.post(API_ENDPOINTS.OTP_SEND_EMAIL, {email});
        return response;
      } catch (apiError: any) {
        console.error('[OTP] Backend API also failed:', apiError);
        throw apiError;
      }
    }
  },

  // Verify Email OTP using MSG91 SDK
  verifyEmail: async (email: string, otp: string) => {
    try {
      // Try MSG91 SDK first
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');
      
      // Switch to Email widget
      await switchToEmailWidget();
      
      const data = {
        identifier: email,
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
        };
      } else {
        // If MSG91 verification fails, fall back to backend API
        throw new Error('MSG91 Email verification failed, trying backend');
      }
    } catch (error: any) {
      // Fallback to backend API if MSG91 is not available or fails
      console.warn('[OTP] MSG91 SDK verification not available for Email, using backend API:', error);
      try {
        const response = await api.post(API_ENDPOINTS.OTP_VERIFY_EMAIL, {
          email,
          otp,
        });
        return response;
      } catch (apiError: any) {
        console.error('[OTP] Backend API verification also failed:', apiError);
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
};

