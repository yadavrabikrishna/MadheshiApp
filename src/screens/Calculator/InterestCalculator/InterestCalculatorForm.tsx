import { useEffect, useMemo, useReducer, useRef } from 'react';
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
} from '../../../components';
import { normalizeDirectDuration } from '../../../features/interest';
import { selectInterestRateConfig } from '../../../features/interestRateConfig';
import { useTranslation } from '../../../i18n';
import { useAppSelector } from '../../../store';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme';
import {
  dateMask,
  fillTemplate,
  groupedDecimalMask,
  plainDecimalMask,
  wholeNumberMask,
} from '../../../utils';
import { SimpleInterestResultCard } from './SimpleInterestResultCard';
import { formatDuration } from './simpleInterestDisplay';
import type { InterestCalculatorConfig } from './interestCalculatorConfig';
import {
  createInterestFormReducer,
  initialInterestForm,
  type DurationField,
  type DurationMode,
} from './interestForm';
import { getInterestRateHint } from './interestRateHint';
import {
  getDateError,
  groupErrorsByField,
  type SimpleInterestField,
} from './simpleInterestMessages';

interface InterestCalculatorFormProps {
  /** Which interest type this is and which engine calculates it. */
  config: InterestCalculatorConfig;
}

/**
 * The one Interest calculator UI, shared by Simple and Compound Interest: the
 * same fields, labels, layout and result. Form state is local; the engine from
 * `config` does the math, and without one Calculate is unavailable.
 */
