/**
 * Mapbox Configuration
 *
 * Token is loaded from .env (MAPBOX_ACCESS_TOKEN).
 * Copy .env.example to .env and add your token.
 * Get token at https://account.mapbox.com/ > Access tokens
 */

import {MAPBOX_ACCESS_TOKEN as ENV_MAPBOX_TOKEN} from '@env';

// Mapbox public access token (from .env - never commit .env)
export const MAPBOX_ACCESS_TOKEN =
  ENV_MAPBOX_TOKEN || 'YOUR_MAPBOX_ACCESS_TOKEN_HERE';

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

    if (
      MAPBOX_ACCESS_TOKEN &&
      MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN_HERE'
    ) {
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
