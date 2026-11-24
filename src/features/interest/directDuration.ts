import { toAsciiDigits } from '../../utils/maskedInput';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR, type FixedDuration } from '../date';

/**
 * Direct duration input (Issue #62): years, months and days typed as whole
 * numbers, normalized with the app's fixed convention (1 year = 360 days,
 * 1 month = 30 days). Pure; no React, Redux or storage.
 *
 * The normalized duration then enters the existing calculation path as a pair
 * of neutral dates (`directDurationToDates`), so both engines, validation and
 * the duration algorithm are reused as they are.
 */

export const DAYS_PER_YEAR = MONTHS_PER_YEAR * DAYS_PER_MONTH;

/** Neutral dates allow four-digit years, so at most 9999 whole years. */
const MAX_YEARS = 9999;
const MAX_TOTAL_DAYS = MAX_YEARS * DAYS_PER_YEAR + (DAYS_PER_YEAR - 1);

export type DirectDurationErrorCode =
  | 'durationInvalid'
  | 'durationZero'
  | 'durationTooLong';

export interface DirectDurationText {
  readonly years: string;
  readonly months: string;
  readonly days: string;
}

export type DirectDurationResult =
  | {
      readonly ok: true;
      readonly duration: FixedDuration;
      readonly totalDays: number;
    }
  | { readonly ok: false; readonly error: DirectDurationErrorCode };

/** A blank field counts as 0; anything but whole digits is invalid (null). */
function parseWhole(text: string): number | null {
  const trimmed = toAsciiDigits(text);
  if (trimmed === '') {
    return 0;
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Splits a total number of days into years, months and days (360 / 30). */
export function normalizeTotalDays(totalDays: number): FixedDuration {
  const years = Math.floor(totalDays / DAYS_PER_YEAR);
  const remaining = totalDays % DAYS_PER_YEAR;
  return {
    years,
    months: Math.floor(remaining / DAYS_PER_MONTH),
    days: remaining % DAYS_PER_MONTH,
  };
}

/**
 * Validates and normalizes the typed values. Months and days are not limited
 * to 0-11 / 0-29: 15 months and 45 days are valid. Rejected only when a value
 * is not a whole number, when all three total zero, or when the total is more
 * than a neutral date can represent.
 */
export function normalizeDirectDuration(
  input: DirectDurationText,
): DirectDurationResult {
  const years = parseWhole(input.years);
  const months = parseWhole(input.months);
  const days = parseWhole(input.days);
  if (
    years === null ||
    months === null ||
    days === null ||
    ![years, months, days].every(Number.isSafeInteger)
  ) {
    return { ok: false, error: 'durationInvalid' };
  }
  const totalDays = years * DAYS_PER_YEAR + months * DAYS_PER_MONTH + days;
  if (totalDays === 0) {
    return { ok: false, error: 'durationZero' };
  }
  if (totalDays > MAX_TOTAL_DAYS) {
    return { ok: false, error: 'durationTooLong' };
  }
  return { ok: true, duration: normalizeTotalDays(totalDays), totalDays };
}

const pad = (value: number, width: number) =>
  String(value).padStart(width, '0');

/**
 * Two neutral dates whose fixed-scale difference is exactly `duration`:
 * 0000/01/01 and the date that many years, months and days later (a normalized
 * duration always fits: months 0-11, days 0-29).
 */
export function directDurationToDates(duration: FixedDuration): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: '0000/01/01',
    endDate: `${pad(duration.years, 4)}/${pad(1 + duration.months, 2)}/${pad(
      1 + duration.days,
      2,
    )}`,
  };
}
