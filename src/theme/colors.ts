export const colors = {
  // Brand colors - Fresh Blue Modern Theme
  primary: '#0077C0', // Vibrant Blue - Primary brand color
  primaryDark: '#005A94', // Darker blue for pressed states
  primaryLight: '#3399D6', // Lighter blue for hover/active
  secondary: '#1D242B', // Dark Charcoal - Secondary accents
  accent: '#C7EEFF', // Light Sky Blue - Accent color
  cta: '#0077C0', // Vibrant Blue - CTA / Primary Buttons
  
  // Background & Surface - Clean, fresh backgrounds
  background: '#FAFAFA', // Clean off-white background
  backgroundPure: '#FFFFFF', // Pure white when needed
  backgroundOffWhite: '#FAFAFA', // Off-white for modern screens
  surface: '#FFFFFF', // White surface / cards
  surfaceSecondary: '#F5F8FA', // Subtle blue-tinted gray for inactive states
  surfaceCard: '#FFFFFF', // Card background with shadow
  accentLight: '#C7EEFF', // Light blue tint for highlights
  accentLighter: '#E3F6FF', // Softer sky blue for backgrounds
  accentSoft: '#F0FAFF', // Very soft blue tint for backgrounds
  
  // Text colors
  text: '#1D242B', // Dark charcoal for excellent readability
  textPrimary: '#1D242B', // Dark Charcoal - Primary text / headings
  textSecondary: '#5A6978', // Blue-gray for secondary text
  textTertiary: '#8B97A6', // Lighter gray for hints
  textblack: '#000000', // Black text color 
  
  // UI elements
  border: '#E1E8ED', // Soft blue-tinted border
  borderLight: '#F0F4F8', // Very light border
  borderFocus: '#0077C0', // Blue border for focus states
  disabled: '#CBD5DC', // Disabled state
  
  // Status colors
  error: '#E53935', // Modern red for errors
  success: '#00C853', // Fresh green for success
  warning: '#FF9800', // Warm orange for warnings
  info: '#0077C0', // Brand blue for info
  
  // Status light colors (for backgrounds)
  successLight: '#E8F5E9',
  errorLight: '#FFEBEE',
  warningLight: '#FFF3E0',
  infoLight: '#E3F6FF',
  
  // Additional surface colors
  surfaceTertiary: '#F5F8FA',
  
  // Additional text colors
  textMuted: '#8B97A6',
  textDisabled: '#CBD5DC',
  
  // Additional colors for property site
  propertyCardBg: '#FFFFFF',
  propertyCardShadow: 'rgba(29, 36, 43, 0.08)', // Subtle shadow with brand color
  overlay: 'rgba(29, 36, 43, 0.6)', // Overlay for modals
  overlayLight: 'rgba(29, 36, 43, 0.3)', // Lighter overlay
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionSemibold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  price: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 24,
  round: 9999,
};

// Modern shadow presets for fresh, clean cards
export const shadows = {
  card: {
    shadowColor: '#1D242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#1D242B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  button: {
    shadowColor: '#0077C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  subtle: {
    shadowColor: '#1D242B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};

