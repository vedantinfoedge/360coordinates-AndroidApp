import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export interface DashboardStats {
  total_properties: number;
  active_properties: number;
  total_inquiries: number;
  new_inquiries: number;
  total_views: number;
  views_percentage_change: number;
  properties_by_status: {
    sale: number;
    rent: number;
  };
  recent_inquiries: Array<{
    id: number;
    property_id: number;
    property_title: string;
    buyer_id: number;
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string;
    buyer_profile_image?: string;
    message: string;
    status: string;
    created_at: string;
  }>;
  subscription?: {
    plan_type: string;
    end_date: string;
  } | null;
}

export interface DashboardStatsResponse {
  success: boolean;
  message: string;
  data: DashboardStats;
}

export const sellerService = {
  // Get dashboard statistics
  getDashboardStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get(API_ENDPOINTS.SELLER_DASHBOARD_STATS);
    return response;
  },

  // Get seller properties list
  getProperties: async (params?: {
    page?: number;
    limit?: number;
    status?: 'sale' | 'rent';
  }) => {
    // Build query string for GET request
    let url = API_ENDPOINTS.SELLER_PROPERTIES_LIST;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));
      if (params.status) queryParams.append('status', params.status);
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    console.log('[SellerService] Fetching properties from:', url);
    const response = await api.get(url);
    console.log('[SellerService] Properties response:', JSON.stringify(response, null, 2));
    return response;
  },

  // Get seller inquiries list
  getInquiries: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    property_id?: number;
  }) => {
    const response = await api.get(API_ENDPOINTS.SELLER_INQUIRIES_LIST, {
      params,
    });
    return response;
  },

  // Get seller profile
  getProfile: async () => {
    const response = await api.get(API_ENDPOINTS.SELLER_PROFILE_GET);
    return response;
  },

  // Update seller profile
  updateProfile: async (profileData: {
    full_name?: string;
    address?: string;
    whatsapp_number?: string;
    alternate_mobile?: string;
    company_name?: string;
    license_number?: string;
    gst_number?: string;
    website?: string;
    social_links?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
    };
  }) => {
    const response = await api.put(API_ENDPOINTS.SELLER_PROFILE_UPDATE, profileData);
    return response;
  },

  // Update inquiry status
  updateInquiryStatus: async (
    inquiryId: number | string,
    status: string,
  ) => {
    const response = await api.put(API_ENDPOINTS.SELLER_INQUIRY_UPDATE_STATUS, {
      inquiry_id: inquiryId,
      status,
    });
    return response;
  },

  /**
   * Delete property (seller/agent).
   * Matches website: DELETE /seller/properties/delete.php?id={id}
   * Backend: requireUserType(['seller', 'agent']), checks ownership.
   */
  deleteProperty: async (propertyId: string | number) => {
    const response = await api.delete(
      `${API_ENDPOINTS.SELLER_PROPERTIES_DELETE}?id=${propertyId}`,
    );
    return response;
  },

  /**
   * Update property (seller/agent).
   * Matches website: PUT /seller/properties/update.php
   * Backend: requireUserType(['seller', 'agent']), checks ownership.
   */
  updateProperty: async (propertyId: string | number, propertyData: any) => {
    const response = await api.put(API_ENDPOINTS.SELLER_PROPERTIES_UPDATE, {
      property_id: propertyId,
      ...propertyData,
    });
    return response;
  },
};

