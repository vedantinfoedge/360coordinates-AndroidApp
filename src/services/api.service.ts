import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiConfig} from '../config/api.config';

const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: apiConfig.headers,
});

// Add token to requests
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('@auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Handle errors
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@propertyapp_user');
    }
    return Promise.reject(error);
  },
);

export default api;
