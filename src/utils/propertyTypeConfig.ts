/**
 * Property Type Configuration based on Website Guide
 * Matches the exact specifications from the Android Seller Dashboard guide
 */

export type GuidePropertyType =
  | 'Apartment'
  | 'Villa / Banglow'
  | 'Independent House'
  | 'Row House/ Farm House'
  | 'Penthouse'
  | 'Studio Apartment'
  | 'Plot / Land / Industrial Property'
  | 'Commercial Office'
  | 'Commercial Shop'
  | 'PG / Hostel'
  | 'Warehouse / Godown';

export interface PropertyTypeConfig {
  showBedrooms: boolean;
  bedroomsRequired: boolean;
  showBathrooms: boolean;
  bathroomsRequired: boolean;
  showBalconies: boolean;
  showFloor: boolean;
  showTotalFloors: boolean;
  showFacing: boolean;
  showAge: boolean;
  showFurnishing: boolean;
  showCarpetArea: boolean;
  areaLabel: 'Built-up Area' | 'Plot Area';
}

/**
 * Get property type configuration based on guide specifications
 */
export const getPropertyTypeConfig = (propertyType: GuidePropertyType): PropertyTypeConfig => {
  // Residential Standard: Apartment, Row House, Penthouse
  const isResidentialStandard = 
    propertyType === 'Apartment' || 
    propertyType === 'Row House/ Farm House' || 
    propertyType === 'Penthouse';

  // Residential Independent: Villa / Banglow, Independent House
  const isResidentialIndependent = 
    propertyType === 'Villa / Banglow' || 
    propertyType === 'Independent House';

  // Studio: Studio Apartment
  const isStudio = propertyType === 'Studio Apartment';

  // Farm House: Row House/ Farm House
  const isFarmHouse = propertyType === 'Row House/ Farm House';

  // Commercial Office: Commercial Office
  const isCommercialOffice = propertyType === 'Commercial Office';

  // Commercial Shop: Commercial Shop, Warehouse / Godown
  const isCommercialShop = 
    propertyType === 'Commercial Shop' || 
    propertyType === 'Warehouse / Godown';

  // Plot/Land: Plot / Land / Industrial Property
  const isPlotLand = propertyType === 'Plot / Land / Industrial Property';

  // PG/Hostel: PG / Hostel
  const isPGHostel = propertyType === 'PG / Hostel';

  // Return configuration based on property type
  // Note: "Row House/ Farm House" matches both isResidentialStandard and isFarmHouse
  // According to PROPERTY_TYPE_FIELDS.md, it's listed under Standard Residential (with balconies)
  // The Farm House section is a note for when treated as farmhouse (no balconies)
  // Since we can't distinguish in UI, we use Standard Residential config
  if (isResidentialStandard) {
    return {
      showBedrooms: true,
      bedroomsRequired: true,
      showBathrooms: true,
      bathroomsRequired: true,
      showBalconies: true,
      showFloor: true,
      showTotalFloors: true,
      showFacing: true,
      showAge: true,
      showFurnishing: true,
      showCarpetArea: true,
      areaLabel: 'Built-up Area',
    };
  }

  if (isResidentialIndependent) {
    return {
      showBedrooms: true,
      bedroomsRequired: true,
      showBathrooms: true,
      bathroomsRequired: true,
      showBalconies: true,
      showFloor: true, // Updated: Independent House should show Floor
      showTotalFloors: true,
      showFacing: true,
      showAge: true,
      showFurnishing: true,
      showCarpetArea: true,
      areaLabel: 'Built-up Area',
    };
  }

  if (isStudio) {
    return {
      showBedrooms: false,
      bedroomsRequired: false, // Studio = 0 bedrooms
      showBathrooms: true,
      bathroomsRequired: true,
      showBalconies: true,
      showFloor: true,
      showTotalFloors: true,
      showFacing: true,
      showAge: true,
      showFurnishing: true,
      showCarpetArea: true,
      areaLabel: 'Built-up Area',
    };
  }

  if (isCommercialOffice) {
    return {
      showBedrooms: false,
      bedroomsRequired: false,
      showBathrooms: true,
      bathroomsRequired: false, // Optional for Commercial Office
      showBalconies: false,
      showFloor: true,
      showTotalFloors: true,
      showFacing: true,
      showAge: true,
      showFurnishing: true,
      showCarpetArea: true,
      areaLabel: 'Built-up Area',
    };
  }

  if (isCommercialShop) {
    return {
      showBedrooms: false,
      bedroomsRequired: false,
      showBathrooms: true,
      bathroomsRequired: false, // Optional for Commercial Shop
      showBalconies: false,
      showFloor: true,
      showTotalFloors: true,
      showFacing: true,
      showAge: true,
      showFurnishing: false, // Updated: Commercial Shop should NOT show Furnishing
      showCarpetArea: true,
      areaLabel: 'Built-up Area',
    };
  }

  if (isPlotLand) {
    return {
      showBedrooms: false,
      bedroomsRequired: false,
      showBathrooms: false,
      bathroomsRequired: false,
      showBalconies: false,
      showFloor: false,
      showTotalFloors: false,
      showFacing: true, // Updated: Plot / Land should show Facing
      showAge: false,
      showFurnishing: false,
      showCarpetArea: false,
      areaLabel: 'Plot Area',
    };
  }

  if (isPGHostel) {
    return {
      showBedrooms: true,
      bedroomsRequired: true,
      showBathrooms: true,
      bathroomsRequired: true,
      showBalconies: false, // Updated: PG / Hostel should NOT show Balconies
      showFloor: true,
      showTotalFloors: true,
      showFacing: true,
      showAge: true,
      showFurnishing: true,
      showCarpetArea: true,
      areaLabel: 'Built-up Area',
    };
  }

  // Default configuration
  return {
    showBedrooms: false,
    bedroomsRequired: false,
    showBathrooms: false,
    bathroomsRequired: false,
    showBalconies: false,
    showFloor: false,
    showTotalFloors: false,
    showFacing: false,
    showAge: false,
    showFurnishing: false,
    showCarpetArea: false,
    areaLabel: 'Built-up Area',
  };
};