export function InterestCalculatorForm({
  config,
}: InterestCalculatorFormProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const reducer = useMemo(
    () => createInterestFormReducer(config.engine),
    [config.engine],
  );
  // This calculator's own saved rate configuration (Simple and Compound differ).
  const rateConfig = useAppSelector(selectInterestRateConfig(config.type));
  const [form, dispatch] = useReducer(
    reducer,
    initialInterestForm,
    (initial): typeof initialInterestForm => ({
      ...initial,
      rateConfig,
    }),
  );
  // A settings change applies to the open form at once; a shown result is
  // dropped when the way the rate is read changes.
  useEffect(() => {
    dispatch({ type: 'setRateConfig', config: rateConfig });
  }, [rateConfig]);
  const canCalculate = config.engine !== null;

  const keyboardForm = useKeyboardAwareForm();
  const { scrollToTop } = keyboardForm;
  const principalRef = useRef<TextInputInstance>(null);
  const rateRef = useRef<TextInputInstance>(null);
  const startDateRef = useRef<TextInputInstance>(null);
  const endDateRef = useRef<TextInputInstance>(null);
  const yearsRef = useRef<TextInputInstance>(null);
  const monthsRef = useRef<TextInputInstance>(null);
  const daysRef = useRef<TextInputInstance>(null);

  // The summary is at the top of the form; after a failed Calculate (pressed
  // lower down) bring it, and the first invalid field, back into view.
  useEffect(() => {
    if (form.errors.length > 0 || form.durationErrors.length > 0) {
      scrollToTop();
    }
  }, [form.errors, form.durationErrors, scrollToTop]);

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

  const durationError = form.durationErrors[0];
  // The normalized equivalent of what is typed, shown live beneath the inputs.
  const directDuration = normalizeDirectDuration(form);
  const durationFields: {
    field: DurationField;
    label: string;
    ref: React.RefObject<TextInputInstance | null>;
    next?: React.RefObject<TextInputInstance | null>;
  }[] = [
    {
      field: 'years',
      label: t('simpleInterest.unit.years'),
      ref: yearsRef,
      next: monthsRef,
    },
    {
      field: 'months',
      label: t('simpleInterest.unit.months'),
      ref: monthsRef,
      next: daysRef,
    },
    { field: 'days', label: t('simpleInterest.unit.days'), ref: daysRef },
  ];

  const rateHint = getInterestRateHint(rateConfig);
  const rateHintText = rateHint.unitKey
    ? fillTemplate(t(rateHint.key), {
        amount: rateHint.amount ?? '',
        unit: t(rateHint.unitKey),
      })
    : t(rateHint.key);

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
        {form.errors.length > 0 || form.durationErrors.length > 0 ? (
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

        <MaskedField
          {...chain(
            rateRef,
            form.durationMode === 'direct' ? yearsRef : startDateRef,
          )}
          mask={plainDecimalMask}
          label={t('simpleInterest.rate.label')}
          hint={rateHintText}
          placeholder={t('simpleInterest.rate.placeholder')}
          keyboardType="decimal-pad"
          value={form.rate}
          onChangeValue={value =>
            dispatch({ type: 'edit', field: 'rate', value })
          }
          errors={[...errorsFor('rate'), ...errorsFor('rateMode')]}
          errorPrefix={errorPrefix}
        />

        <View style={styles.modeGroup}>
          <Text style={styles.modeLabel}>
            {t('simpleInterest.duration.mode.label')}
          </Text>
          <SegmentedControl<DurationMode>
            accessibilityLabel={t('simpleInterest.duration.mode.label')}
            options={(['dateRange', 'direct'] as const).map(mode => ({
              value: mode,
              label: t(`simpleInterest.duration.mode.${mode}`),
            }))}
            value={form.durationMode}
            onChange={mode => dispatch({ type: 'setDurationMode', mode })}
          />
        </View>

        {form.durationMode === 'dateRange' ? (
          <>
            <View style={styles.dateGroup}>
              <View style={styles.dateRow} testID="simple-interest-date-row">
                <View
                  style={styles.dateCell}
                  testID="simple-interest-start-date"
                >
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
              <Text style={styles.dateHint}>
                {t('simpleInterest.date.hint')}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.dateGroup} testID="direct-duration">
            <View style={styles.dateRow}>
              {durationFields.map(({ field, label, ref, next }) => (
                <View key={field} style={styles.dateCell}>
                  <MaskedField
                    {...chain(ref, next)}
                    mask={wholeNumberMask}
                    label={label}
                    hint={t('simpleInterest.duration.hint')}
                    hintVisible={false}
                    placeholder={t('simpleInterest.duration.placeholder')}
                    keyboardType="number-pad"
                    value={form[field]}
                    onChangeValue={value =>
                      dispatch({ type: 'edit', field, value })
                    }
                    invalid={durationError !== undefined}
                    containerStyle={styles.dateField}
                  />
                </View>
              ))}
            </View>
            {durationError ? (
              <FieldError
                message={t(`simpleInterest.error.${durationError}`)}
                prefix={errorPrefix}
              />
            ) : null}
            {directDuration.ok ? (
              <Text style={styles.normalized} testID="normalized-duration">
                {`${t('simpleInterest.duration.normalized')}: ${formatDuration(
                  directDuration.duration,
                  t,
                )}`}
              </Text>
            ) : null}
            <Text style={styles.dateHint}>
              {t('simpleInterest.duration.hint')}
            </Text>
          </View>
        )}

        <Button
          variant="primary"
          label={t('simpleInterest.calculate')}
          onPress={() => dispatch({ type: 'calculate' })}
          disabled={!canCalculate}
        />
        {canCalculate ? null : (
          // No engine yet (Compound Interest): say so instead of implying it works.
          <Text style={styles.unavailable}>
            {t('calculator.interest.compound.description')}
          </Text>
        )}

        {form.result ? (
          <SimpleInterestResultCard
            result={form.result}
            type={config.type}
            enteredRate={form.rate}
            rateConfig={form.rateConfig}
            showDates={form.durationMode === 'dateRange'}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 32 },
  summary: { fontSize: 14, marginBottom: 12 },
  modeGroup: { marginBottom: 16 },
  modeLabel: {
    fontSize: 14,
    marginBottom: 6,
    color: theme.colors.textSecondary,
  },
  normalized: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    color: theme.colors.text,
  },
  dateGroup: { marginBottom: 16 },
  dateRow: { flexDirection: 'row' as const, gap: 12 },
  // Equal widths: both cells share the row; minWidth 0 lets a long value shrink.
  dateCell: { flex: 1, minWidth: 0 },
  dateField: { marginBottom: 0 },
  unavailable: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  dateHint: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
});
