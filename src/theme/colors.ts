export const colors = {
  // Brand colors - Purple and Navy theme
  primary: '#764ba2', // Purple - Primary brand color
  secondary: '#022b5f', // Dark Navy - Secondary accents
  accent: '#a884e3', // Light Purple - Accent color
  cta: '#764ba2', // Purple - CTA / Primary Buttons
  
  // Background & Surface
  background: '#FFFFFF', // White background
  surface: '#FFFFFF', // White surface
  surfaceSecondary: '#F7F7F7', // Light gray for subtle backgrounds
  
  // Text colors
  text: '#022b5f', // Dark Navy - Primary text
  textSecondary: '#666666', // Gray for secondary text
  textTertiary: '#999999',
  textblack:'#000000',// black text color 
  
  // UI elements
  border: '#E0E0E0', // Light gray border
  borderLight: '#F0F0F0', // Very light border
  disabled: '#CCCCCC', // Disabled state
  
  // Status colors
  error: '#F44336', // Red for errors
  success: '#4CAF50', // Green for success
  warning: '#FF9800', // Orange for warnings
  info: '#2196F3', // Blue for info
  
  // Additional colors for property site
  propertyCardBg: '#FFFFFF',
  propertyCardShadow: 'rgba(0, 0, 0, 0.08)', // Subtle shadow
  overlay: 'rgba(0, 0, 0, 0.5)', // Overlay for modals
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

