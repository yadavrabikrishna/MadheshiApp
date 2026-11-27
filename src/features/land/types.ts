/**
 * The contract between the Terai Land Calculator UI and the land conversion
 * service (Issue #74). The UI only depends on these types: it holds no
 * conversion factors and does no area arithmetic.
 */

/** The units the user can enter a Terai land area in. */
export type TeraiLandUnit = 'bigha' | 'kattha' | 'dhur';

export const TERAI_LAND_UNITS: readonly TeraiLandUnit[] = [
  'bigha',
  'kattha',
  'dhur',
];

/** Why an input was rejected. */
export type LandErrorCode = 'empty' | 'malformed' | 'negative';

/**
 * Every output of one conversion, as exact decimal strings (never rounded or
 * formatted: display formatting is `LandConversionService.formatValue`).
 */
export interface LandConversionGroups {
  /** Hilly · रोपनी */
  hilly: { ropani: string; aana: string; paisa: string; daam: string };
  /** Terai · बिघा */
  terai: { bigha: string; kattha: string; dhur: string };
  /** Other units */
  other: {
    squareFeet: string;
    squareMetres: string;
    hectare: string;
    acre: string;
  };
}

export interface TeraiLandInput {
  /** The decimal exactly as typed (ASCII digits). */
  value: string;
  unit: TeraiLandUnit;
}

/**
 * A mixed Terai area such as 1 Bigha, 4 Kattha, 10 Dhur. Each field is the
 * decimal exactly as typed; a blank field means zero.
 */
export type TeraiLandMixedInput = Record<TeraiLandUnit, string>;

/** Why a mixed input was rejected: per field, or `empty` when all are blank. */
export type LandMixedOutcome =
  | { ok: true; value: LandConversionGroups }
  | {
      ok: false;
      /** `empty`: every field is blank (at least one value is required). */
      formError?: 'empty';
      /** Malformed or negative fields (blank fields are never errors). */
      fieldErrors: Partial<Record<TeraiLandUnit, LandErrorCode>>;
    };

export type LandConversionOutcome =
  | { ok: true; value: LandConversionGroups }
  | { ok: false; errors: LandErrorCode[] };

export interface LandConversionService {
  /** Validate the input and convert it. Pure and offline. */
  convertTerai(input: TeraiLandInput): LandConversionOutcome;
  /**
   * Validate a mixed input (Bigha + Kattha + Dhur) and convert the total
   * area. Blank fields count as zero, but at least one must be filled; the
   * sum is exact (square feet, `decimal.js`).
   */
  convertTeraiMixed(input: TeraiLandMixedInput): LandMixedOutcome;
  /**
   * One exact decimal string as display text: at most 4 decimal places,
   * round-half-up, trailing zeros trimmed. No grouping and no Nepali digits
   * (the UI adds those at the presentation boundary).
   */
  formatValue(value: string): string;
}
