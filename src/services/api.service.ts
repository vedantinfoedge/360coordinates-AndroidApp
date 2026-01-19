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
    
    // Handle FormData - remove Content-Type header so axios can set it with boundary
    if (config.data instanceof FormData) {
      // Remove Content-Type header - axios will set it automatically with boundary
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
    
    // Log API request in debug mode
    log.api(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data instanceof FormData ? '[FormData]' : config.data,
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
      // Token expired - try to refresh token first
      log.auth('Token expired, attempting refresh');
      
      try {
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        if (refreshToken) {
          // Try to refresh token
          const {authService} = require('./auth.service');
          const refreshResponse = await authService.refreshToken(refreshToken);
          
          if (refreshResponse.success) {
            // Retry original request with new token
            const originalRequest = error.config;
            const newToken = await AsyncStorage.getItem('@auth_token');
            if (newToken && originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        log.auth('Token refresh failed, logging out');
        await AsyncStorage.removeItem('@auth_token');
        await AsyncStorage.removeItem('@propertyapp_user');
        await AsyncStorage.removeItem('@refresh_token');
        // Navigate to login will be handled by AuthContext
      }
      
      // If no refresh token or refresh failed, logout
      if (!(await AsyncStorage.getItem('@refresh_token'))) {
        await AsyncStorage.removeItem('@auth_token');
        await AsyncStorage.removeItem('@propertyapp_user');
      }
    }

    // Handle PHP error responses
    const errorData = error.response?.data;
    const statusCode = error.response?.status;
    let errorMessage = 'Something went wrong';
    
    // Provide user-friendly error messages based on status code
    if (statusCode === 403) {
      // Try to extract specific error message from backend
      if (typeof errorData === 'string') {
        try {
          const parsed = JSON.parse(errorData);
          errorMessage = parsed.message || parsed.error || errorMessage;
        } catch {
          // If not JSON, use the string if it's reasonable
          if (errorData.length < 200 && !errorData.includes('<!DOCTYPE')) {
            errorMessage = errorData;
          }
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (errorData?.data?.message) {
        errorMessage = errorData.data.message;
      } else {
        errorMessage = 'Access denied. You don\'t have permission to access this dashboard. Please try logging in with a different account type.';
      }
    } else if (statusCode === 400) {
      // Validation errors
      if (typeof errorData === 'string') {
        try {
          const parsed = JSON.parse(errorData);
          errorMessage = parsed.message || parsed.error || 'Validation failed. Please check your input.';
        } catch {
          if (errorData.length < 200 && !errorData.includes('<!DOCTYPE')) {
            errorMessage = errorData;
          } else {
            errorMessage = 'Validation failed. Please check your email, password, and selected role.';
          }
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      } else {
        errorMessage = 'Validation failed. Please check your email, password, and selected role.';
      }
    } else if (statusCode === 404) {
      errorMessage = 'Service not found. Please try again later.';
    } else if (statusCode === 500) {
      errorMessage = 'Server error. Please try again in a few moments.';
    } else if (statusCode === 503) {
      errorMessage = 'Service temporarily unavailable. Please try again later.';
    }
    
    // Try to get error message from response data
    if (typeof errorData === 'string') {
      // Check if it's HTML (server error page)
      if (errorData.includes('<!DOCTYPE') || errorData.includes('<html')) {
        errorMessage = `Server error (${statusCode || 'Unknown'}). Please try again later.`;
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
    } else if (error.message && !error.message.includes('status code')) {
      // Only use error.message if it's not a generic status code message
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
