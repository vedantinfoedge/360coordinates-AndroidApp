import api from './api.service';

export const inquiryService = {
  sendInquiry: async (inquiryData: {
    property_id: string;
    name: string;
    email: string;
    mobile: string;
    message?: string;
  }) => {
    const response = await api.post('/inquiries/send', inquiryData);
    return response.data;
  },

  getInquiries: async (type: 'received' | 'sent' = 'received') => {
    const response = await api.get('/inquiries', { params: { type } });
    return response.data;
  },

  updateInquiryStatus: async (inquiryId: string, status: string) => {
    const response = await api.put(`/inquiries/${inquiryId}/status`, { status });
    return response.data;
  },
};

