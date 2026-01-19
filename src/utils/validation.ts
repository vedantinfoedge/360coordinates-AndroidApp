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

  // Price validation (sale/rent)
  // - Sale: >= 100000 (₹1,00,000)
  // - Rent: >= 5000 (₹5,000/month)
  // - Must be > 0 and present
  validatePrice: (price: number, status: 'sale' | 'rent' = 'sale') => {
    if (!price || isNaN(price) || price <= 0) {
      return {valid: false, message: 'Price must be a positive number'};
    }
    if (status === 'sale' && price < 100000) {
      return {valid: false, message: 'Sale price must be at least ₹1,00,000'};
    }
    if (status === 'rent' && price < 5000) {
      return {valid: false, message: 'Monthly rent must be at least ₹5,000'};
    }
    return {valid: true};
  },

  // Deposit validation (rent only)
  // - Optional
  // - If provided, must be positive and <= 12 months of rent
  validateDeposit: (deposit: number | null | undefined, rent: number) => {
    if (deposit == null || deposit === undefined || deposit === 0 || isNaN(deposit)) {
      return {valid: true}; // optional
    }
    if (deposit < 0) {
      return {valid: false, message: 'Security deposit must be a positive amount'};
    }
    if (rent > 0 && deposit > rent * 12) {
      return {valid: false, message: 'Security deposit cannot exceed 12 months of rent'};
    }
    return {valid: true};
  },
};

