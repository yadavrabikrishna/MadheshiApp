import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import type { AppTheme } from './themes';

/** Map the app's semantic tokens onto React Navigation's theme. */
export function getNavigationTheme(theme: AppTheme): Theme {
  const base = theme.isDark ? DarkTheme : DefaultTheme;
  const { colors } = theme;

  return {
    ...base,
    dark: theme.isDark,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };
}