/**
 * Get available amenities based on property type (from guide)
 */
export const getAvailableAmenitiesForPropertyType = (propertyType: GuidePropertyType): string[] => {
  const allAmenities = [
    'parking',
    'lift',
    'security',
    'power_backup',
    'gym',
    'swimming_pool',
    'garden',
    'clubhouse',
    'playground',
    'cctv',
    'intercom',
    'fire_safety',
    'water_supply',
    'gas_pipeline',
    'wifi',
    'ac',
    'electricity',
  ];

  // Residential (Apartment, Villa, Independent House, Row House, Penthouse, Studio Apartment)
  const isResidential = [
    'Apartment',
    'Villa / Banglow',
    'Independent House',
    'Row House/ Farm House',
    'Penthouse',
    'Studio Apartment',
  ].includes(propertyType);

  // Farm House (Row House/ Farm House)
  const isFarmHouse = propertyType === 'Row House/ Farm House';

  // Commercial Office
  const isCommercialOffice = propertyType === 'Commercial Office';

  // Commercial Shop
  const isCommercialShop = 
    propertyType === 'Commercial Shop' || 
    propertyType === 'Warehouse / Godown';

  // Plot/Land
  const isPlotLand = propertyType === 'Plot / Land / Industrial Property';

  // PG/Hostel
  const isPGHostel = propertyType === 'PG / Hostel';

  if (isPlotLand) {
    // Plot/Land: security, water_supply, cctv, electricity
    return ['security', 'water_supply', 'cctv', 'electricity'];
  }

  if (isPGHostel) {
    // PG/Hostel: parking, security, power_backup, cctv, fire_safety, water_supply, wifi, ac, intercom
    return ['parking', 'security', 'power_backup', 'cctv', 'fire_safety', 'water_supply', 'wifi', 'ac', 'intercom'];
  }

  if (isCommercialOffice) {
    // Commercial Office: parking, lift, security, power_backup, cctv, fire_safety, water_supply, wifi, ac, intercom
    return ['parking', 'lift', 'security', 'power_backup', 'cctv', 'fire_safety', 'water_supply', 'wifi', 'ac', 'intercom'];
  }

  if (isCommercialShop) {
    // Commercial Shop: parking, security, power_backup, cctv, fire_safety, water_supply, wifi, ac
    return ['parking', 'security', 'power_backup', 'cctv', 'fire_safety', 'water_supply', 'wifi', 'ac'];
  }

  if (isFarmHouse) {
    // Farm House: parking, security, power_backup, gym, swimming_pool, garden, clubhouse, playground, cctv, fire_safety, water_supply, gas_pipeline, wifi, ac
    return ['parking', 'security', 'power_backup', 'gym', 'swimming_pool', 'garden', 'clubhouse', 'playground', 'cctv', 'fire_safety', 'water_supply', 'gas_pipeline', 'wifi', 'ac'];
  }

  if (isResidential) {
    // Residential: All except electricity
    return allAmenities.filter(amenity => amenity !== 'electricity');
  }

  // Default: return all amenities
  return allAmenities;
};

