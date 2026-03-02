/**
 * Mapbox Configuration
 *
 * To get your Mapbox access token:
 * 1. Sign up at https://account.mapbox.com/
 * 2. Go to Account > Access tokens
 * 3. Copy your default public token or create a new one
 *
 * For production, store this token securely (e.g., environment variables)
 * For now, you can get it from backend API: GET /config/mapbox-token.php
 */

import {API_CONFIG} from './api.config';

// Mapbox public access token (from API config as per guide)
export const MAPBOX_ACCESS_TOKEN =
  API_CONFIG.MAPBOX_TOKEN ||
  'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';

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

    // Fallback to hardcoded token (for development)
    if (
      MAPBOX_ACCESS_TOKEN &&
      MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN_HERE'
    ) {
      const Mapbox = require('@rnmapbox/maps').default;
      Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    } else {
      console.warn(
        'Mapbox access token not configured. Please set MAPBOX_ACCESS_TOKEN in mapbox.config.ts'
      );
    }
  } catch (error) {
    console.error('Error initializing Mapbox:', error);
  }
};
