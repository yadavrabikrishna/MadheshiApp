import { CalcDecimal } from '../interest/decimal';

/** Decimal places shown for a calculator result (display rounding only). */
export const RESULT_DECIMAL_PLACES = 10;

/**
 * A result for DISPLAY: the engine's exact value rounded half up to
 * `RESULT_DECIMAL_PLACES`, in plain notation with no trailing zeros and no
 * `-0` (`1 ÷ 3` shows 0.3333333333). The engine keeps full precision; the
 * keypad continues a finished calculation from this displayed value.
 */
export function formatCalculatorResult(value: string): string {
  const rounded = new CalcDecimal(value).toDecimalPlaces(RESULT_DECIMAL_PLACES);
  return rounded.isZero() ? '0' : rounded.toFixed();
}