/**
 * Property type options matching the guide
 * Ordered as per user requirements
 */
export const PROPERTY_TYPES: Array<{value: GuidePropertyType; label: string; icon: string; category?: string}> = [
  {value: 'Apartment', label: 'Apartment', icon: '🏢', category: 'residential'},
  {value: 'Villa / Banglow', label: 'Villa / Banglow', icon: '🏡', category: 'independent'},
  {value: 'Independent House', label: 'Independent House', icon: '🏘️', category: 'independent'},
  {value: 'Row House/ Farm House', label: 'Row House/ Farm House', icon: '🏘️', category: 'standard'},
  {value: 'Penthouse', label: 'Penthouse', icon: '🌆', category: 'luxury'},
  {value: 'Studio Apartment', label: 'Studio Apartment', icon: '🛏️', category: 'studio'},
  {value: 'Commercial Office', label: 'Commercial Office', icon: '🏢', category: 'commercial'},
  {value: 'Commercial Shop', label: 'Commercial Shop', icon: '🏪', category: 'commercial'},
  {value: 'Warehouse / Godown', label: 'Warehouse / Godown', icon: '🏪', category: 'commercial'},
  {value: 'Plot / Land / Industrial Property', label: 'Plot / Land / Industrial Property', icon: '📐', category: 'land'},
  {value: 'PG / Hostel', label: 'PG / Hostel', icon: '🛏️', category: 'pg-hostel'},
];

/**
 * Amenities list with labels and icons
 */
export const AMENITIES_LIST = [
  {id: 'parking', label: 'Parking', icon: '🚗'},
  {id: 'lift', label: 'Lift', icon: '🛗'},
  {id: 'security', label: '24x7 Security', icon: '👮'},
  {id: 'power_backup', label: 'Power Backup', icon: '⚡'},
  {id: 'gym', label: 'Gym', icon: '🏋️'},
  {id: 'swimming_pool', label: 'Swimming Pool', icon: '🏊'},
  {id: 'garden', label: 'Garden', icon: '🌳'},
  {id: 'clubhouse', label: 'Club House', icon: '🏛️'},
  {id: 'playground', label: "Children's Play Area", icon: '🎢'},
  {id: 'cctv', label: 'CCTV', icon: '📹'},
  {id: 'intercom', label: 'Intercom', icon: '📞'},
  {id: 'fire_safety', label: 'Fire Safety', icon: '🔥'},
  {id: 'water_supply', label: '24x7 Water', icon: '💧'},
  {id: 'gas_pipeline', label: 'Gas Pipeline', icon: '🔥'},
  {id: 'wifi', label: 'WiFi', icon: '📶'},
  {id: 'ac', label: 'Air Conditioning', icon: '❄️'},
  {id: 'electricity', label: 'Electricity', icon: '⚡'},
];

