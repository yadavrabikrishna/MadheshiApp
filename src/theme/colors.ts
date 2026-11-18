export const brandColors = {
  crimson: '#DC143C',
  deepBlue: '#003893',
  white: '#FFFFFF',
} as const;

export const lightColors = {
  primary: brandColors.crimson,
  secondary: brandColors.deepBlue,

  background: '#F7F8FA',
  surface: brandColors.white,

  text: '#1F2937',
  textSecondary: '#6B7280',
  onPrimary: brandColors.white,

  border: '#E5E7EB',
  tabInactive: '#6B7280',
  overlay: 'rgba(17, 24, 39, 0.4)',
} as const;

export const darkColors = {
  primary: brandColors.crimson,
  secondary: brandColors.deepBlue,

  background: '#111827',
  surface: '#1F2937',

  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  onPrimary: brandColors.white,

  border: '#374151',
  tabInactive: '#9CA3AF',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const appColors = {
  brand: brandColors,
  light: lightColors,
  dark: darkColors,
} as const;
