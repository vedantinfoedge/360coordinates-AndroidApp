import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';
import {fixImageUrl} from '../utils/imageHelper';

export const propertySearchService = {
  // Search properties using backend API
  search: async (query: string, filters?: any) => {
    try {
      const searchData: any = {
        keyword: query,
        ...filters,
      };
      
      const response = await api.post(API_ENDPOINTS.PROPERTY_SEARCH, searchData);
      
      if (response && response.success) {
        const properties = response.data?.properties || response.data || [];
        
        // Fix image URLs
        return Array.isArray(properties) ? properties.map((prop: any) => ({
          ...prop,
          cover_image: fixImageUrl(prop.cover_image || prop.image || ''),
        })) : [];
      }
      
      return [];
    } catch (error) {
      console.error('[PropertySearchService] Search error:', error);
      return [];
    }
  },
  
  // Filter by city using properties list endpoint
  filterByCity: async (city: string, status?: string) => {
    try {
      const params: any = {city};
      if (status) params.status = status;
      
      const response = await api.get(API_ENDPOINTS.PROPERTIES_LIST, {params});
      
      if (response && response.success) {
        const properties = response.data?.properties || response.data || [];
        return Array.isArray(properties) ? properties.map((prop: any) => ({
          ...prop,
          cover_image: fixImageUrl(prop.cover_image || prop.image || ''),
        })) : [];
      }
      
      return [];
    } catch (error) {
      console.error('[PropertySearchService] Filter by city error:', error);
      return [];
    }
  },
  
  // Filter by state using properties list endpoint
  filterByState: async (state: string, status?: string) => {
    try {
      const params: any = {state};
      if (status) params.status = status;
      
      const response = await api.get(API_ENDPOINTS.PROPERTIES_LIST, {params});
      
      if (response && response.success) {
        const properties = response.data?.properties || response.data || [];
        return Array.isArray(properties) ? properties.map((prop: any) => ({
          ...prop,
          cover_image: fixImageUrl(prop.cover_image || prop.image || ''),
        })) : [];
      }
      
      return [];
    } catch (error) {
      console.error('[PropertySearchService] Filter by state error:', error);
      return [];
    }
  },
  
  // Get property details (delegate to property service)
  getPropertyDetails: async (id: string) => {
    try {
      const {propertyService} = await import('./property.service');
      const response = await propertyService.getPropertyDetails(id);
      
      if (response && response.success) {
        return response.data?.property || response.data || null;
      }
      
      return null;
    } catch (error) {
      console.error('[PropertySearchService] Get property details error:', error);
      return null;
    }
  },
};

