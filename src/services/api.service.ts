import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG} from '../config/api.config';
import {log} from '../utils/debug';

const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('@auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API request in debug mode
    log.api(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });
    
    return config;
  },
  error => {
    log.error('API', 'Request error', error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle responses
api.interceptors.response.use(
  response => {
    // PHP backend returns data in response.data, check if it's already parsed
    let data = response.data;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        // Keep as string if not JSON
      }
    }
    
    // Log API response in debug mode
    log.api(`Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      success: data?.success,
      dataLength: Array.isArray(data?.data) ? data.data.length : 'N/A',
    });
    
    return data;
  },
  async error => {
    // Log error
    log.error('API', `Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.message,
    });

    if (error.response?.status === 401) {
      // Token expired - logout
      log.auth('Token expired, logging out');
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@propertyapp_user');
      // Navigate to login will be handled by AuthContext
    }

    // Handle PHP error responses
    const errorData = error.response?.data;
    let errorMessage = 'Something went wrong';
    
    if (typeof errorData === 'string') {
      // Check if it's HTML (server error page)
      if (errorData.includes('<!DOCTYPE') || errorData.includes('<html')) {
        errorMessage = `Server error (${error.response?.status || 'Unknown'}). Please try again later.`;
      } else {
        try {
          const parsed = JSON.parse(errorData);
          errorMessage = parsed.message || errorMessage;
        } catch {
          // If it's not JSON and not HTML, use the string as message
          errorMessage = errorData.length > 200 ? 'Server error occurred' : errorData;
        }
      }
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return Promise.reject({
      success: false,
      message: errorMessage,
      error: errorData,
      status: error.response?.status,
      response: error.response,
    });
  },
);

/**
 * Handle API errors (matching guide structure)
 * @param error - Error object from axios
 * @returns Formatted error object
 */
export const handleApiError = (error: any) => {
  if (error.response) {
    const {status, data} = error.response;
    return {
      message: data?.message || 'An error occurred',
      code: status,
      errors: data?.data?.errors || null,
    };
  } else if (error.request) {
    return {
      message: 'Network error. Please check your internet connection.',
      code: null,
    };
  } else {
    return {
      message: error.message || 'An unexpected error occurred',
      code: null,
    };
  }
};

// Simple API call function as per guide
export const apiCall = async (endpoint: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('@auth_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_CONFIG.API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  return await response.json();
};

export default api;
