import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export interface Property {
  id: number;
  title: string;
  location: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  price: number;
  price_negotiable?: boolean;
  maintenance_charges?: number;
  deposit_amount?: number;
  status: 'sale' | 'rent' | 'pg';
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  balconies?: number;
  area: number;
  carpet_area?: number;
  floor?: string;
  total_floors?: number;
  facing?: string;
  age?: string;
  furnishing?: string;
  description: string;
  cover_image?: string;
  images: string[];
  video_url?: string;
  brochure_url?: string;
  amenities: string[];
  seller?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    profile_image?: string;
    user_type: 'seller' | 'agent';
  };
  views_count: number;
  inquiry_count: number;
  is_favorite?: boolean;
  created_at: string;
}

export interface PropertiesListResponse {
  success: boolean;
  message: string;
  data: {
    properties: Property[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface PropertyDetailsResponse {
  success: boolean;
  message: string;
  data: {
    property: Property;
  };
}

export interface FavoritesResponse {
  success: boolean;
  message: string;
  data: {
    properties: Property[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface BuyerProfile {
  id: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  whatsapp_number?: string;
  alternate_mobile?: string;
  address?: string;
  profile_image?: string;
  email_verified: boolean;
  phone_verified: boolean;
  user_type: string;
  created_at: string;
}

export interface BuyerProfileResponse {
  success: boolean;
  message: string;
  data: {
    profile: BuyerProfile;
  };
}

export const buyerService = {
  // Get properties list
  getProperties: async (params?: {
    page?: number;
    limit?: number;
    status?: 'sale' | 'rent' | 'pg';
    property_type?: string;
    location?: string;
    min_price?: number;
    max_price?: number;
    bedrooms?: number;
    bathrooms?: number;
    search?: string;
  }): Promise<PropertiesListResponse> => {
    const response = await api.get(API_ENDPOINTS.BUYER_PROPERTIES_LIST, {
      params,
    });
    return response;
  },

  // Get property details
  getPropertyDetails: async (
    propertyId: number | string,
  ): Promise<PropertyDetailsResponse> => {
    const response = await api.get(API_ENDPOINTS.BUYER_PROPERTY_DETAILS, {
      params: {id: propertyId},
    });
    return response;
  },

  // Get favorites list
  getFavorites: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<FavoritesResponse> => {
    const response = await api.get(API_ENDPOINTS.BUYER_FAVORITES_LIST, {
      params,
    });
    return response;
  },

  // Toggle favorite
  toggleFavorite: async (propertyId: number | string) => {
    const response = await api.post(API_ENDPOINTS.BUYER_FAVORITES_TOGGLE, {
      property_id: propertyId,
    });
    return response;
  },

  // Send inquiry
  sendInquiry: async (propertyId: number | string, message: string) => {
    const response = await api.post(API_ENDPOINTS.BUYER_INQUIRY_SEND, {
      property_id: propertyId,
      message,
    });
    return response;
  },

  // Get buyer profile
  getProfile: async (): Promise<BuyerProfileResponse> => {
    const response = await api.get(API_ENDPOINTS.BUYER_PROFILE_GET);
    return response;
  },

  // Update buyer profile
  updateProfile: async (profileData: {
    full_name?: string;
    address?: string;
    whatsapp_number?: string;
    alternate_mobile?: string;
  }) => {
    const response = await api.post(API_ENDPOINTS.BUYER_PROFILE_UPDATE, profileData);
    return response;
  },

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
