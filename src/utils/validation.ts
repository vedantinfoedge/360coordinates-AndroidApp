export const validation = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  password: (password: string): boolean => {
    return password.length >= 8;
  },
  phone: (phone: string): boolean => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  },
  // Indian phone validation (10 digits, optionally with +91 prefix)
  indianPhone: (phone: string): boolean => {
    // Remove spaces, dashes, and plus signs
    const cleaned = phone.replace(/[\s\-+]/g, '');
    // Check if it's 10 digits or 12 digits (with 91 country code)
    const phoneRegex = /^(91)?[6-9][0-9]{9}$/;
    return phoneRegex.test(cleaned);
  },
  // Name validation (2-50 chars, letters and spaces only)
  name: (name: string): boolean => {
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    return nameRegex.test(name.trim());
  },
  // First/Last name validation (2-50 chars, letters only)
  firstName: (name: string): boolean => {
    const nameRegex = /^[a-zA-Z]{2,50}$/;
    return nameRegex.test(name.trim());
  },
  lastName: (name: string): boolean => {
    const nameRegex = /^[a-zA-Z]{2,50}$/;
    return nameRegex.test(name.trim());
  },
};

