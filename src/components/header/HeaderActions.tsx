import { StyleSheet, View } from 'react-native';

import {
  selectShowLanguageShortcut,
  selectShowThemeShortcut,
} from '../../features/preferences';
import { useAppSelector } from '../../store';
import { LanguageMenuButton } from './LanguageMenuButton';
import { ThemeToggleButton } from './ThemeToggleButton';

/**
 * Top-right header controls shared by every screen: language, then theme. Each
 * shortcut can be hidden in Settings (the same controls always stay in Settings).
 */
export function HeaderActions() {
  const showLanguage = useAppSelector(selectShowLanguageShortcut);
  const showTheme = useAppSelector(selectShowThemeShortcut);

  if (!showLanguage && !showTheme) {
    return null;
  }

  return (
    <View style={styles.row}>
      {showLanguage ? <LanguageMenuButton /> : null}
      {showTheme ? <ThemeToggleButton /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
});
