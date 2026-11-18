import { ScrollView, Text, View } from 'react-native';

import { SegmentedControl } from '../../components/common/SegmentedControl';
import { SwitchRow } from '../../components/common/SwitchRow';
import {
  selectHasUnsavedPreferences,
  selectLanguage,
  selectPreferencesLoadError,
  selectShowLanguageShortcut,
  selectShowThemeShortcut,
  selectThemeMode,
  setLanguage,
  setLanguageShortcutVisible,
  setTheme,
  setThemeShortcutVisible,
} from '../../features/preferences';
import { useTranslation } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store';
import { useThemedStyles, type AppTheme } from '../../theme';
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  THEME_MODES,
} from '../../types/preferences';

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);
  const language = useAppSelector(selectLanguage);
  const hasUnsaved = useAppSelector(selectHasUnsavedPreferences);
  const loadError = useAppSelector(selectPreferencesLoadError);
  const showThemeShortcut = useAppSelector(selectShowThemeShortcut);
  const showLanguageShortcut = useAppSelector(selectShowLanguageShortcut);
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const themeOptions = THEME_MODES.map(mode => ({
    value: mode,
    label: t(mode === 'light' ? 'settings.theme.light' : 'settings.theme.dark'),
  }));
  const languageOptions = LANGUAGES.map(code => ({
    value: code,
    label: LANGUAGE_LABELS[code],
  }));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {loadError !== null ? (
        <Text style={styles.warning} accessibilityRole="alert">
          {t('settings.loadError')}
        </Text>
      ) : null}
      {hasUnsaved ? (
        <Text style={styles.warning} accessibilityRole="alert">
          {t('settings.saveError')}
        </Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('settings.appearance')}
        </Text>
        <Text style={styles.label}>{t('settings.theme')}</Text>
        <SegmentedControl
          options={themeOptions}
          value={themeMode}
          onChange={mode => dispatch(setTheme(mode))}
          accessibilityLabel={t('settings.theme')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('settings.language')}
        </Text>
        <SegmentedControl
          options={languageOptions}
          value={language}
          onChange={code => dispatch(setLanguage(code))}
          accessibilityLabel={t('settings.language')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('settings.headerShortcuts')}
        </Text>
        <SwitchRow
          label={t('settings.showThemeShortcut')}
          value={showThemeShortcut}
          onValueChange={visible => dispatch(setThemeShortcutVisible(visible))}
        />
        <SwitchRow
          label={t('settings.showLanguageShortcut')}
          value={showLanguageShortcut}
          onValueChange={visible =>
            dispatch(setLanguageShortcutVisible(visible))
          }
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 24 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  label: { fontSize: 16, color: theme.colors.text },
  warning: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 10,
    padding: 12,
  },
});
