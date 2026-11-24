import { CalcDecimal, type CalcDecimalValue } from './decimal';
import {
  validateInterestInput,
  type InterestErrorCode,
  type InterestInput,
} from './interestInput';
import {
  DAYS_PER_MONTH,
  MONTHS_PER_YEAR,
  type FixedDuration,
  type NeutralDate,
} from '../date';
import type { NormalizedRate } from './rate';

/**
 * Simple Interest calculation engine (pure, deterministic; no React, Redux,
 * storage or presentation formatting).
 *
 * Interest = principal × monthly rate × time in months, always on the original
 * principal for the whole period. Unpaid interest is never capitalised.
 */

/** Raw, unvalidated input as the UI holds it (shared with Compound Interest). */
export type SimpleInterestInput = InterestInput;

/** One reason the input was rejected. Map each code to a localized message. */
export type SimpleInterestErrorCode = InterestErrorCode;

/**
 * Exact (unrounded) calculation output. Every Decimal keeps full precision;
 * grouping, half-up rounding to two places and trailing-zero trimming are the
 * UI's money-formatting responsibility. `toString()` gives a canonical plain
 * decimal string.
 */
export interface SimpleInterestResult {
  readonly principal: CalcDecimalValue;
  readonly monthlyRatePercent: NormalizedRate['monthlyRatePercent'];
  /** Monthly rate as a fraction, e.g. `0.02`. */
  readonly monthlyRate: NormalizedRate['monthlyRate'];
  readonly startDate: NeutralDate;
  readonly endDate: NeutralDate;
  readonly duration: FixedDuration;
  /** `years × 12 + months + days / 30`. */
  readonly timeInMonths: CalcDecimalValue;
  readonly interest: CalcDecimalValue;
  /** Unrounded principal + unrounded interest. */
  readonly total: CalcDecimalValue;
}

/**
 * Either the exact result, or every problem found (in field order: principal,
 * rate, start date, end date, then the date range). Invalid input never
 * throws.
 */
export type SimpleInterestOutcome =
  | { readonly ok: true; readonly value: SimpleInterestResult }
  | { readonly ok: false; readonly errors: readonly SimpleInterestErrorCode[] };

/**
 * Validates the input and calculates simple interest.
 *
 * Rules: principal > 0; rate ≥ 0 (both rate modes normalise to value / 100);
 * dates are neutral `YYYY/MM/DD` (year 4 digits, month 01-12, day 01-32);
 * identical dates give zero duration and zero interest.
 *
 * Date-range rules (owner approved):
 * 1. Reversed ranges are rejected with `endBeforeStart`, before any interest
 *    is calculated, when the end is earlier than the start component-wise
 *    (year, then month, then day) OR produces a negative elapsed time on the
 *    fixed 30-day / 12-month scale. Example: `2025/01/01` to `2024/12/31` is
 *    invalid.
 * 2. When the standard fixed borrowing leaves negative remaining days, the
 *    duration is normalised into non-negative years, months and days with the
 *    same total fixed-scale elapsed time. Example: `2025/01/32` to
 *    `2025/03/01` is a 29-day duration. Normalisation only changes how the
 *    duration is split; `timeInMonths`, `interest` and `total` are identical
 *    to what the un-normalised elapsed time would give, with no rounding.
 */
export function calculateSimpleInterest(
  input: SimpleInterestInput,
): SimpleInterestOutcome {
  const validated = validateInterestInput(input);
  if (!validated.ok) {
    return validated;
  }
  const { principal, rate, startDate, endDate, duration } = validated.value;

  // Elapsed time in 1/30-month units, so the only division happens once.
  const units = new CalcDecimal(
    (duration.years * MONTHS_PER_YEAR + duration.months) * DAYS_PER_MONTH +
      duration.days,
  );
  const perMonth = new CalcDecimal(DAYS_PER_MONTH);
  const timeInMonths = units.div(perMonth);
  // principal × monthlyRate × (units / 30), multiplying before the single
  // division so no intermediate value is rounded earlier than necessary.
  const interest = principal.mul(rate.monthlyRate).mul(units).div(perMonth);

  return {
    ok: true,
    value: {
      principal,
      monthlyRatePercent: rate.monthlyRatePercent,
      monthlyRate: rate.monthlyRate,
      startDate,
      endDate,
      duration,
      timeInMonths,
      interest,
      total: principal.plus(interest),
    },
  };
}
