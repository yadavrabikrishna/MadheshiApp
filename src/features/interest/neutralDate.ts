/**
 * Neutral arithmetic dates for the interest calculators.
 *
 * These are NOT Gregorian/AD or BS calendar dates. Only the shape is checked
 * (four-digit year, month 01-12, day 01-32); there is no month-length lookup,
 * leap-year rule or calendar conversion. Pure functions: no React, Redux or
 * storage.
 */

/** A validated neutral date. `month` is 1-12 and `day` is 1-32. */
export interface NeutralDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** Elapsed time under the fixed 30-day / 12-month convention. */
export interface FixedDuration {
  readonly years: number;
  readonly months: number;
  readonly days: number;
}

/** Days in every month and months in every year, by convention. */
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;

const NEUTRAL_DATE_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})$/;

/**
 * Parses and validates `YYYY/MM/DD` text (the separators included).
 *
 * Returns `null` when the text is not exactly that shape, the month is not
 * 01-12, or the day is not 01-32. Any four-digit year (including `0000`) is
 * accepted. Day 32 is valid for every month. Non-string input returns `null`.
 */
export function parseNeutralDate(text: unknown): NeutralDate | null {
  if (typeof text !== 'string') {
    return null;
  }
  const match = NEUTRAL_DATE_PATTERN.exec(text);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > MONTHS_PER_YEAR || day < 1 || day > 32) {
    return null;
  }
  return { year, month, day };
}

/**
 * Position of a date on the fixed 30-day / 12-month scale
 * (`year × 360 + month × 30 + day`). It is the same arithmetic the duration
 * uses, so the difference of two positions is the elapsed time in days. It
 * matches ordinary year/month/day ordering for days 1-30 and differs only for
 * days 31-32, which this convention treats as days of the following month (for
 * example `01/32` is the same position as `02/02`).
 */
export function fixedDayCount(date: NeutralDate): number {
  return (
    date.year * MONTHS_PER_YEAR * DAYS_PER_MONTH +
    date.month * DAYS_PER_MONTH +
    date.day
  );
}

/**
 * True when `end` is earlier than `start`, either as written (year, then
 * month, then day) or on the fixed 30-day / 12-month scale. Both readings are
 * checked so a reversed range is never accepted. For days 1-30 the two
 * readings always agree; they can differ only for days 31-32 (for example
 * `2025/01/01` to `2024/12/31` is a reversed range as written even though both
 * sit at the same fixed position).
 */
export function isEndBeforeStart(
  start: NeutralDate,
  end: NeutralDate,
): boolean {
  if (end.year !== start.year) {
    return end.year < start.year;
  }
  if (end.month !== start.month) {
    return end.month < start.month;
  }
  if (end.day !== start.day) {
    return end.day < start.day;
  }
  return false;
}

/**
 * Elapsed years, months and days from `start` (baseline) to `end`, using the
 * approved fixed borrowing algorithm shared with the Age Calculator:
 *
 * 1. days = end day - start day.
 * 2. If days is negative, add 30 days and subtract 1 from the month result.
 * 3. months = end month - start month (including that adjustment).
 * 4. If months is negative, add 12 months and subtract 1 from the year result.
 * 5. years = end year - start year (including that adjustment).
 *
 * Returns `null` when `end` is earlier than `start` (see
 * {@link isEndBeforeStart}). Identical dates return zero years, months and
 * days.
 *
 * Day values of 31 and 32 are allowed, so a result may have `days` of 30 or
 * 31 (no normalisation into months is applied). The borrow steps preserve the
 * elapsed total (`years × 360 + months × 30 + days`), which equals the
 * difference of the two {@link fixedDayCount} values. When a start day of 32
 * and an end day of 01 at least two months later leave a day count of -1, the
 * same non-negative elapsed total is split into 360-day years, 30-day months
 * and remaining days instead. The elapsed total, and so the fractional-month
 * time, is identical either way.
 */
export function calculateFixedDuration(
  start: NeutralDate,
  end: NeutralDate,
): FixedDuration | null {
  const elapsed = fixedDayCount(end) - fixedDayCount(start);
  if (elapsed < 0 || isEndBeforeStart(start, end)) {
    return null;
  }

  let days = end.day - start.day;
  let months = end.month - start.month;
  let years = end.year - start.year;

  if (days < 0) {
    days += DAYS_PER_MONTH;
    months -= 1;
  }
  if (months < 0) {
    months += MONTHS_PER_YEAR;
    years -= 1;
  }

  if (years < 0 || months < 0 || days < 0) {
    const daysPerYear = MONTHS_PER_YEAR * DAYS_PER_MONTH;
    years = Math.floor(elapsed / daysPerYear);
    const remainder = elapsed - years * daysPerYear;
    months = Math.floor(remainder / DAYS_PER_MONTH);
    days = remainder - months * DAYS_PER_MONTH;
  }

  return { years, months, days };
}
