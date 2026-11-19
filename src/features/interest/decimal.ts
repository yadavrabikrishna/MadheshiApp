import Decimal from 'decimal.js';

/**
 * Shared Decimal configuration for the interest calculators.
 *
 * A cloned constructor is used so the global `Decimal` configuration is never
 * mutated. Pure calculation code only: no React, Redux or storage.
 *
 * - `precision` is 100 significant digits. Decimal.js rounds only the result of
 *   a division (or similar inexact operation) to this precision, so every
 *   intermediate value is kept at far more digits than any currency display
 *   needs. Final display rounding (half-up, 2 decimals) belongs to the UI.
 * - `toExpNeg` / `toExpPos` stop `toString()` from switching to exponential
 *   notation, so canonical decimal strings are always plain digits.
 */
export const CalcDecimal = Decimal.clone({
  precision: 100,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9e15,
  toExpPos: 9e15,
});

/** A value produced by the interest calculation engine. */
export type CalcDecimalValue = Decimal;

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const NEGATIVE_DECIMAL_PATTERN = /^-\d+(\.\d+)?$/;

export type DecimalInputResult =
  | { readonly kind: 'ok'; readonly value: CalcDecimalValue }
  | { readonly kind: 'negative' }
  | { readonly kind: 'invalid' };

/**
 * Parses a plain decimal string such as `"100000"` or `"2.5"`.
 *
 * Accepted: ASCII digits with an optional fractional part (`digits.digits`).
 * Rejected as `invalid`: empty text, surrounding whitespace, grouping commas,
 * a `+` sign, exponents, `NaN`/`Infinity`, a trailing or leading bare point
 * (`"5."`, `".5"`), non-ASCII digits and non-string values. A leading `-`
 * on an otherwise valid decimal is reported as `negative`.
 *
 * The value is built from the string, never from a JavaScript number, so no
 * precision is lost.
 */
export function parseDecimalInput(text: unknown): DecimalInputResult {
  if (typeof text !== 'string') {
    return { kind: 'invalid' };
  }
  if (DECIMAL_PATTERN.test(text)) {
    return { kind: 'ok', value: new CalcDecimal(text) };
  }
  if (NEGATIVE_DECIMAL_PATTERN.test(text)) {
    return { kind: 'negative' };
  }
  return { kind: 'invalid' };
}
