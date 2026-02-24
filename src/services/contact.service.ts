import api from './api.service';
import {API_ENDPOINTS} from '../config/api.config';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactPayload = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export const contactService = {
  /**
   * Validates contact form data (matches backend rules):
   * - name ≥ 2 chars
   * - email valid format
   * - phone ≥ 10 digits
   * - message ≥ 10 chars
   */
  validate: (data: ContactPayload): { valid: boolean; error?: string } => {
    if (!data.name || data.name.trim().length < 2) {
      return {valid: false, error: 'Name must be at least 2 characters.'};
    }
    if (!data.email || !validateEmail(data.email)) {
      return {valid: false, error: 'Please enter a valid email address.'};
    }
    const digits = getPhoneDigits(data.phone);
    if (digits.length < 10) {
      return {valid: false, error: 'Phone must be at least 10 digits.'};
    }
    if (!data.message || data.message.trim().length < 10) {
      return {valid: false, error: 'Message must be at least 10 characters.'};
    }
    return {valid: true};
  },

  /**
   * Sends contact form to backend. Backend sends email via PHPMailer to sneha@vedantinfoedge.com.
   */
  send: async (data: ContactPayload) => {
    const payload = {
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      message: data.message.trim(),
    };
    const response = await api.post(API_ENDPOINTS.CONTACT_SEND, payload);
    return response;
  },
};
