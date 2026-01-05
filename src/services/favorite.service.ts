import api from './api.service';

export const favoriteService = {
  getFavorites: async () => {
    const response = await api.get('/favorites');
    return response.data;
  },

  addFavorite: async (propertyId: string) => {
    const response = await api.post('/favorites', { property_id: propertyId });
    return response.data;
  },

  removeFavorite: async (propertyId: string) => {
    const response = await api.delete(`/favorites/${propertyId}`);
    return response.data;
  },

  checkFavorite: async (propertyId: string) => {
    const response = await api.get(`/favorites/check/${propertyId}`);
    return response.data;
  },
};

