import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

export interface Lead {
  property_title: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  created_at: string;
}

export interface LeadsListResponse {
  success: boolean;
  message?: string;
  data?: Lead[] | {leads?: Lead[]};
}

/**
 * Get leads for the current seller (auth token identifies seller).
 * Returns leads related to seller's properties.
 */
export const getLeads = async (): Promise<Lead[]> => {
  const response = await api.get(API_ENDPOINTS.SELLER_LEADS_LIST);
  const res = response as LeadsListResponse;
  if (!res?.success) {
    throw new Error(res?.message ?? 'Failed to load leads');
  }
  const raw = res.data;
  if (Array.isArray(raw)) return raw;
  const list = (raw as {leads?: Lead[]})?.leads;
  return Array.isArray(list) ? list : [];
};

/**
 * Create a lead when buyer clicks "View Contact" on property details.
 * Backend should store: property_id, seller_id, buyer_id, buyer_name, buyer_phone, buyer_email, timestamp.
 */
export const createLead = async (payload: {
  property_id: number | string;
  seller_id: number | string;
  buyer_id: number | string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
}): Promise<{success: boolean; message?: string}> => {
  const body = {
    ...payload,
    timestamp: new Date().toISOString(),
  };
  const response = await api.post(API_ENDPOINTS.BUYER_LEAD_CREATE, body);
  return response as {success: boolean; message?: string};
};
