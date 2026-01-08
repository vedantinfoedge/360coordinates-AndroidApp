import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export const inquiryService = {
  // Send inquiry
  sendInquiry: async (propertyId: string | number, message: string) => {
    const response = await api.post(API_ENDPOINTS.INQUIRY_SEND, {
      property_id: propertyId,
      message,
    });
    return response;
  },

  // Get inbox (seller/agent)
  getInbox: async () => {
    // Try seller endpoint first, fallback to old endpoint
    try {
      const response = await api.get(API_ENDPOINTS.SELLER_INQUIRIES_LIST);
      if (response.success) {
        return response;
      }
    } catch (error) {
      console.warn('Seller inquiries endpoint failed, trying legacy endpoint');
    }
    // Fallback to legacy endpoint
    const response = await api.get(API_ENDPOINTS.INQUIRY_INBOX);
    return response;
  },

  // Get sent inquiries (buyer)
  getSentInquiries: async () => {
    const response = await api.get(API_ENDPOINTS.INQUIRY_SENT);
    return response;
  },

  // Mark as read
  markAsRead: async (inquiryId: string | number) => {
    const response = await api.put(API_ENDPOINTS.INQUIRY_MARK_READ, {
      inquiry_id: inquiryId,
    });
    return response;
  },

  // Reply to inquiry
  replyToInquiry: async (inquiryId: string | number, message: string) => {
    const response = await api.post(API_ENDPOINTS.INQUIRY_REPLY, {
      inquiry_id: inquiryId,
      message,
    });
    return response;
  },
};
