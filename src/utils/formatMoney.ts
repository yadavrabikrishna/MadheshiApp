import Decimal from 'decimal.js';

/**
 * Shared Money display convention (presentation layer, no calculation logic).
 *
 * - Final display only: rounded half-up to at most 2 decimal places, then
 *   unnecessary trailing zeros and the decimal point are dropped
 *   (`20.00` -> `20`, `20.20` -> `20.2`, `20.02` -> `20.02`).
 * - Nepal / Indian digit grouping (`1,00,000`), used for both app languages.
 * - Decimal-safe: values are rounded with Decimal.js and formatted from their
 *   decimal string. Nothing goes through a JavaScript floating-point number,
 *   so no precision is lost. Callers must pass the engine's UNROUNDED values
 *   (never a total built from already-rounded display strings).
 *
 * Reusable by every calculator (Simple and, later, Compound Interest).
 */

/** Money is displayed with at most this many decimal places. */
export const MONEY_DECIMAL_PLACES = 2;

/**
 * Groups a string of digits Nepal/Indian style: the last three digits, then
 * groups of two (`1234567` -> `12,34,567`). Input must be digits only.
 */
export function groupIndianDigits(digits: string): string {
  if (digits.length <= 3) {
    return digits;
  }
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${head},${digits.slice(-3)}`;
}

/**
 * Groups a plain decimal string for display WITHOUT rounding (for input
 * fields): `"1234567.891"` -> `"12,34,567.891"`, `"100."` -> `"100."`.
 */
export function groupDecimalString(plain: string): string {
  const dot = plain.indexOf('.');
  if (dot === -1) {
    return groupIndianDigits(plain);
  }
  return groupIndianDigits(plain.slice(0, dot)) + plain.slice(dot);
}

/**
 * Formats a monetary value for display, without a currency symbol.
 *
 * `value` is a Decimal (typically the calculation engine's unrounded result)
 * or a plain decimal string. A string that is not a valid decimal throws, so
 * pass only engine output or validated strings.
 */
export function formatMoney(value: Decimal | string): string {
  const decimal = typeof value === 'string' ? new Decimal(value) : value;
  const rounded = decimal.toDecimalPlaces(
    MONEY_DECIMAL_PLACES,
    Decimal.ROUND_HALF_UP,
  );
  if (rounded.isZero()) {
    return '0';
  }
  // `toFixed()` without arguments is plain notation (never exponent form) and
  // carries no trailing zeros, because a Decimal stores none.
  const grouped = groupDecimalString(rounded.abs().toFixed());
  return rounded.isNegative() ? `-${grouped}` : grouped;
}
