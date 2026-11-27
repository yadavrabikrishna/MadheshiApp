import { useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputInstance,
} from 'react-native';

import {
  Button,
  FieldError,
  SegmentedControl,
  TextField,
  useKeyboardAwareForm,
} from '../../../components';
import {
  landConversionService,
  type LandConversionGroups,
  type LandConverter,
  type LandErrorCode,
  type LandMixedInput,
  type LandUnit,
} from '../../../features/land';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import {
  buildInputLine,
  buildLandDisplay,
  buildMixedInputLine,
} from './landDisplay';
import { unitLabelKey, type LandFamilyConfig } from './landFamilyConfig';
import { LandResultCard } from './LandResultCard';

const ERROR_KEY: Record<LandErrorCode, TranslationKey> = {
  empty: 'land.error.empty',
  malformed: 'land.error.malformed',
  negative: 'land.error.negative',
};

type InputMode = 'single' | 'mixed';
const INPUT_MODES: readonly InputMode[] = ['single', 'mixed'];

/** What was typed per unit; a unit missing from the map is blank. */
type MixedValues = Partial<Record<LandUnit, string>>;

/** What was calculated: kept so the card does not change while typing. */
interface Calculated {
  groups: LandConversionGroups;
  /** What was entered; the card's input line is built at render so it follows the language. */
  input:
    | { kind: 'single'; value: string; unit: LandUnit }
    | { kind: 'mixed'; fields: MixedValues };
}

type MixedErrors = Partial<Record<LandUnit, LandErrorCode>>;

interface LandCalculatorProps {
  /** The unit family: units, texts, result title and file name. */
  config: LandFamilyConfig;
  /** The conversion service; the default is the app's real one. */
  service?: LandConverter;
}

/**
 * The land calculator for one unit family (see `LandFamilyConfig`): an input
 * mode (Single Unit or Mixed Units), its inputs, a Calculate button and, only
 * after a successful Calculate, the Terai / Hilly / Other result groups. All
 * validation and conversion belong to the land conversion service; this view
 * only collects input and shows what the service returns. It holds no
 * family-specific unit names or texts: those come from the configuration.
 */
