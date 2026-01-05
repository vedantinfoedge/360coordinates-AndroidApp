import api from './api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  register: async (name: string, email: string, phone: string, password: string, role: string) => {
    const response = await api.post('/auth/register', {
      full_name: name,
      email,
      phone,
      password,
      user_type: role,
    });
    
    if (response.data.success) {
      await AsyncStorage.setItem('@auth_token', response.data.data.token);
      await AsyncStorage.setItem('@propertyapp_user', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    
    if (response.data.success) {
      await AsyncStorage.setItem('@auth_token', response.data.data.token);
      await AsyncStorage.setItem('@propertyapp_user', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@propertyapp_user');
    }
  },
};
