import AsyncStorage from '@react-native-async-storage/async-storage';
import {commonService} from './common.service';
import {locationService} from './location.service';

const CACHE_KEYS = {
  PROPERTY_TYPES: '@dropdown_property_types',
  AMENITIES: '@dropdown_amenities',
  STATES: '@dropdown_states',
  CITIES: '@dropdown_cities',
  FACING: '@dropdown_facing',
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  data: any;
  timestamp: number;
}

const getCachedData = async (key: string): Promise<any | null> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const parsed: CachedData = JSON.parse(cached);
      const now = Date.now();
      if (now - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }
    }
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
  }
  return null;
};

const setCachedData = async (key: string, data: any): Promise<void> => {
  try {
    const cached: CachedData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error(`Error caching ${key}:`, error);
  }
};

export const dropdownService = {
  // Get property types (with cache)
  getPropertyTypes: async (forceRefresh: boolean = false) => {
    if (!forceRefresh) {
      const cached = await getCachedData(CACHE_KEYS.PROPERTY_TYPES);
      if (cached) return {success: true, data: cached};
    }

    try {
      const response = await commonService.getPropertyTypes();
      if (response.success && response.data) {
        await setCachedData(CACHE_KEYS.PROPERTY_TYPES, response.data);
      }
      return response;
    } catch (error) {
      // Return cached data if API fails
      const cached = await getCachedData(CACHE_KEYS.PROPERTY_TYPES);
      if (cached) return {success: true, data: cached};
      throw error;
    }
  },

  // Get amenities (with cache)
  getAmenities: async (forceRefresh: boolean = false) => {
    if (!forceRefresh) {
      const cached = await getCachedData(CACHE_KEYS.AMENITIES);
      if (cached) return {success: true, data: cached};
    }

    try {
      const response = await commonService.getAmenities();
      if (response.success && response.data) {
        await setCachedData(CACHE_KEYS.AMENITIES, response.data);
      }
      return response;
    } catch (error) {
      const cached = await getCachedData(CACHE_KEYS.AMENITIES);
      if (cached) return {success: true, data: cached};
      throw error;
    }
  },

  // Get states (with cache)
  getStates: async (forceRefresh: boolean = false) => {
    if (!forceRefresh) {
      const cached = await getCachedData(CACHE_KEYS.STATES);
      if (cached) return {success: true, data: cached};
    }

    try {
      const response = await locationService.getStates();
      if (response.success && response.data) {
        await setCachedData(CACHE_KEYS.STATES, response.data);
      }
      return response;
    } catch (error) {
      const cached = await getCachedData(CACHE_KEYS.STATES);
      if (cached) return {success: true, data: cached};
      throw error;
    }
  },

  // Get cities by state (with cache per state)
  getCities: async (state: string, forceRefresh: boolean = false) => {
    const cacheKey = `${CACHE_KEYS.CITIES}_${state}`;
    
    if (!forceRefresh) {
      const cached = await getCachedData(cacheKey);
      if (cached) return {success: true, data: cached};
    }

    try {
      const response = await locationService.getCitiesByState(state);
      if (response.success && response.data) {
        await setCachedData(cacheKey, response.data);
      }
      return response;
    } catch (error) {
      const cached = await getCachedData(cacheKey);
      if (cached) return {success: true, data: cached};
      throw error;
    }
  },

  // Get facing directions (with cache)
  getFacingDirections: async (forceRefresh: boolean = false) => {
    if (!forceRefresh) {
      const cached = await getCachedData(CACHE_KEYS.FACING);
      if (cached) return {success: true, data: cached};
    }

    try {
      const response = await locationService.getFacingDirections();
      if (response.success && response.data) {
        await setCachedData(CACHE_KEYS.FACING, response.data);
      }
      return response;
    } catch (error) {
      const cached = await getCachedData(CACHE_KEYS.FACING);
      if (cached) return {success: true, data: cached};
      throw error;
    }
  },

  // Clear all cached dropdown data
  clearCache: async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.PROPERTY_TYPES),
        AsyncStorage.removeItem(CACHE_KEYS.AMENITIES),
        AsyncStorage.removeItem(CACHE_KEYS.STATES),
        AsyncStorage.removeItem(CACHE_KEYS.FACING),
      ]);
      // Clear cities cache (need to get all keys and filter)
      const keys = await AsyncStorage.getAllKeys();
      const cityKeys = keys.filter(key => key.startsWith(CACHE_KEYS.CITIES));
      await Promise.all(cityKeys.map(key => AsyncStorage.removeItem(key)));
    } catch (error) {
      console.error('Error clearing dropdown cache:', error);
    }
  },
};

