import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export const otpService = {
  // Send SMS OTP (returns data.reqId as per guide)
  sendSMS: async (phone: string) => {
    const response = await api.post(API_ENDPOINTS.OTP_SEND_SMS, {phone});
    // Response format: { "success": true, "message": "OTP sent", "data": { "reqId": 123, "otpId": 123 } }
    // Store reqId if needed for verification
    if (response.success && response.data?.reqId) {
      console.log('[OTP] Request ID:', response.data.reqId);
    }
    return response;
  },

  // Verify SMS OTP
  verifySMS: async (phone: string, otp: string) => {
    const response = await api.post(API_ENDPOINTS.OTP_VERIFY_SMS, {
      phone,
      otp,
    });
    return response;
  },

  // Send Email OTP
  sendEmail: async (email: string) => {
    const response = await api.post(API_ENDPOINTS.OTP_SEND_EMAIL, {email});
    return response;
  },

  // Verify Email OTP
  verifyEmail: async (email: string, otp: string) => {
    const response = await api.post(API_ENDPOINTS.OTP_VERIFY_EMAIL, {
      email,
      otp,
    });
    return response;
  },

  // Resend SMS OTP
  resendSMS: async (phone: string) => {
    const response = await api.post(API_ENDPOINTS.OTP_RESEND_SMS, {phone});
    return response;
  },
};

