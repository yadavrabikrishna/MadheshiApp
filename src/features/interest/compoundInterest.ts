import { CalcDecimal, type CalcDecimalValue } from './decimal';
import { validateInterestInput, type InterestInput } from './interestInput';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../date';
import type {
  SimpleInterestErrorCode,
  SimpleInterestResult,
} from './simpleInterest';

/**
 * Compound Interest calculation engine (pure, deterministic; no React, Redux,
 * storage or presentation formatting). It shares input validation with the
 * Simple Interest engine through `validateInterestInput` and never calls it.
 *
 * Rules (Issue #58):
 * - The selected rate period is the compounding period, in fixed days:
 *   yearly 360, half-yearly 180, quarterly 90, monthly 30, weekly 7, daily 1.
 *   Without `compounding` the period is yearly with rate = monthly rate x 12.
 * - Every completed period multiplies the balance by (1 + period rate / 100):
 *   the interest is capitalised.
 * - The incomplete period after the last completed one earns simple interest
 *   on the current balance, for remainingDays / periodDays of the period rate,
 *   and is not capitalised. An exact boundary leaves no partial period.
 * - Elapsed time is the fixed-duration convention (years x 360 + months x 30
 *   + days). Nothing is rounded here; rounding is the display's job.
 */

export interface CompoundInterestResult extends SimpleInterestResult {
  /** Number of completed selected periods (each one capitalised). */
  readonly completedPeriods: number;
  /** Length of the compounding period in fixed days. */
  readonly periodDays: number;
  /** Time left after the completed periods, in whole months and days. */
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
  const YEAR_DAYS = MONTHS_PER_YEAR * DAYS_PER_MONTH;

  const periodDays = input.compounding?.periodDays ?? YEAR_DAYS;
  const periodRatePercent = input.compounding
    ? new CalcDecimal(input.compounding.periodRatePercent)
    : rate.monthlyRatePercent.mul(MONTHS_PER_YEAR);
  const periodRate = periodRatePercent.div(100);

  const elapsedDays =
    (duration.years * MONTHS_PER_YEAR + duration.months) * DAYS_PER_MONTH +
    duration.days;
  const completedPeriods = Math.floor(elapsedDays / periodDays);
  const remainingDays = elapsedDays - completedPeriods * periodDays;
  const remaining = {
    months: Math.floor(remainingDays / DAYS_PER_MONTH),
    days: remainingDays % DAYS_PER_MONTH,
  };

  const periodFactor = new CalcDecimal(1).plus(periodRate);
  const balance = principal.mul(periodFactor.pow(completedPeriods));

  // Remainder: simple interest on the current balance, multiplying before the
  // single division.
  const remainderInterest = balance
    .mul(periodRate)
    .mul(new CalcDecimal(remainingDays))
    .div(new CalcDecimal(periodDays));

  // Interest = capitalised interest + remainder; total = principal + interest
  // (with no completed period this is exactly the Simple Interest arithmetic).
  const interest = balance.minus(principal).plus(remainderInterest);
  const total = principal.plus(interest);
  const timeInMonths = new CalcDecimal(elapsedDays).div(
    new CalcDecimal(DAYS_PER_MONTH),
  );

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
      periodDays,
      remaining,
      capitalizedBalance: balance,
    },
  };
}
