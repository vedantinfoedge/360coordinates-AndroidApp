/**
 * Device Token Service
 * Registers/unregisters FCM device tokens with the backend for push notifications.
 */

import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';
import {Platform} from 'react-native';

export const deviceTokenService = {
  register: async (deviceToken: string, platform?: 'android' | 'ios') => {
    const p = platform || (Platform.OS as 'android' | 'ios');
    await api.post(API_ENDPOINTS.DEVICE_TOKEN_REGISTER, {
      device_token: deviceToken,
      platform: p,
    });
  },

  unregister: async (deviceToken: string) => {
    await api.post(API_ENDPOINTS.DEVICE_TOKEN_UNREGISTER, {
      device_token: deviceToken,
    });
  },
};
