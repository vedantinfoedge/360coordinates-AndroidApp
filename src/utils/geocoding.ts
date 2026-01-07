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
      return {
        placeName: data.features[0].place_name,
        address: data.features[0].place_name,
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

