import api from './api.service';
import {API_ENDPOINTS, API_CONFIG} from '../config/api.config';
import {fixImageUrl, fixPropertyImages} from '../utils/imageHelper';

export const propertyService = {
  /**
   * Get properties list with all filters and pagination
   * 
   * Supported query parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 100)
   * - status: Property status ('approved', 'pending', 'rejected')
   * - property_type: 'Residential', 'Commercial', 'Land', 'Industrial'
   * - city: Filter by city
   * - location: Filter by location/area
   * - min_price: Minimum price
   * - max_price: Maximum price
   * - bedrooms: Number of bedrooms
   * - bathrooms: Number of bathrooms
   * - min_area: Minimum area in sq ft
   * - max_area: Maximum area in sq ft
   * - search: Search in title/description
   * - budget: Budget range (e.g., '25L-50L', '1Cr-2Cr', '5K-10K')
   * - area: Area range (e.g., '1000-2000 sq ft')
   * - sort_by: Sort option ('price_asc', 'price_desc', 'newest', 'oldest')
   * - latitude: For nearby properties
   * - longitude: For nearby properties
   * - radius: Radius in km for nearby search
   */
  getProperties: async (params: any = {}) => {
    // Build query string, filtering out empty values
    const queryParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>);
    
    const queryString = new URLSearchParams(queryParams).toString();
    const url = queryString
      ? `${API_ENDPOINTS.PROPERTIES_LIST}?${queryString}`
      : API_ENDPOINTS.PROPERTIES_LIST;
    
    const response = await api.get(url);
    
    console.log('[PropertyService] Raw API Response:', JSON.stringify(response, null, 2));
    console.log('[PropertyService] Request URL:', url);
    
    // Handle different backend response structures
    // According to backend docs: {success: true, data: {...}}
    if (response && response.success) {
      // Try multiple possible response structures
      let properties = [];
      
      if (response.data) {
        // Structure 1: {success: true, data: {properties: [...]}} - Most common
        if (response.data.properties && Array.isArray(response.data.properties)) {
          properties = response.data.properties;
          console.log('[PropertyService] Found properties in data.properties');
        }
        // Structure 2: {success: true, data: [...]} (direct array)
        else if (Array.isArray(response.data)) {
          properties = response.data;
          console.log('[PropertyService] Found properties as direct array in data');
        }
        // Structure 3: {success: true, data: {data: [...]}}
        else if (response.data.data && Array.isArray(response.data.data)) {
          properties = response.data.data;
          console.log('[PropertyService] Found properties in data.data');
        }
        // Structure 4: Backend might return {success: true, data: {list: [...]}} or similar
        else if (response.data.list && Array.isArray(response.data.list)) {
          properties = response.data.list;
          console.log('[PropertyService] Found properties in data.list');
        }
        // Structure 5: Check for any array field in data
        else {
          const dataKeys = Object.keys(response.data);
          for (const key of dataKeys) {
            if (Array.isArray(response.data[key])) {
              properties = response.data[key];
              console.log(`[PropertyService] Found properties in data.${key}`);
              break;
            }
          }
        }
      }
      
      // If still no properties, try response.properties
      if (properties.length === 0 && response.properties && Array.isArray(response.properties)) {
        properties = response.properties;
        console.log('[PropertyService] Found properties in root response.properties');
      }
      
      console.log('[PropertyService] Extracted properties count:', properties.length);
      
      if (properties.length > 0) {
        // Fix image URLs for all properties
        const fixedProperties = properties.map((prop: any) => ({
          ...prop,
          cover_image: fixImageUrl(prop.cover_image),
          // Fix latitude/longitude (backend returns as strings)
          latitude: prop.latitude ? parseFloat(prop.latitude) : null,
          longitude: prop.longitude ? parseFloat(prop.longitude) : null,
          // Fix numeric fields
          price: parseFloat(prop.price || '0'),
          area: parseFloat(prop.area || '0'),
          carpet_area: parseFloat(prop.carpet_area || '0'),
          maintenance_charges: parseFloat(prop.maintenance_charges || '0'),
          deposit_amount: parseFloat(prop.deposit_amount || '0'),
        }));
        
        // Return response matching guide format: {success: true, data: {properties: [...], pagination: {...}}}
        const currentPage = response.data?.page || response.data?.pagination?.current_page || response.page || params.page || 1;
        const perPage = response.data?.pagination?.per_page || params.limit || 20;
        const totalItems = response.data?.total || response.data?.pagination?.total_items || response.total || fixedProperties.length;
        const totalPages = response.data?.total_pages || response.data?.pagination?.total_pages || Math.ceil(totalItems / perPage);
        
        return {
          success: true,
          message: response.message || 'Properties retrieved successfully',
          data: {
            properties: fixedProperties,
            pagination: {
              current_page: currentPage,
              total_pages: totalPages,
              total_items: totalItems,
              per_page: perPage,
            },
          },
        };
      } else {
        console.log('[PropertyService] No properties found in response');
        return {
          success: true,
          message: 'No properties found',
          data: {
            properties: [],
            pagination: {
              current_page: params.page || 1,
              total_pages: 0,
              total_items: 0,
              per_page: params.limit || 20,
            },
          },
        };
      }
    }
    
    console.log('[PropertyService] Response not successful:', response);
    return response;
  },

  // Get property details
  getPropertyDetails: async (propertyId: string | number) => {
    const response = await api.get(
      `${API_ENDPOINTS.PROPERTY_DETAILS}?id=${propertyId}`,
    );
    
    // Fix image URLs in response
    if (response && response.success && response.data) {
      const property = fixPropertyImages(response.data.property || response.data);
      const images = (response.data.images || []).map((img: any) => ({
        ...img,
        image_url: fixImageUrl(img.image_url || img.url),
      }));
      
      // Fix owner profile image
      if (response.data.owner) {
        response.data.owner.profile_image = fixImageUrl(response.data.owner.profile_image);
      }
      
      return {
        ...response,
        data: {
          ...response.data,
          property: {
            ...property,
            // Fix numeric fields
            latitude: property.latitude ? parseFloat(property.latitude) : null,
            longitude: property.longitude ? parseFloat(property.longitude) : null,
            price: parseFloat(property.price || '0'),
            area: parseFloat(property.area || '0'),
            carpet_area: parseFloat(property.carpet_area || '0'),
          },
          images,
        },
      };
    }
    
    return response;
  },

  // Search properties
  searchProperties: async (searchData: {
    keyword?: string;
    city?: string;
    property_type?: string;
    status?: string;
    min_price?: number;
    max_price?: number;
    bedrooms?: string;
  }) => {
    const response = await api.post(API_ENDPOINTS.PROPERTY_SEARCH, searchData);
    return response;
  },

  // Get nearby properties (as per guide)
  getNearbyProperties: async (
    latitude: number,
    longitude: number,
    radius: number = 5,
    additionalFilters: any = {},
  ) => {
    const params = {
      latitude,
      longitude,
      radius,
      status: 'approved',
      ...additionalFilters,
    };
    return propertyService.getProperties(params);
  },

  // Create property
  createProperty: async (propertyData: any) => {
    // Check if propertyData contains images to upload
    const {images, ...dataWithoutImages} = propertyData;
    
    // First create the property
    const response = await api.post(API_ENDPOINTS.PROPERTY_CREATE, dataWithoutImages);
    
    // If property created successfully and images are provided, upload them
    if (response && response.success && images && Array.isArray(images) && images.length > 0) {
      const propertyId = response.data?.property_id || response.data?.id || response.data?.property?.id;
      if (propertyId) {
        try {
          await propertyService.uploadImages(propertyId, images);
          console.log('[PropertyService] Property created and images uploaded');
        } catch (imageError) {
          console.error('[PropertyService] Error uploading images:', imageError);
          // Don't fail the whole operation if images fail
        }
      }
    }
    
    return response;
  },

  // Update property
  updateProperty: async (propertyId: string | number, propertyData: any) => {
    const response = await api.put(API_ENDPOINTS.PROPERTY_UPDATE, {
      property_id: propertyId,
      ...propertyData,
    });
    return response;
  },

  // Delete property
  deleteProperty: async (propertyId: string | number) => {
    const response = await api.delete(
      `${API_ENDPOINTS.PROPERTY_DELETE}?id=${propertyId}`,
    );
    return response;
  },

  // Get user's properties
  getMyProperties: async () => {
    const response = await api.get(API_ENDPOINTS.MY_PROPERTIES);
    return response;
  },

  // Upload property images
  uploadImages: async (propertyId: string | number, images: any[]) => {
    const formData = new FormData();
    formData.append('property_id', String(propertyId));

    images.forEach((image, index) => {
      formData.append('images[]', {
        uri: image.uri || image,
        type: image.type || 'image/jpeg',
        name: image.fileName || `image_${index}.jpg`,
      } as any);
    });

    const response = await api.post(API_ENDPOINTS.UPLOAD_IMAGES, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  // Get image URL helper (use fixImageUrl from utils)
  getImageUrl: (imagePath: string) => {
    return fixImageUrl(imagePath);
  },
};
