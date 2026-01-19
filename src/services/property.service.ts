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
      
      // Process images array - Backend returns array of string URLs
      // Format: ["https://...", "https://...", ...]
      let images: string[] = [];
      
      // Check response.data.images first (if backend returns it at top level)
      if (response.data.images && Array.isArray(response.data.images)) {
        images = response.data.images
          .map((img: any) => {
            if (typeof img === 'string') {
              // Backend already provides full URLs, but we'll normalize them
              const trimmed = img.trim();
              return trimmed && trimmed !== '' && trimmed !== 'null' ? fixImageUrl(trimmed) : null;
            }
            return null;
          })
          .filter((url: string | null): url is string => url !== null && url !== '' && url !== 'https://via.placeholder.com/400x300?text=No+Image');
      }
      
      // Check property.images (main location - backend returns images here)
      if (property.images && Array.isArray(property.images) && images.length === 0) {
        images = property.images
          .map((img: any) => {
            if (typeof img === 'string') {
              // Backend already provides full URLs
              const trimmed = img.trim();
              return trimmed && trimmed !== '' && trimmed !== 'null' ? fixImageUrl(trimmed) : null;
            } else if (img && typeof img === 'object') {
              // Handle object format (fallback)
              const url = img.image_url || img.url || img.path || img.image || '';
              return url ? fixImageUrl(url) : null;
            }
            return null;
          })
          .filter((url: string | null): url is string => url !== null && url !== '' && url !== 'https://via.placeholder.com/400x300?text=No+Image');
      }
      
      console.log('[PropertyService] Processed images:', {
        count: images.length,
        firstImage: images[0],
        allImages: images,
      });
      
      // Fix owner/seller data
      const owner = response.data.owner || response.data.seller || {};
      if (owner) {
        owner.profile_image = fixImageUrl(owner.profile_image);
      }
      
      // Merge owner data into property
      const propertyWithOwner = {
        ...property,
        seller_name: property.seller_name || owner.name || owner.full_name,
        seller_email: property.seller_email || owner.email,
        seller_phone: property.seller_phone || owner.phone,
        seller_id: property.seller_id || owner.id || owner.user_id,
        seller_verified: property.seller_verified || owner.verified,
        owner: owner,
      };
      
      return {
        ...response,
        data: {
          ...response.data,
          property: {
            ...propertyWithOwner,
            // Fix numeric fields
            latitude: property.latitude ? parseFloat(property.latitude) : null,
            longitude: property.longitude ? parseFloat(property.longitude) : null,
            price: parseFloat(property.price || '0'),
            area: parseFloat(property.area || '0'),
            carpet_area: parseFloat(property.carpet_area || '0'),
          },
          images, // Array of string URLs
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

  // Create property (for sellers - uses /seller/properties/add.php)
  createProperty: async (propertyData: any, userType: 'seller' | 'agent' = 'seller') => {
    // According to guide: images can be sent as base64 strings or URLs in the request body
    // Extract images from propertyData
    const {images, ...dataWithoutImages} = propertyData;
    
    // Prepare the request data
    const requestData = {
      ...dataWithoutImages,
      // Include images array if provided (as URLs or base64 strings)
      images: images && Array.isArray(images) && images.length > 0 ? images : undefined,
    };
    
    // Remove undefined/null values
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === undefined || requestData[key] === null || requestData[key] === '') {
        delete requestData[key];
      }
    });
    
    // Use correct endpoint based on user type
    const endpoint = userType === 'seller' 
      ? API_ENDPOINTS.SELLER_PROPERTIES_ADD 
      : API_ENDPOINTS.PROPERTY_CREATE; // Fallback for agents (may need separate endpoint)
    
    console.log('[PropertyService] Creating property with endpoint:', endpoint);
    console.log('[PropertyService] Request data:', JSON.stringify(requestData, null, 2));
    
    const response = await api.post(endpoint, requestData);
    
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
    console.log('[PropertyService] Deleting property:', propertyId);
    // Try with query param first (standard REST API format)
    try {
      const response = await api.delete(
        `${API_ENDPOINTS.PROPERTY_DELETE}?id=${propertyId}`,
      );
      console.log('[PropertyService] Delete response:', response);
      return response;
    } catch (error: any) {
      // If query param fails, try with property_id in body (some APIs prefer this)
      if (error?.status === 400 || error?.status === 404) {
        console.log('[PropertyService] Trying delete with property_id in body');
        try {
          const response = await api.delete(API_ENDPOINTS.PROPERTY_DELETE, {
            data: { property_id: propertyId },
          });
          console.log('[PropertyService] Delete response (body method):', response);
          return response;
        } catch (bodyError: any) {
          console.error('[PropertyService] Delete failed with both methods:', bodyError);
          throw bodyError;
        }
      }
      throw error;
    }
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
