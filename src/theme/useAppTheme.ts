import { useMemo } from 'react';
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { selectThemeMode } from '../features/preferences';
import { useAppSelector } from '../store';
import { themes, type AppTheme } from './themes';

/** The active theme, from Redux. Re-renders the caller when the theme changes. */
export function useAppTheme(): AppTheme {
  return themes[useAppSelector(selectThemeMode)];
}

/**
 * Build a StyleSheet from the active theme, recreated only when the theme changes.
 *
 *   const styles = useThemedStyles(theme => ({ box: { backgroundColor: theme.colors.surface } }));
 */
type Style = ViewStyle | TextStyle | ImageStyle;

export function useThemedStyles<T extends Record<string, Style>>(
  factory: (theme: AppTheme) => T,
): T {
  const theme = useAppTheme();
  // The factory is expected to be a stable, module-level function.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
