import { StyleSheet, View } from 'react-native';

import { LanguageMenuButton } from './LanguageMenuButton';
import { ThemeToggleButton } from './ThemeToggleButton';

/** Top-right header controls shared by every screen: language, then theme. */
export function HeaderActions() {
  return (
    <View style={styles.row}>
      <LanguageMenuButton />
      <ThemeToggleButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
});
