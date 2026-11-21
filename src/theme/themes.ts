import type { StatusBarStyle } from 'react-native';

import type { ThemeMode } from '../types/preferences';
import { appColors } from './colors';

/** Semantic color tokens. Components use these names, never raw hex values. */
export interface ThemeColors {
  primary: string;
  onPrimary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  tabInactive: string;
  /** Scrim behind popups. */
  overlay: string;
  /** Validation messages and invalid-field borders. Always paired with text/an icon. */
  error: string;
}

export interface AppTheme {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  statusBarStyle: StatusBarStyle;
}

export const themes: Record<ThemeMode, AppTheme> = {
  light: {
    mode: 'light',
    isDark: false,
    colors: appColors.light,
    statusBarStyle: 'dark-content',
  },
  dark: {
    mode: 'dark',
    isDark: true,
    colors: appColors.dark,
    statusBarStyle: 'light-content',
  },
};
