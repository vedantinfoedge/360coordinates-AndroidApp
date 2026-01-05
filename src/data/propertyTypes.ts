// Property Types - 14 Types Total

export type PropertyCategory = 'residential' | 'land' | 'commercial' | 'pg-hostel';
export type PropertyType =
  | 'apartment'
  | 'villa'
  | 'independent-house'
  | 'bungalow'
  | 'studio-apartment'
  | 'penthouse'
  | 'farm-house'
  | 'plot-land'
  | 'commercial-office'
  | 'commercial-shop'
  | 'retail-space'
  | 'coworking-space'
  | 'warehouse-godown'
  | 'industrial-property'
  | 'pg-hostel';

export type ListingType = 'buy' | 'rent' | 'pg-hostel';

export interface PropertyTypeConfig {
  id: PropertyType;
  label: string;
  icon: string;
  category: PropertyCategory;
  // Budget ranges in Lakhs (for Buy) or thousands (for Rent/PG)
  buyBudgetRange: {min: number; max: number}; // in Lakhs (Cr = 100 Lakhs)
  rentBudgetRange: {min: number; max: number}; // in thousands (Lakh = 100 thousands)
  pgBudgetRange?: {min: number; max: number}; // in thousands (only for PG/Hostel)
  // BHK options for residential
  bhkOptions?: string[];
  // Area range for plots/commercial
  areaRange?: {min: number; max: number}; // in sq ft
}

export const propertyTypes: PropertyTypeConfig[] = [
  // Residential Properties (7 types)
  {
    id: 'apartment',
    label: 'Apartment',
    icon: '🏢',
    category: 'residential',
    buyBudgetRange: {min: 0, max: 400}, // 0 to 4 Cr
    rentBudgetRange: {min: 0, max: 100}, // 0 to 1 Lakh/month
    bhkOptions: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK'],
  },
  {
    id: 'villa',
    label: 'Villa',
    icon: '🏡',
    category: 'residential',
    buyBudgetRange: {min: 0, max: 1200}, // 0 to 12 Cr
    rentBudgetRange: {min: 0, max: 300}, // 0 to 3 Lakh/month
    bhkOptions: ['3 BHK', '4 BHK', '5 BHK', '6 BHK', '7+ BHK'],
  },
  {
    id: 'independent-house',
    label: 'Independent House',
    icon: '🏠',
    category: 'residential',
    buyBudgetRange: {min: 0, max: 500}, // 0 to 5 Cr
    rentBudgetRange: {min: 0, max: 150}, // 0 to 1.5 Lakh/month
    bhkOptions: ['2 BHK', '3 BHK', '4 BHK', '5 BHK', '6+ BHK'],
  },
  {
    id: 'bungalow',
    label: 'Bungalow',
    icon: '🏛️',
    category: 'residential',
    buyBudgetRange: {min: 0, max: 2000}, // 0 to 20 Cr
    rentBudgetRange: {min: 0, max: 400}, // 0 to 4 Lakh/month
    bhkOptions: ['3 BHK', '4 BHK', '5 BHK', '6 BHK', '7+ BHK'],
  },
  {
    id: 'studio-apartment',
    label: 'Studio Apartment',
    icon: '🏘️',
    category: 'residential',
    buyBudgetRange: {min: 0, max: 100}, // 0 to 1 Cr
    rentBudgetRange: {min: 0, max: 50}, // 0 to 50K/month
    bhkOptions: ['1 RK', 'Studio', '1 BHK'],
  },
  {
    id: 'penthouse',
    label: 'Penthouse',
    icon: '🏙️',
    category: 'residential',
    buyBudgetRange: {min: 0, max: 2500}, // 0 to 25 Cr
    rentBudgetRange: {min: 0, max: 500}, // 0 to 5 Lakh/month
    bhkOptions: ['3 BHK', '4 BHK', '5 BHK', '6 BHK', '7+ BHK'],
  },
  {
    id: 'farm-house',
    label: 'Farm House',
    icon: '🌾',
    category: 'residential',
    buyBudgetRange: {min: 0, max: 1200}, // 0 to 12 Cr
    rentBudgetRange: {min: 0, max: 200}, // 0 to 2 Lakh/month
    bhkOptions: ['2 BHK', '3 BHK', '4 BHK', '5 BHK', '6+ BHK'],
  },
  // Land (1 type)
  {
    id: 'plot-land',
    label: 'Plot / Land',
    icon: '📐',
    category: 'land',
    buyBudgetRange: {min: 0, max: 1000}, // 0 to 10 Cr
    rentBudgetRange: {min: 0, max: 200}, // 0 to 2 Lakh/month
    areaRange: {min: 500, max: 43560}, // 500 sq ft to 1 Acre (43560 sq ft)
  },
  // Commercial Properties (6 types)
  {
    id: 'commercial-office',
    label: 'Commercial Office',
    icon: '🏢',
    category: 'commercial',
    buyBudgetRange: {min: 0, max: 1500}, // 0 to 15 Cr
    rentBudgetRange: {min: 0, max: 300}, // 0 to 3 Lakh/month
    areaRange: {min: 200, max: 15000}, // 200 to 15000+ sq ft
  },
  {
    id: 'commercial-shop',
    label: 'Commercial Shop',
    icon: '🏪',
    category: 'commercial',
    buyBudgetRange: {min: 0, max: 600}, // 0 to 6 Cr
    rentBudgetRange: {min: 0, max: 150}, // 0 to 1.5 Lakh/month
    areaRange: {min: 100, max: 4000}, // 100 to 4000+ sq ft
  },
  {
    id: 'retail-space',
    label: 'Retail Space',
    icon: '🛍️',
    category: 'commercial',
    buyBudgetRange: {min: 0, max: 1200}, // 0 to 12 Cr
    rentBudgetRange: {min: 0, max: 500}, // 0 to 5 Lakh/month
    areaRange: {min: 500, max: 25000}, // 500 to 25000+ sq ft
  },
  {
    id: 'coworking-space',
    label: 'Co-working Space',
    icon: '💼',
    category: 'commercial',
    buyBudgetRange: {min: 0, max: 800}, // 0 to 8 Cr
    rentBudgetRange: {min: 0, max: 200}, // 0 to 2 Lakh/month
    areaRange: {min: 500, max: 25000}, // 500 to 25000+ sq ft
  },
  {
    id: 'warehouse-godown',
    label: 'Warehouse / Godown',
    icon: '🏭',
    category: 'commercial',
    buyBudgetRange: {min: 0, max: 2500}, // 0 to 25 Cr
    rentBudgetRange: {min: 0, max: 400}, // 0 to 4 Lakh/month
    areaRange: {min: 1000, max: 50000}, // 1000 to 50000+ sq ft
  },
  {
    id: 'industrial-property',
    label: 'Industrial Property',
    icon: '🏗️',
    category: 'commercial',
    buyBudgetRange: {min: 0, max: 5000}, // 0 to 50 Cr
    rentBudgetRange: {min: 0, max: 1000}, // 0 to 10 Lakh/month
    areaRange: {min: 5000, max: 200000}, // 5000 to 2 Lakh+ sq ft
  },
];

