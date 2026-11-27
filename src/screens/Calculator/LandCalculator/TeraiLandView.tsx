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
  SegmentedControl,
  TextField,
  useKeyboardAwareForm,
} from '../../../components';
import {
  landConversionService,
  TERAI_LAND_UNITS,
  type LandConversionGroups,
  type LandConversionService,
  type LandErrorCode,
  type TeraiLandMixedInput,
  type TeraiLandUnit,
} from '../../../features/land';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { TeraiLandResultCard } from './TeraiLandResultCard';
import {
  buildInputLine,
  buildLandDisplay,
  buildMixedInputLine,
} from './teraiLandDisplay';

const ERROR_KEY: Record<LandErrorCode, TranslationKey> = {
  empty: 'land.error.empty',
  malformed: 'land.error.malformed',
  negative: 'land.error.negative',
};

type InputMode = 'single' | 'mixed';
const INPUT_MODES: readonly InputMode[] = ['single', 'mixed'];

const EMPTY_MIXED: TeraiLandMixedInput = { bigha: '', kattha: '', dhur: '' };

/** What was calculated: kept so the card does not change while typing. */
interface Calculated {
  groups: LandConversionGroups;
  /** What was entered; the card's input line is built at render so it follows the language. */
  input:
    | { kind: 'single'; value: string; unit: TeraiLandUnit }
    | { kind: 'mixed'; fields: TeraiLandMixedInput };
}

type MixedErrors = Partial<Record<TeraiLandUnit, LandErrorCode>>;

interface TeraiLandViewProps {
  /** The conversion service; the default is the app's real one. */
  service?: LandConversionService;
}

/**
 * Terai land calculator: one screen with an input mode (Single Unit or Mixed
 * Units), its inputs, a Calculate button and, only after a successful Calculate, the Hilly / Terai / Other
 * result groups. All validation and conversion belong to the land conversion
 * service; this view only collects input and shows what the service returns.
 */
export function TeraiLandView({
  service = landConversionService,
}: TeraiLandViewProps = {}) {
  const { t, formatDigits } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const keyboardForm = useKeyboardAwareForm();
  const inputRef = useRef<TextInputInstance>(null);
  const bighaRef = useRef<TextInputInstance>(null);
  const katthaRef = useRef<TextInputInstance>(null);
  const dhurRef = useRef<TextInputInstance>(null);
  const mixedRefs = { bigha: bighaRef, kattha: katthaRef, dhur: dhurRef };

  const [mode, setMode] = useState<InputMode>('single');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<TeraiLandUnit>('bigha');
  const [mixed, setMixed] = useState<TeraiLandMixedInput>(EMPTY_MIXED);
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

  const changeMixed = (field: TeraiLandUnit) => (next: string) => {
    setMixed(previous => ({ ...previous, [field]: next }));
    clearOutcome();
  };

  const calculate = () => {
    Keyboard.dismiss();
    clearOutcome();
    if (mode === 'mixed') {
      const outcome = service.convertTeraiMixed(mixed);
      if (outcome.ok) {
        setCalculated({
          groups: outcome.value,
          input: { kind: 'mixed', fields: mixed },
        });
      } else {
        setMixedErrors(outcome.fieldErrors);
        setMixedEmpty(outcome.formError === 'empty');
      }
      return;
    }
    const outcome = service.convertTerai({ value, unit });
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
        testID="land-terai-view"
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
            <Text style={styles.unitLabel}>{t('land.terai.unit.label')}</Text>
            <SegmentedControl
              options={TERAI_LAND_UNITS.map(id => ({
                value: id,
                label: t(`land.unit.${id}` as TranslationKey),
              }))}
              value={unit}
              onChange={change(setUnit)}
              accessibilityLabel={t('land.terai.unit.label')}
            />

            <TextField
              ref={inputRef}
              label={t('land.terai.input.label')}
              value={value}
              onChangeText={change(setValue)}
              keyboardType="decimal-pad"
              placeholder={t('land.terai.input.placeholder')}
              hint={t('land.terai.input.hint')}
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
            <Text style={styles.hint}>{t('land.mixed.hint')}</Text>
            {TERAI_LAND_UNITS.map((field, index) => {
              const fieldErrors: string[] = [];
              if (mixedErrors[field]) {
                fieldErrors.push(t(ERROR_KEY[mixedErrors[field]]));
              }
              // "At least one value" is a form error: shown on the first field.
              if (index === 0 && mixedEmpty) {
                fieldErrors.push(t('land.error.mixedEmpty'));
              }
              const ref = mixedRefs[field];
              return (
                <TextField
                  key={field}
                  ref={ref}
                  label={t(`land.unit.${field}` as TranslationKey)}
                  value={mixed[field]}
                  onChangeText={changeMixed(field)}
                  keyboardType="decimal-pad"
                  placeholder={t('land.mixed.placeholder')}
                  errors={fieldErrors}
                  errorPrefix={t('simpleInterest.error.prefix')}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onFocus={() => keyboardForm.onFieldFocus(ref.current)}
                  onBlur={() => keyboardForm.onFieldBlur(ref.current)}
                />
              );
            })}
          </View>
        )}

        <Button
          variant="primary"
          label={t('land.terai.calculate')}
          onPress={calculate}
        />

        {calculated && display ? (
          <View accessibilityLiveRegion="polite">
            <TeraiLandResultCard
              groups={display}
              inputLine={
                calculated.input.kind === 'mixed'
                  ? buildMixedInputLine(
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

        <View style={styles.quickRef} testID="land-quick-reference">
          <Text style={styles.quickRefTitle}>{t('land.quickRef.title')}</Text>
          <Text style={styles.quickRefBody}>{t('land.quickRef.body')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { padding: 16, gap: 12 },
    mixedGroup: { gap: 12 },
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
