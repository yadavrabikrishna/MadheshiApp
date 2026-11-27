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
  type TeraiLandUnit,
} from '../../../features/land';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { TeraiLandResultCard } from './TeraiLandResultCard';
import { buildInputLine, buildLandDisplay } from './teraiLandDisplay';

const ERROR_KEY: Record<LandErrorCode, TranslationKey> = {
  empty: 'land.error.empty',
  malformed: 'land.error.malformed',
  negative: 'land.error.negative',
};

/** What was calculated: kept so the card does not change while typing. */
interface Calculated {
  groups: LandConversionGroups;
  value: string;
  unit: TeraiLandUnit;
}

interface TeraiLandViewProps {
  /** The conversion service; the default is the app's real one. */
  service?: LandConversionService;
}

/**
 * Terai land calculator: one screen with the input, the unit, a Calculate
 * button and, only after a successful Calculate, the Hilly / Terai / Other
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

  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<TeraiLandUnit>('bigha');
  const [errors, setErrors] = useState<LandErrorCode[]>([]);
  const [calculated, setCalculated] = useState<Calculated | null>(null);

  // Typing or changing the unit never recalculates; it clears the old result
  // and errors so nothing stale is shown for the new input.
  const change =
    <T,>(setter: (next: T) => void) =>
    (next: T) => {
      setter(next);
      setErrors([]);
      setCalculated(null);
    };

  const calculate = () => {
    Keyboard.dismiss();
    const outcome = service.convertTerai({ value, unit });
    if (outcome.ok) {
      setErrors([]);
      setCalculated({ groups: outcome.value, value, unit });
    } else {
      setCalculated(null);
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

        <Button
          variant="primary"
          label={t('land.terai.calculate')}
          onPress={calculate}
        />

        {calculated && display ? (
          <View accessibilityLiveRegion="polite">
            <TeraiLandResultCard
              groups={display}
              inputLine={buildInputLine(
                calculated.value,
                calculated.unit,
                t,
                formatDigits,
              )}
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
