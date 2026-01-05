// Demo Properties Data for India Properties App

import {PropertyType, ListingType} from './propertyTypes';

export interface DemoProperty {
  id: string;
  title: string;
  location: string;
  city: string;
  state: string;
  price: string;
  type: ListingType;
  propertyType: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  area?: string; // in sq ft
  bhk?: string; // e.g., "2 BHK", "3 BHK"
  builtYear?: number;
  floor?: string;
  totalFloors?: number;
  facing?: string;
  furnishing?: string;
  amenities?: string[];
  description: string;
  images?: string[];
  owner: {
    name: string;
    phone: string;
    email: string;
    verified: boolean;
  };
}

export const demoProperties: DemoProperty[] = [
  // Buy Properties - Residential
  {
    id: '1',
    title: 'Luxury 3BHK Apartment in Bandra West',
    location: 'Bandra West, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    price: '₹2.5 Cr',
    type: 'buy',
    propertyType: 'apartment',
    bedrooms: 3,
    bathrooms: 2,
    bhk: '3 BHK',
    area: '1,850 sq ft',
    builtYear: 2020,
    floor: '5th Floor',
    totalFloors: 12,
    facing: 'Sea Facing',
    furnishing: 'Fully Furnished',
    amenities: ['Swimming Pool', 'Gym', 'Parking', 'Security', 'Lift', 'Power Backup'],
    description: 'Beautiful luxury apartment with stunning sea views. Fully furnished with modern amenities. Located in prime Bandra West area with excellent connectivity.',
    owner: {
      name: 'Rajesh Kumar',
      phone: '+91 98765 43210',
      email: 'rajesh.kumar@example.com',
      verified: true,
    },
  },
  {
    id: '2',
    title: 'Modern 4BHK Villa in Whitefield',
    location: 'Whitefield, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    price: '₹4.2 Cr',
    type: 'buy',
    propertyType: 'villa',
    bedrooms: 4,
    bathrooms: 3,
    bhk: '4 BHK',
    area: '3,500 sq ft',
    builtYear: 2022,
    floor: 'Ground + 2',
    totalFloors: 3,
    facing: 'East Facing',
    furnishing: 'Semi Furnished',
    amenities: ['Garden', 'Parking', 'Security', 'Power Backup', 'Club House'],
    description: 'Spacious modern villa in a gated community. Perfect for families with children. Close to IT parks and schools.',
    owner: {
      name: 'Priya Sharma',
      phone: '+91 98876 54321',
      email: 'priya.sharma@example.com',
      verified: true,
    },
  },
  {
    id: '3',
    title: 'Premium 5BHK Bungalow in Koregaon Park',
    location: 'Koregaon Park, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    price: '₹8.5 Cr',
    type: 'buy',
    propertyType: 'bungalow',
    bedrooms: 5,
    bathrooms: 4,
    bhk: '5 BHK',
    area: '5,000 sq ft',
    builtYear: 2019,
    floor: 'Ground + 2',
    totalFloors: 3,
    facing: 'North Facing',
    furnishing: 'Fully Furnished',
    amenities: ['Swimming Pool', 'Garden', 'Parking', 'Security', 'Lift', 'Home Theater'],
    description: 'Luxury bungalow in prime Koregaon Park area. Fully furnished with premium finishes and modern amenities.',
    owner: {
      name: 'Amit Patel',
      phone: '+91 98765 12345',
      email: 'amit.patel@example.com',
      verified: true,
    },
  },
  // Rent Properties - Residential
  {
    id: '4',
    title: 'Fully Furnished 2BHK Apartment',
    location: 'Gurgaon Sector 43',
    city: 'Gurgaon',
    state: 'Haryana',
    price: '₹35,000/month',
    type: 'rent',
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    bhk: '2 BHK',
    area: '1,200 sq ft',
    builtYear: 2021,
    floor: '8th Floor',
    totalFloors: 15,
    facing: 'South Facing',
    furnishing: 'Fully Furnished',
    amenities: ['Gym', 'Parking', 'Security', 'Lift', 'Power Backup'],
    description: 'Well-maintained 2BHK apartment in a premium society. Fully furnished with all modern amenities.',
    owner: {
      name: 'Sunita Reddy',
      phone: '+91 98765 67890',
      email: 'sunita.reddy@example.com',
      verified: true,
    },
  },
  {
    id: '5',
    title: 'Spacious 3BHK Penthouse',
    location: 'Hitech City, Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    price: '₹1.2 Lakh/month',
    type: 'rent',
    propertyType: 'penthouse',
    bedrooms: 3,
    bathrooms: 3,
    bhk: '3 BHK',
    area: '2,800 sq ft',
    builtYear: 2023,
    floor: '18th Floor',
    totalFloors: 20,
    facing: 'City View',
    furnishing: 'Fully Furnished',
    amenities: ['Swimming Pool', 'Gym', 'Parking', 'Security', 'Lift', 'Concierge'],
    description: 'Luxurious penthouse with panoramic city views. Fully furnished with premium furniture and appliances.',
    owner: {
      name: 'Vikram Singh',
      phone: '+91 98888 77777',
      email: 'vikram.singh@example.com',
      verified: true,
    },
  },
  {
    id: '6',
    title: 'Studio Apartment Near Metro',
    location: 'Noida Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    price: '₹18,000/month',
    type: 'rent',
    propertyType: 'studio-apartment',
    bedrooms: 1,
    bathrooms: 1,
    bhk: 'Studio',
    area: '600 sq ft',
    builtYear: 2022,
    floor: '3rd Floor',
    totalFloors: 5,
    facing: 'East Facing',
    furnishing: 'Fully Furnished',
    amenities: ['Parking', 'Security', 'Lift'],
    description: 'Compact and cozy studio apartment perfect for singles or couples. Close to metro station and offices.',
    owner: {
      name: 'Neha Gupta',
      phone: '+91 98777 88888',
      email: 'neha.gupta@example.com',
      verified: true,
    },
  },
  // Buy Properties - Commercial
  {
    id: '7',
    title: 'Commercial Office Space',
    location: 'BKC, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    price: '₹3.5 Cr',
    type: 'buy',
    propertyType: 'commercial-office',
    area: '2,500 sq ft',
    builtYear: 2021,
    floor: '5th Floor',
    totalFloors: 15,
    facing: 'Road Facing',
    furnishing: 'Semi Furnished',
    amenities: ['Lift', 'Parking', 'Security', 'Power Backup', 'AC'],
    description: 'Premium commercial office space in Bandra Kurla Complex. Ideal for corporate offices or startups.',
    owner: {
      name: 'Commercial Properties Ltd',
      phone: '+91 98765 11111',
      email: 'sales@commercialprop.com',
      verified: true,
    },
  },
  {
    id: '8',
    title: 'Retail Shop in Prime Location',
    location: 'Connaught Place, Delhi',
    city: 'Delhi',
    state: 'Delhi',
    price: '₹1.8 Cr',
    type: 'buy',
    propertyType: 'commercial-shop',
    area: '800 sq ft',
    builtYear: 2018,
    floor: 'Ground Floor',
    totalFloors: 4,
    facing: 'Main Road',
    furnishing: 'Unfurnished',
    amenities: ['Parking', 'Security'],
    description: 'Prime retail shop in Connaught Place. High footfall area, perfect for retail business.',
    owner: {
      name: 'Retail Spaces Inc',
      phone: '+91 98765 22222',
      email: 'info@retailspaces.com',
      verified: true,
    },
  },
  // Rent Properties - Commercial
  {
    id: '9',
    title: 'Co-working Space for Rent',
    location: 'Indiranagar, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    price: '₹80,000/month',
    type: 'rent',
    propertyType: 'coworking-space',
    area: '3,000 sq ft',
    builtYear: 2022,
    floor: '2nd Floor',
    totalFloors: 5,
    facing: 'Garden Facing',
    furnishing: 'Fully Furnished',
    amenities: ['High Speed Internet', 'Meeting Rooms', 'Parking', 'Security', 'Cafeteria'],
    description: 'Modern co-working space with all amenities. Perfect for startups and freelancers.',
    owner: {
      name: 'CoWork Solutions',
      phone: '+91 98765 33333',
      email: 'hello@cowork.com',
      verified: true,
    },
  },
  // Land/Plot
  {
    id: '10',
    title: 'Residential Plot',
    location: 'Greater Noida West',
    city: 'Noida',
    state: 'Uttar Pradesh',
    price: '₹45 Lakh',
    type: 'buy',
    propertyType: 'plot-land',
    area: '300 sq yd (2,700 sq ft)',
    description: 'Residential plot in approved layout. Clear title, ready for construction.',
    owner: {
      name: 'Land Developers Pvt Ltd',
      phone: '+91 98765 44444',
      email: 'sales@landdev.com',
      verified: true,
    },
  },
  // PG/Hostel
  {
    id: '11',
    title: 'PG for Boys - Single Occupancy',
    location: 'Koramangala, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    price: '₹12,000/month',
    type: 'pg-hostel',
    propertyType: 'pg-hostel',
    bhk: 'Single',
    amenities: ['WiFi', 'Food', 'Laundry', 'Power Backup', 'Security'],
    description: 'Clean and hygienic PG accommodation for working professionals. Home-cooked meals included.',
    owner: {
      name: 'PG Services',
      phone: '+91 98765 55555',
      email: 'pgservices@example.com',
      verified: true,
    },
  },
  {
    id: '12',
    title: 'Girls Hostel - Triple Sharing',
    location: 'Pune University Road',
    city: 'Pune',
    state: 'Maharashtra',
    price: '₹8,500/month',
    type: 'pg-hostel',
    propertyType: 'pg-hostel',
    bhk: 'Triple',
    amenities: ['WiFi', 'Food', 'Laundry', 'Security', 'Study Room'],
    description: 'Safe and secure girls hostel near university. Meals and all facilities included.',
    owner: {
      name: 'Student Housing',
      phone: '+91 98765 66666',
      email: 'student.housing@example.com',
      verified: true,
    },
  },
  {
    id: '13',
    title: 'Executive PG - Double Sharing',
    location: 'DLF Cyber City, Gurgaon',
    city: 'Gurgaon',
    state: 'Haryana',
    price: '₹15,000/month',
    type: 'pg-hostel',
    propertyType: 'pg-hostel',
    bhk: 'Double',
    amenities: ['WiFi', 'Food', 'Laundry', 'AC', 'Housekeeping', 'Security'],
    description: 'Premium PG accommodation for working executives. All modern amenities and quality food.',
    owner: {
      name: 'Executive Living',
      phone: '+91 98765 77777',
      email: 'executive.living@example.com',
      verified: true,
    },
  },
  {
    id: '14',
    title: 'Independent House for Sale',
    location: 'JP Nagar, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    price: '₹1.2 Cr',
    type: 'buy',
    propertyType: 'independent-house',
    bedrooms: 3,
    bathrooms: 2,
    bhk: '3 BHK',
    area: '2,400 sq ft',
    builtYear: 2015,
    floor: 'Ground + 1',
    totalFloors: 2,
    facing: 'South Facing',
    furnishing: 'Semi Furnished',
    amenities: ['Parking', 'Garden', 'Security'],
    description: 'Well-maintained independent house in peaceful neighborhood. Close to schools and hospitals.',
    owner: {
      name: 'Krishna Reddy',
      phone: '+91 98765 88888',
      email: 'krishna.reddy@example.com',
      verified: true,
    },
  },
  {
    id: '15',
    title: 'Warehouse for Rent',
    location: 'Bhiwandi, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    price: '₹2.5 Lakh/month',
    type: 'rent',
    propertyType: 'warehouse-godown',
    area: '15,000 sq ft',
    builtYear: 2020,
    floor: 'Ground',
    totalFloors: 1,
    amenities: ['Loading Dock', 'Parking', 'Security', '24/7 Access'],
    description: 'Spacious warehouse for storage and logistics. Ideal for manufacturing or storage business.',
    owner: {
      name: 'Industrial Spaces',
      phone: '+91 98765 99999',
      email: 'industrial@example.com',
      verified: true,
    },
  },
];

// Helper functions to filter properties
export const getPropertiesByType = (
  type: ListingType,
  properties: DemoProperty[] = demoProperties,
): DemoProperty[] => {
  return properties.filter(p => p.type === type);
};

export const getPropertiesByPropertyType = (
  propertyType: PropertyType,
  properties: DemoProperty[] = demoProperties,
): DemoProperty[] => {
  return properties.filter(p => p.propertyType === propertyType);
};

export const getPropertiesByCity = (
  city: string,
  properties: DemoProperty[] = demoProperties,
): DemoProperty[] => {
  return properties.filter(
    p => p.city.toLowerCase() === city.toLowerCase(),
  );
};

