import type { TranslationKey } from '../../../i18n';
import {
  resolveDenominator,
  selectedRatePeriod,
  type InterestRateConfig,
  type RatePeriod,
} from '../../../types/interestRateConfig';
import { groupDecimalString } from '../../../utils';

const PERCENTAGE_HINT_KEYS: Record<RatePeriod, TranslationKey> = {
  yearly: 'interestRate.field.hint.percentage.yearly',
  halfYearly: 'interestRate.field.hint.percentage.halfYearly',
  quarterly: 'interestRate.field.hint.percentage.quarterly',
  monthly: 'interestRate.field.hint.percentage.monthly',
  weekly: 'interestRate.field.hint.percentage.weekly',
  daily: 'interestRate.field.hint.percentage.daily',
};

const UNIT_KEYS: Record<RatePeriod, TranslationKey> = {
  yearly: 'interestRate.unit.yearly',
  halfYearly: 'interestRate.unit.halfYearly',
  quarterly: 'interestRate.unit.quarterly',
  monthly: 'interestRate.unit.monthly',
  weekly: 'interestRate.unit.weekly',
  daily: 'interestRate.unit.daily',
};

/** A localizable hint: a text key and the `{name}` values to fill into it. */
export interface InterestRateHint {
  key: TranslationKey;
  /** Values for `{unit}` (a translation key) and `{amount}` (already grouped). */
  unitKey?: TranslationKey;
  amount?: string;
}

/**
 * Explains how the entered Interest Rate is read, from the active calculator's
 * saved configuration (pure; no React). Percentage: "Enter annual interest
 * rate (%)." Rupees: "Enter rupees per Rs. 1,000 per month."
 */
export function getInterestRateHint(
  config: InterestRateConfig,
): InterestRateHint {
  const period = selectedRatePeriod(config);
  if (config.rateInputMode === 'percentage') {
    return { key: PERCENTAGE_HINT_KEYS[period] };
  }
  // A valid configuration always has a denominator; 100 is a safe fallback.
  const denominator = resolveDenominator(config) ?? '100';
  return {
    key: 'interestRate.field.hint.rupees',
    unitKey: UNIT_KEYS[period],
    amount: groupDecimalString(denominator),
  };
}
