/**
 * Mapbox Configuration
 *
 * Token is loaded from API_CONFIG.MAPBOX_TOKEN with fallback.
 * Get token at https://account.mapbox.com/ > Access tokens
 */

import {API_CONFIG} from './api.config';

// Mapbox public access token
export const MAPBOX_ACCESS_TOKEN =
  API_CONFIG.MAPBOX_TOKEN || 'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';

// Default map settings
export const MAP_CONFIG = {
  // Default center (Pune, India)
  DEFAULT_CENTER: [73.8567, 18.5204] as [number, number], // Pune coordinates [longitude, latitude]
  DEFAULT_ZOOM: 10,

  // Map style
  STYLE_URL: 'mapbox://styles/mapbox/streets-v12', // or 'mapbox://styles/mapbox/satellite-v9'

  // Marker colors
  MARKER_COLORS: {
    SALE: '#4CAF50', // Green for sale
    RENT: '#2196F3', // Blue for rent
    SELECTED: '#F44336', // Red for selected
  },
};

// Initialize Mapbox (call this in App.tsx or index.js)
export const initializeMapbox = async () => {
  try {
    // Try to get token from backend first
    // const response = await api.get('/config/mapbox-token.php');
    // if (response.success && response.data?.token) {
    //   Mapbox.setAccessToken(response.data.token);
    //   return;
    // }

    if (MAPBOX_ACCESS_TOKEN) {
      const Mapbox = require('@rnmapbox/maps').default;
      Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    } else {
      console.warn(
        'Mapbox access token not configured. Add MAPBOX_ACCESS_TOKEN to .env (see .env.example)'
      );
    }
  } catch (error) {
    console.error('Error initializing Mapbox:', error);
  }
};
