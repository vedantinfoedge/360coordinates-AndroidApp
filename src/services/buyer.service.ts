import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export const buyerService = {
  // Record interaction (view, call, whatsapp, email)
  recordInteraction: async (
    propertyId: string | number,
    interactionType: 'view' | 'call' | 'whatsapp' | 'email',
  ) => {
    const response = await api.post(API_ENDPOINTS.BUYER_INTERACTION_RECORD, {
      property_id: propertyId,
      interaction_type: interactionType,
    });
    return response;
  },

  // Check interaction limit
  checkInteractionLimit: async (propertyId: string | number) => {
    const response = await api.get(API_ENDPOINTS.BUYER_INTERACTION_CHECK, {
      params: {property_id: propertyId},
    });
    return response;
  },
};

