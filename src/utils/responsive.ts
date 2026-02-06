import { Dimensions } from 'react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const MAX_SCALE = 1.25;
const MIN_SCALE = 0.85;

/** Scale horizontal dimensions (width, horizontal padding) by screen width. */
export function scale(size: number): number {
  const ratio = WINDOW_WIDTH / BASE_WIDTH;
  const scaled = size * Math.min(Math.max(ratio, MIN_SCALE), MAX_SCALE);
  return Math.round(scaled);
}

/** Scale vertical dimensions (height, vertical padding) by screen height. */
export function verticalScale(size: number): number {
  const ratio = WINDOW_HEIGHT / BASE_HEIGHT;
  const scaled = size * Math.min(Math.max(ratio, MIN_SCALE), MAX_SCALE);
  return Math.round(scaled);
}

/** Moderate scale for fonts and touch targets; factor 0.5 reduces scaling. */
export function moderateScale(size: number, factor: number = 0.5): number {
  const ratio = WINDOW_WIDTH / BASE_WIDTH;
  const capped = Math.min(Math.max(ratio, MIN_SCALE), MAX_SCALE);
  const scaled = size + (capped - 1) * size * factor;
  return Math.round(scaled);
}

export const windowWidth = WINDOW_WIDTH;
export const windowHeight = WINDOW_HEIGHT;
