import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

/**
 * Notification Service
 * 
 * Note: Backend notification endpoints need to be implemented.
 * This service is ready to use once backend endpoints are available.
 */
export const notificationService = {
  // Get all notifications for current user
  getNotifications: async (page: number = 1, limit: number = 20) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      
      const response = await api.get(
        `${API_ENDPOINTS.NOTIFICATIONS_LIST}?${params.toString()}`,
      );
      return response;
    } catch (error: any) {
      if (error.status === 404) {
        return {
          success: false,
          message: 'Notifications endpoint not available',
          data: {
            notifications: [],
            pagination: {
              current_page: page,
              total_pages: 0,
              total: 0,
            },
          },
        };
      }
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId: string | number) => {
    try {
      const response = await api.post(API_ENDPOINTS.NOTIFICATIONS_MARK_READ, {
        notification_id: notificationId,
      });
      return response;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Mark as read endpoint not available');
      }
      throw error;
    }
  },

  // Delete notification
  deleteNotification: async (notificationId: string | number) => {
    try {
      const response = await api.delete(
        `${API_ENDPOINTS.NOTIFICATIONS_DELETE}?id=${notificationId}`,
      );
      return response;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Delete notification endpoint not available');
      }
      throw error;
    }
  },

  // Register device for push notifications (FCM)
  registerDevice: async (fcmToken: string, deviceType: string = 'android', deviceId?: string) => {
    try {
      const response = await api.post(API_ENDPOINTS.NOTIFICATIONS_REGISTER_DEVICE, {
        fcmToken,
        deviceType,
        deviceId,
      });
      return response;
    } catch (error: any) {
      if (error.status === 404) {
        console.warn('Device registration endpoint not available');
        return {
          success: false,
          message: 'Device registration endpoint not available',
        };
      }
      throw error;
    }
  },
};