export function LandCalculator({
  config,
  service = landConversionService,
}: LandCalculatorProps) {
  const { t, formatDigits } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const keyboardForm = useKeyboardAwareForm();
  const { units } = config;
  const inputRef = useRef<TextInputInstance>(null);
  // One ref per Mixed Units field, in field order (any number of units).
  const mixedRefs = useRef<(TextInputInstance | null)[]>([]);

  const [mode, setMode] = useState<InputMode>('single');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<LandUnit>(config.defaultUnit);
  const [mixed, setMixed] = useState<MixedValues>({});
  const [errors, setErrors] = useState<LandErrorCode[]>([]);
  const [mixedErrors, setMixedErrors] = useState<MixedErrors>({});
  const [mixedEmpty, setMixedEmpty] = useState(false);
  const [calculated, setCalculated] = useState<Calculated | null>(null);

  // Typing or changing the unit never recalculates; it clears the old result
  // and errors so nothing stale is shown for the new input.
  const change =
    <T,>(setter: (next: T) => void) =>
    (next: T) => {
      setter(next);
      clearOutcome();
    };

  const clearOutcome = () => {
    setErrors([]);
    setMixedErrors({});
    setMixedEmpty(false);
    setCalculated(null);
  };

  const changeMixed = (field: LandUnit) => (next: string) => {
    setMixed(previous => ({ ...previous, [field]: next }));
    clearOutcome();
  };

  const calculate = () => {
    Keyboard.dismiss();
    clearOutcome();
    if (mode === 'mixed') {
      // The fields are the family's own units, in its order; a unit never typed
      // in is blank.
      const outcome = service.convertMixed(
        config.family,
        Object.fromEntries(
          units.map(field => [field, mixed[field] ?? '']),
        ) as LandMixedInput<typeof config.family>,
      );
      if (outcome.ok) {
        setCalculated({
          groups: outcome.value,
          input: { kind: 'mixed', fields: { ...mixed } },
        });
      } else {
        setMixedErrors(outcome.fieldErrors);
        setMixedEmpty(outcome.formError === 'empty');
      }
      return;
    }
    const outcome = service.convert({ value, unit });
    if (outcome.ok) {
      setCalculated({
        groups: outcome.value,
        input: { kind: 'single', value, unit },
      });
    } else {
      setErrors(outcome.errors);
    }
  };

  const display = calculated
    ? buildLandDisplay(calculated.groups, service, t, formatDigits)
    : null;

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
        testID={config.rootTestId}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.unitLabel}>{t('land.mode.label')}</Text>
        <SegmentedControl
          options={INPUT_MODES.map(id => ({
            value: id,
            label: t(`land.mode.${id}` as TranslationKey),
          }))}
          value={mode}
          onChange={change(setMode)}
          accessibilityLabel={t('land.mode.label')}
        />

        {mode === 'single' ? (
          <>
            <Text style={styles.unitLabel}>
              {t(config.unitSelectorLabelKey)}
            </Text>
            <SegmentedControl
              options={units.map(id => ({
                value: id,
                label: t(unitLabelKey(id)),
              }))}
              value={unit}
              onChange={change(setUnit)}
              accessibilityLabel={t(config.unitSelectorLabelKey)}
            />

            <TextField
              ref={inputRef}
              label={t(config.inputLabelKey)}
              value={value}
              onChangeText={change(setValue)}
              keyboardType="decimal-pad"
              placeholder={t(config.inputPlaceholderKey)}
              hint={t(config.inputHintKey)}
              errors={errors.map(code => t(ERROR_KEY[code]))}
              errorPrefix={t('simpleInterest.error.prefix')}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onFocus={() => keyboardForm.onFieldFocus(inputRef.current)}
              onBlur={() => keyboardForm.onFieldBlur(inputRef.current)}
            />
          </>
        ) : (
          <View style={styles.mixedGroup} testID="land-mixed-inputs">
            <Text style={styles.hint}>{t(config.mixedHintKey)}</Text>
            {/* One row, three equal columns; the messages share the space
                under the row so a narrow column never has to wrap them. */}
            <View style={styles.mixedRow} testID="land-mixed-row">
              {units.map((field, index) => {
                const next = units[index + 1];
                return (
                  <TextField
                    key={field}
                    ref={node => {
                      mixedRefs.current[index] = node;
                    }}
                    label={t(unitLabelKey(field))}
                    value={mixed[field] ?? ''}
                    onChangeText={changeMixed(field)}
                    keyboardType="decimal-pad"
                    placeholder={t('land.mixed.placeholder')}
                    invalid={mixedEmpty || mixedErrors[field] !== undefined}
                    containerStyle={styles.mixedField}
                    // Next moves to the following field and keeps the
                    // keyboard open; the last field's Done closes it.
                    returnKeyType={next ? 'next' : 'done'}
                    submitBehavior={next ? 'submit' : 'blurAndSubmit'}
                    onSubmitEditing={
                      next
                        ? () => mixedRefs.current[index + 1]?.focus()
                        : () => Keyboard.dismiss()
                    }
                    onFocus={() =>
                      keyboardForm.onFieldFocus(mixedRefs.current[index])
                    }
                    onBlur={() =>
                      keyboardForm.onFieldBlur(mixedRefs.current[index])
                    }
                  />
                );
              })}
            </View>
            {mixedEmpty ? (
              <FieldError
                message={t('land.error.mixedEmpty')}
                prefix={t('simpleInterest.error.prefix')}
              />
            ) : null}
            {units.map(field => {
              const code = mixedErrors[field];
              return code ? (
                <FieldError
                  key={field}
                  message={`${t(unitLabelKey(field))}: ${t(ERROR_KEY[code])}`}
                  prefix={t('simpleInterest.error.prefix')}
                />
              ) : null;
            })}
          </View>
        )}

        <Button
          variant="primary"
          label={t(config.calculateKey)}
          onPress={calculate}
        />

        {calculated && display ? (
          <View accessibilityLiveRegion="polite">
            <LandResultCard
              title={t(config.resultTitleKey)}
              fileNamePrefix={config.fileNamePrefix}
              groups={display}
              inputLine={
                calculated.input.kind === 'mixed'
                  ? buildMixedInputLine(
                      units,
                      calculated.input.fields,
                      t,
                      formatDigits,
                    )
                  : buildInputLine(
                      calculated.input.value,
                      calculated.input.unit,
                      t,
                      formatDigits,
                    )
              }
            />
          </View>
        ) : null}

        {config.quickReference ? (
          <View style={styles.quickRef} testID="land-quick-reference">
            <Text style={styles.quickRefTitle}>
              {t(config.quickReference.titleKey)}
            </Text>
            <Text style={styles.quickRefBody}>
              {t(config.quickReference.bodyKey)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { padding: 16, gap: 12 },
    mixedGroup: { gap: 12 },
    // Equal columns: flex 1 gives each the same basis; minWidth 0 lets the
    // input shrink instead of overflowing a narrow screen.
    mixedRow: { flexDirection: 'row', gap: 8 },
    mixedField: { flex: 1, minWidth: 0, marginBottom: 0 },
    hint: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    unitLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    quickRef: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    quickRefTitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    quickRefBody: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 2,
    },
  });
