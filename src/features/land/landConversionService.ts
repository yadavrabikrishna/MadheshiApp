import Decimal from 'decimal.js';

import {
  AANA_PER_ROPANI,
  DAAM_PER_PAISA,
  DHUR_PER_KATTHA,
  KATTHA_PER_BIGHA,
  PAISA_PER_AANA,
  SQ_FT_PER_BIGHA,
  SQ_FT_PER_ROPANI,
  SQ_M_PER_ACRE,
  SQ_M_PER_HECTARE,
  SQ_M_PER_SQ_FT,
} from './registry';
import {
  TERAI_LAND_UNITS,
  type LandConversionGroups,
  type LandConversionOutcome,
  type LandConversionService,
  type LandErrorCode,
  type LandMixedOutcome,
  type TeraiLandInput,
  type TeraiLandMixedInput,
  type TeraiLandUnit,
} from './types';

/**
 * A private Decimal constructor: its precision and rounding never touch the
 * global `Decimal` settings. 200 significant digits keep every product exact
 * for any supported input (the longest input is 100 characters, and the
 * largest factor adds under 10 digits); only non-terminating ratios (for
 * example dividing by 5,476) are cut at that precision, far below anything
 * that can be displayed.
 *
 * This is deliberately NOT the shared interest `CalcDecimal`: that one keeps
 * 100 digits, which cannot hold a 100-character land input exact after the
 * factors are applied, and raising it would change the Interest calculators.
 * The input pattern matches the Interest one, but land also needs a separate
 * `empty` error.
 */
const LandDecimal = Decimal.clone({
  precision: 200,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -1000,
  toExpPos: 1000,
});

/** Display values show at most this many decimals. */
export const MAX_DISPLAY_DECIMALS = 4;
/** The longest accepted input text (a guard, not a precision limit). */
export const MAX_INPUT_LENGTH = 100;

const SQ_FT_PER_KATTHA = new LandDecimal(SQ_FT_PER_BIGHA).div(KATTHA_PER_BIGHA);
const SQ_FT_PER_DHUR = SQ_FT_PER_KATTHA.div(DHUR_PER_KATTHA);
const SQ_FT_PER_AANA = new LandDecimal(SQ_FT_PER_ROPANI).div(AANA_PER_ROPANI);
const SQ_FT_PER_PAISA = SQ_FT_PER_AANA.div(PAISA_PER_AANA);
const SQ_FT_PER_DAAM = SQ_FT_PER_PAISA.div(DAAM_PER_PAISA);

const SQ_FT_PER_UNIT: Record<TeraiLandUnit, Decimal> = {
  bigha: new LandDecimal(SQ_FT_PER_BIGHA),
  kattha: SQ_FT_PER_KATTHA,
  dhur: SQ_FT_PER_DHUR,
};

const DECIMAL_TEXT = /^\d+(\.\d+)?$/;
const NEGATIVE_DECIMAL_TEXT = /^-\d+(\.\d+)?$/;

/**
 * Validates the input text, with the same rules as the Interest calculators
 * (`CalcDecimal` input): plain ASCII digits with an optional fractional part
 * (`digits` or `digits.digits`). Zero is valid. Blank text is `empty`; a
 * leading minus on a number is `negative`; everything else (a bare or
 * trailing point, `+`, exponent, comma, inner or surrounding spaces, letters,
 * non-ASCII digits, non-strings, or more than 100 characters) is `malformed`.
 */
export function parseLandInput(
  text: unknown,
): { ok: true; value: Decimal } | { ok: false; error: LandErrorCode } {
  if (typeof text !== 'string') {
    return { ok: false, error: 'malformed' };
  }
  if (text.trim() === '') {
    return { ok: false, error: 'empty' };
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return { ok: false, error: 'malformed' };
  }
  if (NEGATIVE_DECIMAL_TEXT.test(text)) {
    return { ok: false, error: 'negative' };
  }
  if (!DECIMAL_TEXT.test(text)) {
    return { ok: false, error: 'malformed' };
  }
  return { ok: true, value: new LandDecimal(text) };
}

/**
 * Splits a total, given in the SMALLEST unit, into whole larger units plus a
 * remainder in the smallest unit. The total is rounded to the display
 * precision FIRST and only then split, so the rounding can carry into the next
 * unit (3.99996 Daam becomes 1 Paisa, 0 Daam) and area is never lost or
 * double counted.
 */
