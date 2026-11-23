import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, SwitchRow } from '../../components';
import {
  GROUP_CALCULATORS,
  GROUP_ORDER,
  normalizeEnabled,
  saveCalculatorSettings,
  selectCalculatorsSaveError,
  selectEnabledCalculators,
  type CalculatorGroup,
} from '../../features/calculators';
import { useTranslation } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store';
import { useThemedStyles, type AppTheme } from '../../theme';
import {
  CALCULATOR_IDS,
  type CalculatorId,
  type EnabledCalculators,
} from '../../types/calculators';
import { InterestRateSettingsSection } from './InterestRateSettingsSection';
import {
  CALCULATOR_NAME_KEYS,
  GROUP_LABEL_KEYS,
} from '../Calculator/calculatorLabels';

const ALL_ON = Object.fromEntries(
  CALCULATOR_IDS.map(id => [id, true]),
) as EnabledCalculators;
const ALL_OFF = Object.fromEntries(
  CALCULATOR_IDS.map(id => [id, false]),
) as EnabledCalculators;

const SPECIALIST_GROUPS = GROUP_ORDER.filter(group => group !== 'basic');

/** Settings shows the calculators in their fallback order (AD before BS). */
const calculatorsOf = (group: CalculatorGroup) =>
  CALCULATOR_IDS.filter(id => GROUP_CALCULATORS[group].includes(id));

/**
 * Choose which calculators are available. Every change is a local draft; only
 * Save applies it (to the Calculator navigation) and persists it. Cancel and
 * leaving the screen discard the draft.
 */
export function CalculatorSettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const saved = useAppSelector(selectEnabledCalculators);
  const saveFailed = useAppSelector(selectCalculatorsSaveError);

  // Local state, so changing the app language re-renders without resetting it.
  const [draft, setDraft] = useState<EnabledCalculators>(saved);
  const [showAtLeastOne, setShowAtLeastOne] = useState(false);

  const edit = (next: EnabledCalculators) => {
    setDraft(next);
    setShowAtLeastOne(false);
  };
  const toggle = (id: CalculatorId, value: boolean) =>
    edit({ ...draft, [id]: value });

  const save = () => {
    const { enabled, basicAutoEnabled } = normalizeEnabled(draft);
    dispatch(saveCalculatorSettings(draft));
    if (basicAutoEnabled) {
      // Stay, so the explanation is seen; the switches now show what was saved.
      setDraft(enabled);
      setShowAtLeastOne(true);
    } else {
      navigation.goBack();
    }
  };

  const renderRow = (id: CalculatorId) => (
    <SwitchRow
      key={id}
      label={t(CALCULATOR_NAME_KEYS[id])}
      value={draft[id]}
      onValueChange={value => toggle(id, value)}
    />
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>{t('calculatorSettings.intro')}</Text>

        {saveFailed ? (
          <Text style={styles.warning} accessibilityRole="alert">
            {t('settings.saveError')}
          </Text>
        ) : null}
        {showAtLeastOne ? (
          <Text style={styles.warning} accessibilityRole="alert">
            {t('calculatorSettings.atLeastOne')}
          </Text>
        ) : null}

        <View style={styles.bulkRow}>
          <Button
            label={t('calculatorSettings.selectAll')}
            onPress={() => edit(ALL_ON)}
            fill
          />
          <Button
            label={t('calculatorSettings.deselectAll')}
            onPress={() => edit(ALL_OFF)}
            fill
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('calculatorSettings.specialist')}
          </Text>
          {SPECIALIST_GROUPS.map(group => (
            <View key={group} style={styles.group}>
              <Text style={styles.groupTitle} accessibilityRole="header">
                {t(GROUP_LABEL_KEYS[group])}
              </Text>
              {calculatorsOf(group).map(renderRow)}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t(GROUP_LABEL_KEYS.basic)}
          </Text>
          {calculatorsOf('basic').map(renderRow)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('interestRate.title')}
          </Text>
          <Text style={styles.intro}>{t('interestRate.intro')}</Text>
          <InterestRateSettingsSection calculator="simple" />
          <InterestRateSettingsSection calculator="compound" />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button
          label={t('calculatorSettings.cancel')}
          onPress={() => navigation.goBack()}
          fill
        />
        <Button
          label={t('calculatorSettings.save')}
          onPress={save}
          variant="primary"
          fill
        />
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 24 },
  intro: { fontSize: 14, lineHeight: 21, color: theme.colors.textSecondary },
  bulkRow: { flexDirection: 'row' as const, gap: 12 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  group: { gap: 4 },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
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
  footer: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
