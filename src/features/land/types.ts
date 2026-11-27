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

export type LandConversionOutcome =
  | { ok: true; value: LandConversionGroups }
  | { ok: false; errors: LandErrorCode[] };

export interface LandConversionService {
  /** Validate the input and convert it. Pure and offline. */
  convertTerai(input: TeraiLandInput): LandConversionOutcome;
  /**
   * One exact decimal string as display text: at most 4 decimal places,
   * round-half-up, trailing zeros trimmed. No grouping and no Nepali digits
   * (the UI adds those at the presentation boundary).
   */
  formatValue(value: string): string;
}