function decompose(
  totalSmallest: Decimal,
  sizes: number[],
): { whole: Decimal[]; smallest: Decimal } {
  let rest = totalSmallest.toDecimalPlaces(
    MAX_DISPLAY_DECIMALS,
    Decimal.ROUND_HALF_UP,
  );
  const whole: Decimal[] = [];
  for (const size of sizes) {
    const part = rest.divToInt(size);
    whole.push(part);
    rest = rest.minus(part.times(size));
  }
  return { whole, smallest: rest };
}

const text = (value: Decimal) => value.toFixed();

/** The conversion itself, from an area in square feet (the canonical base). */
function convertSquareFeet(squareFeet: Decimal): LandConversionGroups {
  const squareMetres = squareFeet.times(SQ_M_PER_SQ_FT);

  // Hilly: total Daam -> Ropani / Aana / Paisa / Daam.
  const daamPerAana = PAISA_PER_AANA * DAAM_PER_PAISA;
  const hilly = decompose(squareFeet.div(SQ_FT_PER_DAAM), [
    AANA_PER_ROPANI * daamPerAana,
    daamPerAana,
    DAAM_PER_PAISA,
  ]);

  // Terai: total Dhur -> Bigha / Kattha / Dhur.
  const terai = decompose(squareFeet.div(SQ_FT_PER_DHUR), [
    KATTHA_PER_BIGHA * DHUR_PER_KATTHA,
    DHUR_PER_KATTHA,
  ]);

  return {
    hilly: {
      ropani: text(hilly.whole[0]),
      aana: text(hilly.whole[1]),
      paisa: text(hilly.whole[2]),
      daam: text(hilly.smallest),
    },
    terai: {
      bigha: text(terai.whole[0]),
      kattha: text(terai.whole[1]),
      dhur: text(terai.smallest),
    },
    other: {
      squareFeet: text(squareFeet),
      squareMetres: text(squareMetres),
      hectare: text(squareMetres.div(SQ_M_PER_HECTARE)),
      acre: text(squareMetres.div(SQ_M_PER_ACRE)),
    },
  };
}

/**
 * The land conversion service (Issue #74): pure, offline and independent of
 * React Native. Square feet is the canonical area; every output is computed
 * from it with `decimal.js`, never with JavaScript numbers.
 *
 * - Hilly and Terai outputs are decomposed whole units with a fractional
 *   remainder in the smallest unit (Daam / Dhur), rounded half-up to 4
 *   decimals before carrying (see `decompose`).
 * - Square feet, square metres, hectare and acre are exact strings (only a
 *   non-terminating ratio is cut, at 200 significant digits).
 * - `formatValue` is the single display formatter.
 */
export const landConversionService: LandConversionService = {
  convertTerai({ value, unit }: TeraiLandInput): LandConversionOutcome {
    const parsed = parseLandInput(value);
    if (!parsed.ok) {
      return { ok: false, errors: [parsed.error] };
    }
    return {
      ok: true,
      value: convertSquareFeet(parsed.value.times(SQ_FT_PER_UNIT[unit])),
    };
  },

  convertTeraiMixed(input: TeraiLandMixedInput): LandMixedOutcome {
    const fieldErrors: Partial<Record<TeraiLandUnit, LandErrorCode>> = {};
    let squareFeet = new LandDecimal(0);
    let filled = 0;
    for (const unit of TERAI_LAND_UNITS) {
      const parsed = parseLandInput(input?.[unit]);
      if (parsed.ok) {
        filled += 1;
        squareFeet = squareFeet.plus(parsed.value.times(SQ_FT_PER_UNIT[unit]));
      } else if (parsed.error !== 'empty') {
        fieldErrors[unit] = parsed.error;
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, fieldErrors };
    }
    if (filled === 0) {
      return { ok: false, formError: 'empty', fieldErrors };
    }
    return { ok: true, value: convertSquareFeet(squareFeet) };
  },

  formatValue(value: string): string {
    return new LandDecimal(value)
      .toDecimalPlaces(MAX_DISPLAY_DECIMALS, Decimal.ROUND_HALF_UP)
      .toFixed();
  },
};
