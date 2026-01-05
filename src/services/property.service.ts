import api from './api.service';

export const propertyService = {
  getProperties: async (filters?: any) => {
    const response = await api.get('/properties', { params: filters });
    return response.data;
  },

  getPropertyDetails: async (id: string) => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },

  createProperty: async (propertyData: any) => {
    const response = await api.post('/properties', propertyData);
    return response.data;
  },

  updateProperty: async (id: string, propertyData: any) => {
    const response = await api.put(`/properties/${id}`, propertyData);
    return response.data;
  },

  deleteProperty: async (id: string) => {
    const response = await api.delete(`/properties/${id}`);
    return response.data;
  },

  getMyProperties: async () => {
    const response = await api.get('/properties/my/list');
    return response.data;
  },
};

