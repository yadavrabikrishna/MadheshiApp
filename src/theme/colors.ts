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

  border: '#E5E7EB',
  tabInactive: '#6B7280',
} as const;

export const darkColors = {
  primary: brandColors.crimson,
  secondary: brandColors.deepBlue,

  background: '#111827',
  surface: '#1F2937',

  text: '#F9FAFB',
  textSecondary: '#9CA3AF',

  border: '#374151',
  tabInactive: '#9CA3AF',
} as const;

export const appColors = {
  brand: brandColors,
  light: lightColors,
  dark: darkColors,
} as const;

export type AppThemeMode = 'light' | 'dark';
