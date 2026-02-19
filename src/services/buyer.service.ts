import api from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

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
  project_type?: 'upcoming' | null;
  project_status?: string; // New field
  upcoming_project_data?: any; // New field
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
  // Get properties list (same backend as website: /buyer/properties/list.php)
  // Backend supports: property_type (e.g. 'PG / Hostel'), location/city, available_for_bachelors
  getProperties: async (params?: {
    page?: number;
    limit?: number;
    status?: 'sale' | 'rent' | 'pg';
    property_type?: string;
    location?: string;
    city?: string;
    available_for_bachelors?: boolean | string;
    min_price?: number;
    max_price?: number;
    bedrooms?: string;
    search?: string;
    project_type?: string;
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
      params: { id: propertyId },
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
      property_id: Number(propertyId),
    });
    return response;
  },

  // Send inquiry (backend may require name, email, mobile; fetch from profile if not provided)
  sendInquiry: async (
    propertyId: number | string,
    message: string,
    options?: { name?: string; email?: string; mobile?: string },
  ) => {
    let name = options?.name;
    let email = options?.email;
    let mobile = options?.mobile;
    if (name === undefined || email === undefined || mobile === undefined) {
      try {
        const profileRes = await buyerService.getProfile();
        const profile = profileRes?.data?.profile;
        if (profile) {
          if (name === undefined) name = profile.full_name || profile.first_name || '';
          if (email === undefined) email = profile.email || '';
          if (mobile === undefined) mobile = profile.phone || profile.whatsapp_number || '';
        }
      } catch (_) {
        // use empty strings if profile fetch fails
      }
    }
    const response = await api.post(API_ENDPOINTS.BUYER_INQUIRY_SEND, {
      property_id: propertyId,
      message,
      name: name ?? '',
      email: email ?? '',
      mobile: mobile ?? '',
    });
    return response;
  },

  // Get buyer profile
  getProfile: async (): Promise<BuyerProfileResponse> => {
    const response = await api.get(API_ENDPOINTS.BUYER_PROFILE_GET);
    return response;
  },

  // Update buyer profile (backend expects PUT per API spec)
  updateProfile: async (profileData: {
    full_name?: string;
    address?: string;
    whatsapp_number?: string;
    alternate_mobile?: string;
  }) => {
    const response = await api.put(API_ENDPOINTS.BUYER_PROFILE_UPDATE, profileData);
    return response;
  },

  // Record interaction (view, call, whatsapp, email, view_owner, chat_owner)
  recordInteraction: async (
    propertyId: string | number,
    actionType: 'view' | 'call' | 'whatsapp' | 'email' | 'view_owner' | 'chat_owner',
  ) => {
    const response = await api.post(API_ENDPOINTS.BUYER_INTERACTION_RECORD, {
      property_id: propertyId,
      action_type: actionType, // Use action_type as per guide
    });
    return response;
  },

  // Check interaction limit
  checkInteractionLimit: async (
    propertyId: string | number,
    actionType: string = 'view_owner',
  ) => {
    const response = await api.get(API_ENDPOINTS.BUYER_INTERACTION_CHECK, {
      params: {
        property_id: propertyId,
        action_type: actionType, // Use action_type as per guide
      },
    });
    return response;
  },

  // Add to buyer history (buyer-only)
  // Action types: 'viewed_owner_details', 'chat_with_owner'
  // Upgrade logic: viewed_owner_details → chat_with_owner (no downgrade)
  addHistory: async (
    propertyId: number | string,
    actionType: 'viewed_owner_details' | 'chat_with_owner',
  ) => {
    const response = await api.post(API_ENDPOINTS.BUYER_HISTORY_ADD, {
      property_id: propertyId,
      action_type: actionType,
    });
    return response;
  },

  // Get buyer history list (buyer-only)
  getHistory: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get(API_ENDPOINTS.BUYER_HISTORY_LIST, {
      params,
    });
    return response;
  },
};
