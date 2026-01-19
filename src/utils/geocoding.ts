/**
 * Geocoding Service for Mapbox
 * Converts addresses to coordinates and vice versa
 */

import {MAPBOX_ACCESS_TOKEN} from '../config/mapbox.config';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  placeName: string;
}

export interface ReverseGeocodeResult {
  placeName: string;
  address: string;
  context?: any[]; // Add context array for state extraction
  coordinates?: [number, number]; // Add coordinates
}

/**
 * Geocode a location (address to coordinates)
 * @param location - Address or location name
 * @returns Coordinates and place name, or null if not found
 */
export const geocodeLocation = async (
  location: string,
): Promise<GeocodeResult | null> => {
  try {
    const encodedLocation = encodeURIComponent(location);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedLocation}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=in&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return {
        latitude,
        longitude,
        placeName: data.features[0].place_name,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Extract state name from Mapbox context array
 * @param context - Array of context objects from Mapbox API
 * @returns State name if found, null otherwise
 */
export const extractStateFromContext = (context?: any[]): string | null => {
  if (!context || !Array.isArray(context) || context.length === 0) {
    return null;
  }

  // Find all region contexts (state-level regions)
  const regionContexts = context.filter(
    (ctx: any) => ctx.id?.startsWith('region.')
  );

  if (regionContexts.length === 0) {
    return null;
  }

  // If there's only one region context, use it
  if (regionContexts.length === 1) {
    return regionContexts[0].text || regionContexts[0].name || null;
  }

  // If there are multiple region contexts, prioritize:
  // 1. The one with a short_code (state code like "MH", "KA", etc.)
  // 2. The one that appears later in the context array (state is typically after district)
  // 3. The first one as fallback

  // Try to find one with short_code first
  const stateWithCode = regionContexts.find(
    (ctx: any) => ctx.short_code && ctx.short_code.length === 2
  );
  if (stateWithCode) {
    return stateWithCode.text || stateWithCode.name || null;
  }

  // Find the region context that appears last in the original context array
  // (state is typically after district in the hierarchy)
  let lastRegionIndex = -1;
  let lastRegionContext = null;
  
  context.forEach((ctx: any, index: number) => {
    if (ctx.id?.startsWith('region.')) {
      lastRegionIndex = index;
      lastRegionContext = ctx;
    }
  });

  if (lastRegionContext) {
    return lastRegionContext.text || lastRegionContext.name || null;
  }

  // Fallback to first region context
  return regionContexts[0].text || regionContexts[0].name || null;
};

/**
 * Reverse geocode coordinates (coordinates to address)
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Place name and address, or null if not found
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> => {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=in&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        placeName: feature.place_name,
        address: feature.place_name,
        context: feature.context || [], // Include context for state extraction
        coordinates: feature.center ? [feature.center[0], feature.center[1]] : undefined,
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

