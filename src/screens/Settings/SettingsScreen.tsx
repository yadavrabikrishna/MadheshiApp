import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Icon } from '../../components';
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
import type { RootStackParamList } from '../../navigation/navigation.types';
import { useAppDispatch, useAppSelector } from '../../store';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';
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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
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
          {t('tabs.calculator')}
        </Text>
        <Pressable
          style={styles.linkRow}
          onPress={() => navigation.navigate('CalculatorSettings')}
          accessibilityRole="button"
          accessibilityLabel={t('calculatorSettings.title')}
          accessibilityHint={t('calculatorSettings.entry.description')}
        >
          <View style={styles.linkText}>
            <Text style={styles.label}>{t('calculatorSettings.title')}</Text>
            <Text style={styles.linkDescription}>
              {t('calculatorSettings.entry.description')}
            </Text>
          </View>
          <Icon
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        </Pressable>
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
  linkRow: {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  linkText: { flex: 1, gap: 2 },
  linkDescription: { fontSize: 13, color: theme.colors.textSecondary },
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
