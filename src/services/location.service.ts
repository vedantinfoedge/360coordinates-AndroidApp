import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export const locationService = {
  // Search locations
  searchLocations: async (query: string, type?: string) => {
    const params: any = {query};
    if (type) params.type = type;
    
    const response = await api.get(API_ENDPOINTS.LOCATION_SEARCH, {params});
    return response;
  },

  // Get nearby properties
  getNearbyProperties: async (latitude: number, longitude: number, radius: number = 5) => {
    const response = await api.get(API_ENDPOINTS.LOCATION_NEARBY, {
      params: {latitude, longitude, radius},
    });
    return response;
  },

  // Location autocomplete
  autocomplete: async (query: string, type?: 'city' | 'state' | 'locality') => {
    const params: any = {query};
    if (type) params.type = type;
    
    const response = await api.get(API_ENDPOINTS.LOCATION_AUTOCOMPLETE, {params});
    return response;
  },

  // Get states list
  getStates: async () => {
    const response = await api.get(API_ENDPOINTS.STATES_LIST);
    return response;
  },

  // Get cities by state
  getCitiesByState: async (state: string) => {
    const response = await api.get(API_ENDPOINTS.CITIES_LIST, {
      params: {state},
    });
    return response;
  },

  // Get facing directions
  getFacingDirections: async () => {
    const response = await api.get(API_ENDPOINTS.FACING_LIST);
    return response;
  },
};

