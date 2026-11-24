import {
  isDenominatorMode,
  isRateInputMode,
  isRatePeriod,
  parseCustomDenominator,
  resolveDenominator,
  type InterestRateConfig,
  type RatePeriod,
} from '../../types/interestRateConfig';
import {
  CalcDecimal,
  parseDecimalInput,
  type CalcDecimalValue,
} from './decimal';
import {
  validateInterestInput,
  type InterestErrorCode,
  type InterestInput,
} from './interestInput';
import type { RateErrorCode } from './rate';

/**
 * Rate normalization for the saved rate-entry configuration (pure; no React,
 * Redux or storage). The Simple and Compound engines keep one input contract,
 * a MONTHLY percentage rate; this turns what the user entered, read through the
 * calculator's saved configuration, into that rate. The entered period is only
 * an input convention: it never changes how interest is calculated, and the
 * Compound engine still compounds once per completed 12-month period.
 *
 * Monthly percentage rate, with the fixed 30-day month and 12-month year:
 *
 *   percentage:  entered × period factor
 *   rupees:      (entered ÷ denominator × 100) × period factor
 *
 *   yearly ÷12, half-yearly ÷6, quarterly ÷3, monthly ×1, weekly ×30÷7,
 *   daily ×30
 *
 * Each value is built from a validated string, nothing is rounded here, and
 * every factor is applied as one multiplication then ONE division, so a
 * repeating result is rounded once (Decimal precision) rather than per step.
 */

/** Period → monthly percentage rate, as [numerator, denominator]. */
const PERIOD_TO_MONTHLY: Record<RatePeriod, readonly [number, number]> = {
  yearly: [1, 12],
  halfYearly: [1, 6],
  quarterly: [1, 3],
  monthly: [1, 1],
  weekly: [30, 7],
  daily: [30, 1],
};

export type ConfiguredRateErrorCode = RateErrorCode | 'rateConfigInvalid';

export type ConfiguredRateResult =
  | { readonly ok: true; readonly monthlyRatePercent: CalcDecimalValue }
  | { readonly ok: false; readonly error: ConfiguredRateErrorCode };

/** True when the configuration can be applied: known choices, usable denominator. */
export function isUsableRateConfig(config: InterestRateConfig): boolean {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  if (
    !isRateInputMode(config.rateInputMode) ||
    !isRatePeriod(config.percentagePeriod) ||
    !isRatePeriod(config.rupeesPeriod) ||
    !isDenominatorMode(config.denominatorMode)
  ) {
    return false;
  }
  // Rupees mode needs a usable denominator; a bad custom value in Percentage
  // mode cannot affect the calculation.
  if (config.rateInputMode === 'rupees') {
    const denominator = resolveDenominator(config);
    return denominator !== null && parseCustomDenominator(denominator) !== null;
  }
  return true;
}

/**
 * The monthly percentage rate for `entered` under `config`. A malformed or
 * negative entered value gives the same codes as the engines (`rateInvalid`,
 * `rateNegative`); an unusable configuration gives `rateConfigInvalid`. Never
 * throws and never returns a rate for invalid input.
 */
export function normalizeConfiguredRate(
  entered: string,
  config: InterestRateConfig,
): ConfiguredRateResult {
  const parsed = parseDecimalInput(entered);
  if (parsed.kind === 'negative') {
    return { ok: false, error: 'rateNegative' };
  }
  if (parsed.kind === 'invalid') {
    return { ok: false, error: 'rateInvalid' };
  }
  if (!isUsableRateConfig(config)) {
    return { ok: false, error: 'rateConfigInvalid' };
  }

  const period =
    config.rateInputMode === 'percentage'
      ? config.percentagePeriod
      : config.rupeesPeriod;
  const [multiplier, divisor] = PERIOD_TO_MONTHLY[period];

  let numerator = parsed.value.mul(multiplier);
  let divide = new CalcDecimal(divisor);
  if (config.rateInputMode === 'rupees') {
    // entered ÷ denominator × 100, folded into the single final division.
    numerator = numerator.mul(100);
    divide = divide.mul(new CalcDecimal(resolveDenominator(config) as string));
  }
  return { ok: true, monthlyRatePercent: numerator.div(divide) };
}

/** The shape every interest engine has (Simple and Compound). */
export type RateEngine<Result> = (
  input: InterestInput,
) =>
  | { readonly ok: true; readonly value: Result }
  | { readonly ok: false; readonly errors: readonly InterestErrorCode[] };

/** What the user entered, before normalization (no `rateMode`: the config decides). */
export interface ConfiguredInterestInput {
  readonly principal: string;
  /** The rate exactly as entered, read through `rateConfig`. */
  readonly rate: string;
  readonly rateConfig: InterestRateConfig;
  readonly startDate: string;
  readonly endDate: string;
}

/**
 * Normalize the entered rate, then call the engine with the established
 * contract: a monthly percentage rate (`percentPerMonth`). Every error of the
 * input is still reported together, in field order. If the rate or the
 * configuration is unusable the engine is never allowed to produce a result.
 */
export function calculateWithConfiguredRate<Result>(
  engine: RateEngine<Result>,
  input: ConfiguredInterestInput,
): ReturnType<RateEngine<Result>> {
  const { rate, rateConfig, ...rest } = input;
  const normalized = normalizeConfiguredRate(rate, rateConfig);

  if (normalized.ok) {
    return engine({
      ...rest,
      rate: normalized.monthlyRatePercent.toString(),
      rateMode: 'percentPerMonth',
    });
  }

  if (normalized.error !== 'rateConfigInvalid') {
    // The entered text itself is bad: the engine reports it (and any other
    // problems) with its own rate codes, and cannot succeed.
    return engine({ ...rest, rate, rateMode: 'percentPerMonth' });
  }

  // Unusable configuration: report it with the other input errors, never a result.
  const others = validateInterestInput({
    ...rest,
    rate: '0',
    rateMode: 'percentPerMonth',
  });
  const otherErrors = others.ok ? [] : others.errors;
  const afterPrincipal = otherErrors.filter(e => e.startsWith('principal'));
  const remaining = otherErrors.filter(e => !e.startsWith('principal'));
  return {
    ok: false,
    errors: [...afterPrincipal, 'rateConfigInvalid', ...remaining],
  };
}
