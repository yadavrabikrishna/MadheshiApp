import {
  CalcDecimal,
  parseDecimalInput,
  type CalcDecimalValue,
} from './decimal';

/**
 * How the user enters the monthly rate:
 * - `percentPerMonth`: X% per month.
 * - `rupeesPer100PerMonth`: Rs. X per Rs. 100 per month.
 *
 * Both mean the same thing and normalise to the same monthly rate (X / 100).
 */
export const RATE_ENTRY_MODES = [
  'percentPerMonth',
  'rupeesPer100PerMonth',
] as const;

export type RateEntryMode = (typeof RATE_ENTRY_MODES)[number];

export interface NormalizedRate {
  /** Monthly rate as a percentage, e.g. `2` for 2% (Rs. 2 per Rs. 100). */
  readonly monthlyRatePercent: CalcDecimalValue;
  /** Monthly rate as a fraction, e.g. `0.02`. */
  readonly monthlyRate: CalcDecimalValue;
}

export type RateErrorCode = 'rateInvalid' | 'rateNegative' | 'rateModeInvalid';

export type RateResult =
  | { readonly ok: true; readonly value: NormalizedRate }
  | { readonly ok: false; readonly error: RateErrorCode };

/**
 * Normalises an entered rate to the monthly rate.
 *
 * `value` is a plain decimal string (see `parseDecimalInput`). Zero is valid.
 * A negative value returns `rateNegative`; malformed text returns
 * `rateInvalid`; an unknown mode returns `rateModeInvalid`. Never throws.
 * Division by 100 is exact for decimal values.
 */
export function normalizeMonthlyRate(
  value: string,
  mode: RateEntryMode,
): RateResult {
  if (!RATE_ENTRY_MODES.includes(mode)) {
    return { ok: false, error: 'rateModeInvalid' };
  }
  const parsed = parseDecimalInput(value);
  if (parsed.kind === 'negative') {
    return { ok: false, error: 'rateNegative' };
  }
  if (parsed.kind === 'invalid') {
    return { ok: false, error: 'rateInvalid' };
  }
  // Both modes enter X where X% per month == Rs. X per Rs. 100 per month.
  return {
    ok: true,
    value: {
      monthlyRatePercent: parsed.value,
      monthlyRate: parsed.value.div(new CalcDecimal(100)),
    },
  };
}
