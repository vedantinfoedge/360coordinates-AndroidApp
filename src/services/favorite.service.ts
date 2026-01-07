import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';
import {fixPropertyImages} from '../utils/imageHelper';

export const favoriteService = {
  // Get favorites (returns properties with full details) - supports pagination
  getFavorites: async (page: number = 1, limit: number = 20) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      
      const response = await api.get(`${API_ENDPOINTS.FAVORITES_LIST}?${params.toString()}`);
      
      // Fix image URLs in favorite properties
      if (response && response.success) {
      // Handle different response structures
      let favorites = [];
      
      if (response.data?.favorites && Array.isArray(response.data.favorites)) {
        favorites = response.data.favorites;
      } else if (response.data?.properties && Array.isArray(response.data.properties)) {
        favorites = response.data.properties;
      } else if (Array.isArray(response.data)) {
        favorites = response.data;
      } else if (Array.isArray(response.favorites)) {
        favorites = response.favorites;
      }
      
      // Fix image URLs
      favorites = favorites.map((property: any) => fixPropertyImages(property));
      
      return {
        ...response,
        data: {
          ...response.data,
          properties: favorites,
          favorites: favorites, // Support both formats
          pagination: response.data?.pagination || {
            current_page: page,
            total_pages: Math.ceil((response.data?.total || favorites.length) / limit),
            total: response.data?.total || favorites.length,
          },
        },
      };
      }
      
      return response;
    } catch (error: any) {
      // If 404, return empty favorites instead of crashing
      if (error.status === 404) {
        return {
          success: false,
          message: 'Favorites endpoint not available',
          data: {
            properties: [],
            favorites: [],
            pagination: {
              current_page: page,
              total_pages: 0,
              total: 0,
            },
          },
        };
      }
      throw error;
    }
  },

  // Add to favorites
  addFavorite: async (propertyId: string | number) => {
    const response = await api.post(API_ENDPOINTS.FAVORITE_ADD, {
      property_id: propertyId,
    });
    return response;
  },

  // Remove from favorites
  removeFavorite: async (propertyId: string | number) => {
    const response = await api.delete(
      `${API_ENDPOINTS.FAVORITE_REMOVE}?property_id=${propertyId}`,
    );
    return response;
  },

  // Check if favorited
  checkFavorite: async (propertyId: string | number) => {
    const response = await api.get(
      `${API_ENDPOINTS.FAVORITE_CHECK}?property_id=${propertyId}`,
    );
    return response;
  },
};
