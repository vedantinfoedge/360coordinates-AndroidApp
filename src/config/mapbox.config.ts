/**
 * Mapbox configuration.
 * Replace with your real Mapbox token and style (this file may be gitignored).
 */

export const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN_HERE';

export const MAP_CONFIG = {
  DEFAULT_CENTER: [77.209, 28.6139] as [number, number],
  DEFAULT_ZOOM: 12,
  STYLE_URL: 'mapbox://styles/mapbox/streets-v12',
};

export function initializeMapbox(): void {
  // Set token via Mapbox SDK when component mounts if needed
}