// PG/Hostel type (separate category)
export const pgHostelType: PropertyTypeConfig = {
  id: 'pg-hostel',
  label: 'PG / Hostel',
  icon: '🛏️',
  category: 'pg-hostel',
  buyBudgetRange: {min: 0, max: 0}, // Not applicable for buy
  rentBudgetRange: {min: 0, max: 50}, // 0 to 50K/month
  pgBudgetRange: {min: 3, max: 50}, // 3K to 50K/month
  bhkOptions: ['Single', 'Double', 'Triple', '4 Sharing', '5+ Sharing'],
};

// Helper functions
export const getPropertyTypeById = (
  id: PropertyType,
): PropertyTypeConfig | undefined => {
  if (id === 'pg-hostel') {
    return pgHostelType;
  }
  return propertyTypes.find(type => type.id === id);
};

export const getPropertyTypesByCategory = (
  category: PropertyCategory,
): PropertyTypeConfig[] => {
  if (category === 'pg-hostel') {
    return [pgHostelType];
  }
  return propertyTypes.filter(type => type.category === category);
};

export const getResidentialTypes = (): PropertyTypeConfig[] => {
  return propertyTypes.filter(type => type.category === 'residential');
};

export const getCommercialTypes = (): PropertyTypeConfig[] => {
  return propertyTypes.filter(type => type.category === 'commercial');
};

export const getLandTypes = (): PropertyTypeConfig[] => {
  return propertyTypes.filter(type => type.category === 'land');
};

// Budget validation helpers
export const getBudgetRange = (
  propertyType: PropertyType,
  listingType: ListingType,
): {min: number; max: number} => {
  const type = getPropertyTypeById(propertyType);
  if (!type) {
    return {min: 0, max: 0};
  }

  if (listingType === 'pg-hostel') {
    return type.pgBudgetRange || type.rentBudgetRange;
  } else if (listingType === 'rent') {
    return type.rentBudgetRange;
  } else {
    return type.buyBudgetRange;
  }
};

// Format budget for display
export const formatBudget = (
  amount: number,
  listingType: ListingType,
): string => {
  if (listingType === 'buy') {
    if (amount >= 100) {
      return `₹${(amount / 100).toFixed(1)} Cr`;
    }
    return `₹${amount} Lakh`;
  } else {
    // Rent or PG/Hostel
    if (amount >= 100) {
      return `₹${(amount / 100).toFixed(1)} Lakh`;
    }
    return `₹${amount}K`;
  }
};

// Legacy exports for backward compatibility
export const propertyStatus = ['available', 'sold', 'rented'];
export const furnishingTypes = ['Fully Furnished', 'Semi Furnished', 'Unfurnished'];
