import {
  calculateCompoundInterest,
  calculateSimpleInterest,
  type CompoundInterestResult,
  type InterestErrorCode,
  type InterestInput,
  type SimpleInterestResult,
} from '../../../features/interest';

/** The two interest calculators. They share one UI and differ only in the engine. */
export type InterestType = 'simple' | 'compound';

/**
 * The calculation boundary of the shared UI. The form passes the entered values
 * (raw decimal text, neutral `YYYY/MM/DD` dates); an engine validates them and
 * returns either a result or the reasons it was rejected.
 *
 * Both interest types take the same inputs and report the same base result;
 * the Compound result adds its completed periods and remaining duration.
 */
export type InterestCalculationInput = InterestInput;
export type InterestCalculationResult =
  | SimpleInterestResult
  | CompoundInterestResult;
export type InterestCalculationOutcome =
  | { readonly ok: true; readonly value: InterestCalculationResult }
  | { readonly ok: false; readonly errors: readonly InterestErrorCode[] };
export type InterestEngine = (
  input: InterestCalculationInput,
) => InterestCalculationOutcome;

export interface InterestCalculatorConfig {
  readonly type: InterestType;
  /**
   * The engine for this interest type, or `null` when there is none. With
   * `null` the form is shown but Calculate is unavailable, and nothing is ever
   * calculated or displayed.
   */
  readonly engine: InterestEngine | null;
}

/**
 * The one place that decides which engine each interest type uses. Compound
 * Interest has its own engine and must never fall back to the Simple one.
 */
export const INTEREST_CALCULATOR_CONFIGS: Record<
  InterestType,
  InterestCalculatorConfig
> = {
  simple: { type: 'simple', engine: calculateSimpleInterest },
  compound: { type: 'compound', engine: calculateCompoundInterest },
};
