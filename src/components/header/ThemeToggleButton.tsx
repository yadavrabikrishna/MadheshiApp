import { Pressable } from 'react-native';

import { selectThemeMode, setTheme } from '../../features/preferences';
import { useTranslation } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';
import { Icon } from '../common/Icon';

/** Header button that flips between light and dark. Shows the mode it will switch to. */
export function ThemeToggleButton() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(selectThemeMode);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const isDark = mode === 'dark';

  return (
    <Pressable
      style={styles.button}
      onPress={() => dispatch(setTheme(isDark ? 'light' : 'dark'))}
      accessibilityRole="button"
      accessibilityLabel={t(
        isDark ? 'header.switchToLight' : 'header.switchToDark',
      )}
      hitSlop={4}
    >
      <Icon
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={24}
        color={theme.colors.text}
      />
    </Pressable>
  );
}

const createStyles = (_theme: AppTheme) => ({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
