import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export const commonService = {
  // Get cities list
  getCities: async () => {
    const response = await api.get(API_ENDPOINTS.CITIES_LIST);
    return response;
  },

  // Get property types list
  getPropertyTypes: async () => {
    const response = await api.get(API_ENDPOINTS.PROPERTY_TYPES);
    return response;
  },

  // Get amenities list
  getAmenities: async () => {
    const response = await api.get(API_ENDPOINTS.AMENITIES_LIST);
    return response;
  },
};

