/**
 * The seven independently configurable calculators. The order is the app-wide
 * fallback order: when the active calculator is unavailable, the first enabled
 * one in this list is used.
 */
export const CALCULATOR_IDS = [
  'simpleInterest',
  'compoundInterest',
  'ageAd',
  'ageBs',
  'terai',
  'hillMountain',
  'basic',
] as const;
export type CalculatorId = (typeof CALCULATOR_IDS)[number];

export type EnabledCalculators = Record<CalculatorId, boolean>;

/** First run: all six specialist calculators on, Basic Calculator off. */
export const DEFAULT_ENABLED_CALCULATORS: EnabledCalculators = {
  simpleInterest: true,
  compoundInterest: true,
  ageAd: true,
  ageBs: true,
  terai: true,
  hillMountain: true,
  basic: false,
};

export function isCalculatorId(value: unknown): value is CalculatorId {
  return CALCULATOR_IDS.some(id => id === value);
}
