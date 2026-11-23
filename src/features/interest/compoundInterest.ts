import { CalcDecimal, type CalcDecimalValue } from './decimal';
import { validateInterestInput, type InterestInput } from './interestInput';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './neutralDate';
import type {
  SimpleInterestErrorCode,
  SimpleInterestResult,
} from './simpleInterest';

/**
 * Compound Interest calculation engine (pure, deterministic; no React, Redux,
 * storage or presentation formatting). It shares input validation with the
 * Simple Interest engine through `validateInterestInput` and never calls it.
 *
 * Rules (V1 spec 2.3-2.7):
 * - Each completed 12-month period is one compounding period.
 * - Annual rate = monthly rate × 12. At the end of every completed period the
 *   balance is multiplied by (1 + annual rate): the interest is capitalised.
 * - The incomplete period after the last completed one earns simple interest
 *   on the current balance, for its remaining months and days, and is not
 *   capitalised.
 * - No other compounding frequency exists.
 * - Nothing is rounded here. Rounding is the display's job, on final amounts.
 */

export interface CompoundInterestResult extends SimpleInterestResult {
  /** Number of completed 12-month periods (each one capitalised). */
  readonly completedPeriods: number;
  /** Duration left after the completed periods (months 0-11, plus days). */
  readonly remaining: { readonly months: number; readonly days: number };
  /** Balance after capitalising every completed period, before the remainder. */
  readonly capitalizedBalance: CalcDecimalValue;
}

export type CompoundInterestOutcome =
  | { readonly ok: true; readonly value: CompoundInterestResult }
  | { readonly ok: false; readonly errors: readonly SimpleInterestErrorCode[] };

export function calculateCompoundInterest(
  input: InterestInput,
): CompoundInterestOutcome {
  const validated = validateInterestInput(input);
  if (!validated.ok) {
    return validated;
  }
  const { principal, rate, startDate, endDate, duration } = validated.value;

  const completedPeriods = duration.years;
  const remaining = { months: duration.months, days: duration.days };

  const annualFactor = new CalcDecimal(1).plus(
    rate.monthlyRate.mul(MONTHS_PER_YEAR),
  );
  let balance = principal;
  for (let period = 0; period < completedPeriods; period += 1) {
    balance = balance.mul(annualFactor);
  }

  // Remainder: simple interest on the current balance, in 1/30-month units,
  // multiplying before the single division.
  const remainingUnits = new CalcDecimal(
    remaining.months * DAYS_PER_MONTH + remaining.days,
  );
  const perMonth = new CalcDecimal(DAYS_PER_MONTH);
  const remainderInterest = balance
    .mul(rate.monthlyRate)
    .mul(remainingUnits)
    .div(perMonth);

  // Interest = capitalised interest + remainder; total = principal + interest
  // (with no completed period this is exactly the Simple Interest arithmetic).
  const interest = balance.minus(principal).plus(remainderInterest);
  const total = principal.plus(interest);
  const timeInMonths = new CalcDecimal(
    (duration.years * MONTHS_PER_YEAR + duration.months) * DAYS_PER_MONTH +
      duration.days,
  ).div(perMonth);

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
      total,
      completedPeriods,
      remaining,
      capitalizedBalance: balance,
    },
  };
}
