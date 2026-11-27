/**
 * The contract between the land calculator UI and the land conversion service
 * (Issues #74 and #76). The UI only depends on these types: it holds no
 * conversion factors and does no area arithmetic.
 */

/** The two land unit families a user can enter an area in. */
export type LandFamily = 'terai' | 'hill';

/** Terai units: 1 Bigha = 20 Kattha = 400 Dhur. */
export type TeraiLandUnit = 'bigha' | 'kattha' | 'dhur';

/** Hill / Mountain units: 1 Ropani = 16 Aana = 64 Paisa = 256 Daam. */
export type HillLandUnit = 'ropani' | 'aana' | 'paisa' | 'daam';

/** Any unit that can be entered. */
export type LandUnit = TeraiLandUnit | HillLandUnit;

/** The units of each family, largest first (also the mixed-input order). */
export const TERAI_LAND_UNITS: readonly TeraiLandUnit[] = [
  'bigha',
  'kattha',
  'dhur',
];
export const HILL_LAND_UNITS: readonly HillLandUnit[] = [
  'ropani',
  'aana',
  'paisa',
  'daam',
];

export const LAND_FAMILY_UNITS = {
  terai: TERAI_LAND_UNITS,
  hill: HILL_LAND_UNITS,
} as const satisfies Record<LandFamily, readonly LandUnit[]>;

/** The unit type of one family. */
export type LandUnitOf<F extends LandFamily> = F extends 'terai'
  ? TeraiLandUnit
  : HillLandUnit;

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

/**
 * A mixed area in one family, such as 1 Bigha, 4 Kattha, 10 Dhur or 2 Ropani,
 * 3 Aana. One decimal per unit, each exactly as typed; a blank field means
 * zero.
 */
export type LandMixedInput<F extends LandFamily = 'terai'> = Record<
  LandUnitOf<F>,
  string
>;

/** The Terai mixed input (kept for the Terai UI). */
export type TeraiLandMixedInput = LandMixedInput<'terai'>;

/** A single-unit input: a decimal string and the unit it is in. */
export interface LandInput {
  /** The decimal exactly as typed (ASCII digits). */
  value: string;
  unit: LandUnit;
}

/** Why a mixed input was rejected: per field, or `empty` when all are blank. */
export type LandMixedOutcome<U extends LandUnit = TeraiLandUnit> =
  | { ok: true; value: LandConversionGroups }
  | {
      ok: false;
      /** `empty`: every field is blank (at least one value is required). */
      formError?: 'empty';
      /** Malformed or negative fields (blank fields are never errors). */
      fieldErrors: Partial<Record<U, LandErrorCode>>;
    };

export type LandConversionOutcome =
  | { ok: true; value: LandConversionGroups }
  | { ok: false; errors: LandErrorCode[] };

/**
 * The generic land conversion service: one validation and conversion path for
 * every unit family. Pure and offline.
 */
export interface LandConverter {
  /** Validate one decimal in one unit (either family) and convert it. */
  convert(input: LandInput): LandConversionOutcome;
  /**
   * Validate a mixed input (one decimal per unit of the family) and convert
   * the total area. Blank fields count as zero, but at least one must be
   * filled; the sum is exact (square feet, `decimal.js`).
   */
  convertMixed<F extends LandFamily>(
    family: F,
    input: LandMixedInput<F>,
  ): LandMixedOutcome<LandUnitOf<F>>;
  /**
   * One exact decimal string as display text: at most 4 decimal places,
   * round-half-up, trailing zeros trimmed. No grouping and no Nepali digits
   * (the UI adds those at the presentation boundary).
   */
  formatValue(value: string): string;
}

/** The Terai single-unit input of the compatibility wrapper. */
export interface TeraiLandInput {
  value: string;
  unit: TeraiLandUnit;
}

/**
 * Compatibility wrappers for the existing Terai UI (and its tests). They only
 * delegate to `LandConverter` (`convert` / `convertMixed('terai', ...)`) and
 * hold no logic of their own; they can be removed when the UI moves to the
 * generic API.
 */
export interface LandConversionService {
  convertTerai(input: TeraiLandInput): LandConversionOutcome;
  convertTeraiMixed(input: TeraiLandMixedInput): LandMixedOutcome;
  formatValue(value: string): string;
}
