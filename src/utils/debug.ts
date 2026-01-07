/**
 * Debug logging utility
 * Only logs in development mode
 */

const DEBUG = __DEV__;

export const log = {
  api: (message: string, data?: any) => {
    if (DEBUG) {
      console.log(`[API] ${message}`, data || '');
    }
  },

  auth: (message: string, data?: any) => {
    if (DEBUG) {
      console.log(`[AUTH] ${message}`, data || '');
    }
  },

  property: (message: string, data?: any) => {
    if (DEBUG) {
      console.log(`[PROPERTY] ${message}`, data || '');
    }
  },

  chat: (message: string, data?: any) => {
    if (DEBUG) {
      console.log(`[CHAT] ${message}`, data || '');
    }
  },

  location: (message: string, data?: any) => {
    if (DEBUG) {
      console.log(`[LOCATION] ${message}`, data || '');
    }
  },

  moderation: (message: string, data?: any) => {
    if (DEBUG) {
      console.log(`[MODERATION] ${message}`, data || '');
    }
  },

  error: (category: string, message: string, error: any) => {
    if (DEBUG) {
      console.error(`[${category.toUpperCase()}] ${message}`, error);
    }
  },

  warn: (category: string, message: string, data?: any) => {
    if (DEBUG) {
      console.warn(`[${category.toUpperCase()}] ${message}`, data || '');
    }
  },
};

