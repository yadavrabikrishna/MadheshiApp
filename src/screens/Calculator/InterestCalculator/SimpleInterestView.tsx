import { useEffect, useReducer, useRef } from 'react';
import {
  Keyboard,
  ScrollView,
  Text,
  View,
  type TextInputInstance,
} from 'react-native';

import {
  Button,
  FieldError,
  MaskedField,
  SegmentedControl,
  useKeyboardAwareForm,
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
  getDateError,
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

  const keyboardForm = useKeyboardAwareForm();
  const { scrollToTop } = keyboardForm;
  const principalRef = useRef<TextInputInstance>(null);
  const rateRef = useRef<TextInputInstance>(null);
  const startDateRef = useRef<TextInputInstance>(null);
  const endDateRef = useRef<TextInputInstance>(null);

  // The summary is at the top of the form; after a failed Calculate (pressed
  // lower down) bring it, and the first invalid field, back into view.
  useEffect(() => {
    if (form.errors.length > 0) {
      scrollToTop();
    }
  }, [form.errors, scrollToTop]);

  /**
   * Keyboard action key for the text inputs, top to bottom: "Next" keeps the
   * keyboard open and focuses the following field; the last field shows "Done"
   * and closes it. Each focus also scrolls the field above the keyboard.
   */
  const chain = (
    current: React.RefObject<TextInputInstance | null>,
    next?: React.RefObject<TextInputInstance | null>,
  ) => ({
    ref: current,
    returnKeyType: next ? ('next' as const) : ('done' as const),
    submitBehavior: next ? ('submit' as const) : ('blurAndSubmit' as const),
    onSubmitEditing: () => {
      if (next) {
        next.current?.focus();
      } else {
        Keyboard.dismiss();
      }
    },
    onFocus: () => keyboardForm.onFieldFocus(current.current),
    onBlur: () => keyboardForm.onFieldBlur(current.current),
  });

  const errorKeys = groupErrorsByField(form.errors);
  const errorsFor = (field: SimpleInterestField) =>
    (errorKeys[field] ?? []).map(key => t(key));
  const errorPrefix = t('simpleInterest.error.prefix');
  // Both dates share one message under their row; only its own field is marked.
  const dateError = getDateError(form.errors);

  const modeOptions: SegmentOption<RateEntryMode>[] = [
    { value: 'percentPerMonth', label: t('simpleInterest.rateMode.percent') },
    {
      value: 'rupeesPer100PerMonth',
      label: t('simpleInterest.rateMode.rupees'),
    },
  ];

  return (
    // collapsable={false}: Android must keep this view so it can be measured.
    <View
      ref={keyboardForm.containerRef}
      collapsable={false}
      style={[styles.flex, { paddingBottom: keyboardForm.keyboardInset }]}
    >
      <ScrollView
        ref={keyboardForm.scrollRef}
        {...keyboardForm.scrollProps}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {form.errors.length > 0 ? (
          // Visual summary only: each field's own error row is the announced one.
          <Text style={[styles.summary, { color: theme.colors.error }]}>
            {t('simpleInterest.error.summary')}
          </Text>
        ) : null}

        <MaskedField
          {...chain(principalRef, rateRef)}
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
          {...chain(rateRef, startDateRef)}
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

        <View style={styles.dateGroup}>
          <View style={styles.dateRow} testID="simple-interest-date-row">
            <View style={styles.dateCell} testID="simple-interest-start-date">
              <MaskedField
                {...chain(startDateRef, endDateRef)}
                mask={dateMask}
                label={t('simpleInterest.startDate.label')}
                hint={t('simpleInterest.date.hint')}
                hintVisible={false}
                placeholder={t('simpleInterest.date.placeholder')}
                keyboardType="number-pad"
                value={form.startDate}
                onChangeValue={value =>
                  dispatch({ type: 'edit', field: 'startDate', value })
                }
                invalid={dateError?.field === 'startDate'}
                containerStyle={styles.dateField}
              />
            </View>
            <View style={styles.dateCell} testID="simple-interest-end-date">
              <MaskedField
                {...chain(endDateRef)}
                mask={dateMask}
                label={t('simpleInterest.endDate.label')}
                hint={t('simpleInterest.date.hint')}
                hintVisible={false}
                placeholder={t('simpleInterest.date.placeholder')}
                keyboardType="number-pad"
                value={form.endDate}
                onChangeValue={value =>
                  dispatch({ type: 'edit', field: 'endDate', value })
                }
                invalid={dateError?.field === 'endDate'}
                containerStyle={styles.dateField}
              />
            </View>
          </View>
          {dateError ? (
            <FieldError
              message={t(dateError.messageKey)}
              prefix={errorPrefix}
            />
          ) : null}
          <Text style={styles.dateHint}>{t('simpleInterest.date.hint')}</Text>
        </View>

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
    </View>
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
  dateGroup: { marginBottom: 16 },
  dateRow: { flexDirection: 'row' as const, gap: 12 },
  // Equal widths: both cells share the row; minWidth 0 lets a long value shrink.
  dateCell: { flex: 1, minWidth: 0 },
  dateField: { marginBottom: 0 },
  dateHint: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
});
