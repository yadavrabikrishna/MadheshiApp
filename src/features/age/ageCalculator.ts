import {
  calculateFixedDuration,
  parseNeutralDate,
  type FixedDuration,
  type NeutralDate,
} from '../date';

/**
 * Age calculation (CAL-005): the elapsed years, months and days between two
 * dates (pure; no React, Redux, storage or localization).
 *
 * The same simplified arithmetic serves AD and BS: the dates are neutral
 * `YYYY/MM/DD` numbers and nothing is looked up. There is no calendar
 * conversion, no real month length (BS or Gregorian) and no leap-year rule.
 * Because BS months really differ in length, a BS result is approximate.
 *
 * Approved fixed borrowing algorithm (shared with Interest, in `../date`):
 * 1. days = end day - start day.
 * 2. If days is negative, add exactly 30 days and subtract 1 from the months.
 * 3. months = end month - start month (including that borrow).
 * 4. If months is negative, add exactly 12 months and subtract 1 from the years.
 * 5. years = end year - start year (including that borrow).
 */

/** Raw date text as the UI holds it. */
export interface AgeInput {
  /** `YYYY/MM/DD`: four-digit year, month 01-12, day 01-32. */
  readonly startDate: string;
  /** `YYYY/MM/DD`, same date system as the start; not earlier than the start. */
  readonly endDate: string;
}

/** Why the input was rejected. Map each code to a message in the UI layer. */
export type AgeErrorCode =
  | 'startDateInvalid'
  | 'endDateInvalid'
  | 'endBeforeStart';

export interface AgeResult {
  readonly startDate: NeutralDate;
  readonly endDate: NeutralDate;
  readonly years: number;
  readonly months: number;
  readonly days: number;
}

export type AgeOutcome =
  | { readonly ok: true; readonly value: AgeResult }
  | { readonly ok: false; readonly errors: readonly AgeErrorCode[] };

/**
 * Validates both dates and calculates the elapsed years, months and days.
 * Every problem found is reported, in field order (start, end, range). Invalid
 * input never throws.
 */
export function calculateAge(input: AgeInput): AgeOutcome {
  const errors: AgeErrorCode[] = [];

  const startDate = parseNeutralDate(input?.startDate);
  if (!startDate) {
    errors.push('startDateInvalid');
  }
  const endDate = parseNeutralDate(input?.endDate);
  if (!endDate) {
    errors.push('endDateInvalid');
  }
  if (!startDate || !endDate) {
    return { ok: false, errors };
  }

  const elapsed: FixedDuration | null = calculateFixedDuration(
    startDate,
    endDate,
  );
  if (!elapsed) {
    return { ok: false, errors: ['endBeforeStart'] };
  }

  return {
    ok: true,
    value: {
      startDate,
      endDate,
      years: elapsed.years,
      months: elapsed.months,
      days: elapsed.days,
    },
  };
}
