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
  // Villa / Independent House / Row House: total floors only (no floor number)
  // Apartment / Penthouse: floor number + total floors
  if (isResidentialIndependent) {
    return {
      showBedrooms: true,
      bedroomsRequired: true,
      showBathrooms: true,
      bathroomsRequired: true,
      showBalconies: true,
      showFloor: false,
      showTotalFloors: true,
      showFacing: true,
      showAge: true,
      showFurnishing: true,
      showCarpetArea: true,
      areaLabel: 'Built-up Area',
    };
  }

  if (isFarmHouse) {
    return {
      showBedrooms: true,
      bedroomsRequired: true,
      showBathrooms: true,
      bathroomsRequired: true,
      showBalconies: true,
      showFloor: false,
      showTotalFloors: true,
      showFacing: true,
      showAge: true,
      showFurnishing: true,
      showCarpetArea: true,
      areaLabel: 'Built-up Area',
    };
  }

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
  const residentialAmenities = [
    'parking', 'lift', 'security', 'power_backup', 'gym', 'swimming_pool',
    'garden', 'clubhouse', 'playground', 'cctv', 'intercom', 'fire_safety',
    'water_supply', 'gas_pipeline', 'wifi',
  ];

  // Residential: Apartment, Villa/Banglow, Independent House, Penthouse, Studio Apartment
  const isResidential = [
    'Apartment',
    'Villa / Banglow',
    'Independent House',
    'Penthouse',
    'Studio Apartment',
  ].includes(propertyType);

  // Row House / Farm House - same as residential but without lift
  const isFarmHouse = propertyType === 'Row House/ Farm House';

  const isCommercialOffice = propertyType === 'Commercial Office';

  const isCommercialShop =
    propertyType === 'Commercial Shop' ||
    propertyType === 'Warehouse / Godown';

  const isPlotLand = propertyType === 'Plot / Land / Industrial Property';

  const isPGHostel = propertyType === 'PG / Hostel';

  if (isResidential) {
    return residentialAmenities;
  }

  if (isFarmHouse) {
    return residentialAmenities.filter(a => a !== 'lift');
  }

  if (isCommercialOffice) {
    return [
      'power_backup_ups', 'high_speed_internet', 'centralized_ac',
      'lifts_high_speed', 'fire_safety', 'access_control', 'parking',
      'visitor_parking', 'security_staff', 'reception_desk', 'lobby_area',
      'conference_room', 'washrooms', 'pantry', 'cctv', 'security',
      'lift', 'wifi',
    ];
  }

  if (isCommercialShop) {
    return [
      'power_supply_247', 'power_backup', 'customer_parking',
      'two_wheeler_parking', 'wheelchair_accessible', 'escalator_access',
      'display_window', 'shutter_door', 'washrooms', 'mezzanine_floor',
      'high_speed_internet', 'parking', 'security', 'cctv', 'fire_safety',
      'wifi',
    ];
  }

  if (isPlotLand) {
    return [
      'internal_roads', 'led_lighting', 'rainwater_harvesting',
      'underground_drainage', 'stormwater_drainage', 'water_line',
      'electricity_provision', 'gated_entrance', 'compound_wall',
      'security_cabin', 'landscaped_garden', 'playground', 'jogging_track',
      'open_gym', 'visitor_parking', 'security', 'water_supply', 'cctv',
      'electricity',
    ];
  }

  if (isPGHostel) {
    return [
      'parking', 'security', 'power_backup', 'cctv', 'fire_safety',
      'water_supply', 'wifi', 'intercom',
    ];
  }

  // Default: return residential amenities
  return residentialAmenities;
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
  // Shared / Residential
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
  {id: 'electricity', label: 'Electricity', icon: '⚡'},
  // Commercial Office specific
  {id: 'power_backup_ups', label: '24/7 Power Backup (UPS/DG)', icon: '🔋'},
  {id: 'high_speed_internet', label: 'High-Speed Internet/Fiber Ready', icon: '🌐'},
  {id: 'centralized_ac', label: 'Centralized AC (HVAC)', icon: '❄️'},
  {id: 'lifts_high_speed', label: 'Elevators/High-Speed Lifts', icon: '🛗'},
  {id: 'access_control', label: 'Access Control (RFID/Biometric)', icon: '🔒'},
  {id: 'visitor_parking', label: 'Visitor Parking', icon: '🅿️'},
  {id: 'security_staff', label: 'Security Staff (24x7)', icon: '🛡️'},
  {id: 'reception_desk', label: 'Reception Desk', icon: '🛎️'},
  {id: 'lobby_area', label: 'Lobby Area', icon: '🏢'},
  {id: 'conference_room', label: 'Conference Room', icon: '📊'},
  {id: 'washrooms', label: 'Washrooms (Private/Common)', icon: '🚻'},
  {id: 'pantry', label: 'Pantry/Kitchenette', icon: '🍽️'},
  // Commercial Shop specific
  {id: 'power_supply_247', label: '24/7 Power Supply', icon: '⚡'},
  {id: 'customer_parking', label: 'Customer Parking', icon: '🅿️'},
  {id: 'two_wheeler_parking', label: 'Two-Wheeler Parking', icon: '🏍️'},
  {id: 'wheelchair_accessible', label: 'Wheelchair Accessible/Ramp', icon: '♿'},
  {id: 'escalator_access', label: 'Lift/Escalator Access', icon: '🛗'},
  {id: 'display_window', label: 'Glass Front/Display Window', icon: '🪟'},
  {id: 'shutter_door', label: 'Shutter Door', icon: '🚪'},
  {id: 'mezzanine_floor', label: 'Mezzanine Floor/Storage Room', icon: '🏗️'},
  // Plot / Land specific
  {id: 'internal_roads', label: 'Internal Roads', icon: '🛤️'},
  {id: 'led_lighting', label: 'LED Street Lighting', icon: '💡'},
  {id: 'rainwater_harvesting', label: 'Rainwater Harvesting', icon: '🌧️'},
  {id: 'underground_drainage', label: 'Underground Drainage', icon: '🔧'},
  {id: 'stormwater_drainage', label: 'Stormwater Drainage', icon: '🌊'},
  {id: 'water_line', label: 'Water Supply Line/Borewell', icon: '🚰'},
  {id: 'electricity_provision', label: 'Electricity Provision', icon: '⚡'},
  {id: 'gated_entrance', label: 'Gated Entrance', icon: '🚧'},
  {id: 'compound_wall', label: 'Compound Wall', icon: '🧱'},
  {id: 'security_cabin', label: 'Security Cabin', icon: '🛡️'},
  {id: 'landscaped_garden', label: 'Landscaped Garden', icon: '🌳'},
  {id: 'jogging_track', label: 'Jogging/Walking Track', icon: '🏃'},
  {id: 'open_gym', label: 'Open Gym/Fitness Zone', icon: '🏋️'},
];

