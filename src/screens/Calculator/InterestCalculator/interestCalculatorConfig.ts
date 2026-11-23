import {
  calculateSimpleInterest,
  type SimpleInterestInput,
  type SimpleInterestOutcome,
} from '../../../features/interest';

/** The two interest calculators. They share one UI and differ only in the engine. */
export type InterestType = 'simple' | 'compound';

/**
 * The calculation boundary of the shared UI. The form passes the entered values
 * (raw decimal text, neutral `YYYY/MM/DD` dates); an engine validates them and
 * returns either a result or the reasons it was rejected.
 *
 * These are the Simple Interest types today because both interest types take
 * the same inputs and show the same result. The Compound Interest engine
 * (a separate issue) plugs in by satisfying this signature.
 */
export type InterestCalculationInput = SimpleInterestInput;
export type InterestCalculationOutcome = SimpleInterestOutcome;
export type InterestEngine = (
  input: InterestCalculationInput,
) => InterestCalculationOutcome;

export interface InterestCalculatorConfig {
  readonly type: InterestType;
  /**
   * The engine for this interest type, or `null` while it does not exist yet.
   * With `null` the form is shown but Calculate is unavailable, and nothing
   * is ever calculated or displayed.
   */
  readonly engine: InterestEngine | null;
}

/**
 * The one place that decides which engine each interest type uses. Compound
 * Interest has no engine yet; it must never fall back to the Simple one.
 */
export const INTEREST_CALCULATOR_CONFIGS: Record<
  InterestType,
  InterestCalculatorConfig
> = {
  simple: { type: 'simple', engine: calculateSimpleInterest },
  compound: { type: 'compound', engine: null },
};
