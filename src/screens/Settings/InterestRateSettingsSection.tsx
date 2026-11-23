import { useState } from 'react';
import { Text, View } from 'react-native';

import { Dropdown, SegmentedControl, TextField } from '../../components';
import {
  selectInterestRateConfig,
  selectInterestRateConfigSaveError,
  updateInterestRateConfigFor,
} from '../../features/interestRateConfig';
import { useTranslation, type TranslationKey } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store';
import { useThemedStyles, type AppTheme } from '../../theme';
import {
  RATE_PERIODS,
  selectedRatePeriod,
  validateCustomDenominatorText,
  type CustomDenominatorTextError,
  type DenominatorMode,
  type InterestCalculatorKind,
  type RateInputMode,
  type RatePeriod,
} from '../../types/interestRateConfig';
import { fillTemplate } from '../../utils';
import { CALCULATOR_NAME_KEYS } from '../Calculator/calculatorLabels';

const TITLE_KEYS: Record<InterestCalculatorKind, TranslationKey> = {
  simple: CALCULATOR_NAME_KEYS.simpleInterest,
  compound: CALCULATOR_NAME_KEYS.compoundInterest,
};

const MODE_KEYS: Record<RateInputMode, TranslationKey> = {
  percentage: 'interestRate.mode.percentage',
  rupees: 'interestRate.mode.rupees',
};

const PERIOD_KEYS: Record<RatePeriod, TranslationKey> = {
  yearly: 'interestRate.period.yearly',
  halfYearly: 'interestRate.period.halfYearly',
  quarterly: 'interestRate.period.quarterly',
  monthly: 'interestRate.period.monthly',
  weekly: 'interestRate.period.weekly',
  daily: 'interestRate.period.daily',
};

const UNIT_KEYS: Record<RatePeriod, TranslationKey> = {
  yearly: 'interestRate.unit.yearly',
  halfYearly: 'interestRate.unit.halfYearly',
  quarterly: 'interestRate.unit.quarterly',
  monthly: 'interestRate.unit.monthly',
  weekly: 'interestRate.unit.weekly',
  daily: 'interestRate.unit.daily',
};

const DENOMINATOR_KEYS: Record<DenominatorMode, TranslationKey> = {
  per100: 'interestRate.denominator.per100',
  per1000: 'interestRate.denominator.per1000',
  custom: 'interestRate.denominator.custom',
};

const ERROR_KEYS: Record<CustomDenominatorTextError, TranslationKey> = {
  empty: 'interestRate.error.empty',
  notNumber: 'interestRate.error.notNumber',
  notPositive: 'interestRate.error.notPositive',
};

const FIXED_AMOUNT = { per100: '100', per1000: '1,000' } as const;

interface Props {
  calculator: InterestCalculatorKind;
}

/**
 * The rate-entry settings of ONE interest calculator. It reads and edits only
 * that calculator's configuration; changes apply at once (and are saved by the
 * configuration layer), they are not part of the Calculator Settings draft.
 */
export function InterestRateSettingsSection({ calculator }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const styles = useThemedStyles(createStyles);
  const config = useAppSelector(selectInterestRateConfig(calculator));
  const saveFailed = useAppSelector(
    selectInterestRateConfigSaveError(calculator),
  );

  // The denominator choice shown, and the custom text typed. They can run ahead
  // of the saved configuration: "Custom" without a valid amount is displayed but
  // never saved as a usable configuration.
  const [choice, setChoice] = useState<DenominatorMode>(config.denominatorMode);
  const [customText, setCustomText] = useState(config.customDenominator ?? '');
  const [touched, setTouched] = useState(false);

  const update = (
    patch: Parameters<typeof updateInterestRateConfigFor>[0]['patch'],
  ) => dispatch(updateInterestRateConfigFor({ calculator, patch }));

  const textError = validateCustomDenominatorText(customText);
  const showError = choice === 'custom' && touched ? textError : null;

  const chooseDenominator = (next: DenominatorMode) => {
    setChoice(next);
    if (next !== 'custom') {
      update({ denominatorMode: next });
    } else if (textError === null) {
      update({ customDenominator: customText, denominatorMode: 'custom' });
    }
  };

  const changeCustom = (text: string) => {
    setCustomText(text);
    setTouched(true);
    if (validateCustomDenominatorText(text) === null) {
      update({ customDenominator: text, denominatorMode: 'custom' });
    }
  };

  const mode = config.rateInputMode;
  const period = selectedRatePeriod(config);
  const unit = t(UNIT_KEYS[period]);

  let helper: string;
  if (mode === 'percentage') {
    helper = fillTemplate(t('interestRate.helper.percentage'), { unit });
  } else if (choice === 'custom') {
    helper =
      textError === null
        ? fillTemplate(t('interestRate.helper.rupees'), {
            amount: customText.trim(),
            unit,
          })
        : t('interestRate.helper.customPending');
  } else {
    helper = fillTemplate(t('interestRate.helper.rupees'), {
      amount: FIXED_AMOUNT[choice],
      unit,
    });
  }

  return (
    <View style={styles.card} testID={`interest-rate-section-${calculator}`}>
      <Text style={styles.title} accessibilityRole="header">
        {t(TITLE_KEYS[calculator])}
      </Text>

      {saveFailed ? (
        <Text style={styles.warning} accessibilityRole="alert">
          {t('settings.saveError')}
        </Text>
      ) : null}

      <View style={styles.group}>
        <Text style={styles.label}>{t('interestRate.mode.label')}</Text>
        <SegmentedControl<RateInputMode>
          accessibilityLabel={`${t(TITLE_KEYS[calculator])}: ${t(
            'interestRate.mode.label',
          )}`}
          options={(['percentage', 'rupees'] as const).map(value => ({
            value,
            label: t(MODE_KEYS[value]),
          }))}
          value={mode}
          onChange={value => update({ rateInputMode: value })}
        />
      </View>

      <Dropdown<RatePeriod>
        label={t(
          mode === 'percentage'
            ? 'interestRate.period.label.percentage'
            : 'interestRate.period.label.rupees',
        )}
        closeLabel={t('interestRate.dropdown.close')}
        options={RATE_PERIODS.map(value => ({
          value,
          label: t(PERIOD_KEYS[value]),
        }))}
        value={period}
        onChange={value => update({ period: value })}
      />

      {mode === 'rupees' ? (
        <View style={styles.group}>
          <Text style={styles.label}>
            {t('interestRate.denominator.label')}
          </Text>
          <SegmentedControl<DenominatorMode>
            accessibilityLabel={`${t(TITLE_KEYS[calculator])}: ${t(
              'interestRate.denominator.label',
            )}`}
            options={(['per100', 'per1000', 'custom'] as const).map(value => ({
              value,
              label: t(DENOMINATOR_KEYS[value]),
            }))}
            value={choice}
            onChange={chooseDenominator}
          />
          {choice === 'custom' ? (
            <TextField
              label={t('interestRate.custom.label')}
              value={customText}
              onChangeText={changeCustom}
              onBlur={() => setTouched(true)}
              keyboardType="decimal-pad"
              placeholder={t('interestRate.custom.placeholder')}
              hint={t('interestRate.custom.hint')}
              errors={showError ? [t(ERROR_KEYS[showError])] : undefined}
              errorPrefix={t('simpleInterest.error.prefix')}
              containerStyle={styles.customField}
            />
          ) : null}
        </View>
      ) : null}

      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  card: {
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  group: { gap: 6 },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  customField: { marginTop: 8, marginBottom: 0 },
  helper: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary },
  warning: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 10,
    padding: 10,
  },
});
