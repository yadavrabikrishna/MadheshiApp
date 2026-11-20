import { useReducer } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Button,
  MaskedField,
  SegmentedControl,
  type SegmentOption,
} from '../../../components';
import type { RateEntryMode } from '../../../features/interest';
import { useTranslation } from '../../../i18n';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme';
import { dateMask, groupedDecimalMask, plainDecimalMask } from '../../../utils';
import { SimpleInterestResultCard } from './SimpleInterestResultCard';
import {
  initialSimpleInterestForm,
  simpleInterestFormReducer,
} from './simpleInterestForm';
import {
  groupErrorsByField,
  type SimpleInterestField,
} from './simpleInterestMessages';

/** Simple Interest calculator (local state only; the engine does the math). */
export function SimpleInterestView() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [form, dispatch] = useReducer(
    simpleInterestFormReducer,
    initialSimpleInterestForm,
  );

  const errorKeys = groupErrorsByField(form.errors);
  const errorsFor = (field: SimpleInterestField) =>
    (errorKeys[field] ?? []).map(key => t(key));
  const errorPrefix = t('simpleInterest.error.prefix');

  const modeOptions: SegmentOption<RateEntryMode>[] = [
    { value: 'percentPerMonth', label: t('simpleInterest.rateMode.percent') },
    {
      value: 'rupeesPer100PerMonth',
      label: t('simpleInterest.rateMode.rupees'),
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <MaskedField
          mask={groupedDecimalMask}
          label={t('simpleInterest.principal.label')}
          hint={t('simpleInterest.principal.hint')}
          placeholder={t('simpleInterest.principal.placeholder')}
          prefix={t('simpleInterest.currency')}
          keyboardType="decimal-pad"
          value={form.principal}
          onChangeValue={value =>
            dispatch({ type: 'edit', field: 'principal', value })
          }
          errors={errorsFor('principal')}
          errorPrefix={errorPrefix}
        />

        <Text style={styles.sectionLabel}>
          {t('simpleInterest.rateMode.label')}
        </Text>
        <SegmentedControl
          options={modeOptions}
          value={form.rateMode}
          onChange={mode => dispatch({ type: 'setRateMode', mode })}
          accessibilityLabel={t('simpleInterest.rateMode.label')}
        />
        <View style={styles.gap} />
        <MaskedField
          mask={plainDecimalMask}
          label={t('simpleInterest.rate.label')}
          hint={t(
            form.rateMode === 'percentPerMonth'
              ? 'simpleInterest.rate.hint.percent'
              : 'simpleInterest.rate.hint.rupees',
          )}
          placeholder={t('simpleInterest.rate.placeholder')}
          keyboardType="decimal-pad"
          value={form.rate}
          onChangeValue={value =>
            dispatch({ type: 'edit', field: 'rate', value })
          }
          errors={[...errorsFor('rate'), ...errorsFor('rateMode')]}
          errorPrefix={errorPrefix}
        />

        <MaskedField
          mask={dateMask}
          label={t('simpleInterest.startDate.label')}
          hint={t('simpleInterest.date.hint')}
          placeholder={t('simpleInterest.date.placeholder')}
          keyboardType="number-pad"
          value={form.startDate}
          onChangeValue={value =>
            dispatch({ type: 'edit', field: 'startDate', value })
          }
          errors={errorsFor('startDate')}
          errorPrefix={errorPrefix}
        />
        <MaskedField
          mask={dateMask}
          label={t('simpleInterest.endDate.label')}
          placeholder={t('simpleInterest.date.placeholder')}
          keyboardType="number-pad"
          value={form.endDate}
          onChangeValue={value =>
            dispatch({ type: 'edit', field: 'endDate', value })
          }
          errors={errorsFor('endDate')}
          errorPrefix={errorPrefix}
        />

        {form.errors.length > 0 ? (
          // Visual summary only: each field's own error row is the announced one.
          <Text style={[styles.summary, { color: theme.colors.error }]}>
            {t('simpleInterest.error.summary')}
          </Text>
        ) : null}

        <Button
          variant="primary"
          label={t('simpleInterest.calculate')}
          onPress={() => dispatch({ type: 'calculate' })}
        />

        {form.result ? (
          <SimpleInterestResultCard
            result={form.result}
            enteredRate={form.rate}
            rateMode={form.rateMode}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: AppTheme) => ({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 6,
  },
  gap: { height: 16 },
  summary: { fontSize: 14, marginBottom: 12 },
});
