/**
 * Rate-entry configuration of the Simple and Compound Interest calculators
 * (pure data and rules: no React, Redux or storage). Each calculator has its
 * own, independent configuration.
 *
 * This is configuration only. It does not convert rates or change any
 * calculation; the calculators and Settings UI read it in later work.
 */

export const INTEREST_CALCULATOR_KINDS = ['simple', 'compound'] as const;
export type InterestCalculatorKind = (typeof INTEREST_CALCULATOR_KINDS)[number];

/** Percentage, or rupees per an amount (the denominator). */
export const RATE_INPUT_MODES = ['percentage', 'rupees'] as const;
export type RateInputMode = (typeof RATE_INPUT_MODES)[number];

/** The same six periods are available in both rate-entry modes. */
export const RATE_PERIODS = [
  'yearly',
  'halfYearly',
  'quarterly',
  'monthly',
  'weekly',
  'daily',
] as const;
export type RatePeriod = (typeof RATE_PERIODS)[number];

export const DENOMINATOR_MODES = ['per100', 'per1000', 'custom'] as const;
export type DenominatorMode = (typeof DENOMINATOR_MODES)[number];

export interface InterestRateConfig {
  rateInputMode: RateInputMode;
  /** Remembered separately from `rupeesPeriod`; switching modes restores it. */
  percentagePeriod: RatePeriod;
  rupeesPeriod: RatePeriod;
  denominatorMode: DenominatorMode;
  /**
   * The user-entered denominator, kept even while Per 100 / Per 1,000 is
   * selected. A plain positive decimal string (exact; never a float), or `null`
   * when none has been entered. Always valid when present.
   */
  customDenominator: string | null;
}

export type InterestRateConfigs = Record<
  InterestCalculatorKind,
  InterestRateConfig
>;

export const DEFAULT_INTEREST_RATE_CONFIG: InterestRateConfig = {
  rateInputMode: 'percentage',
  percentagePeriod: 'yearly',
  rupeesPeriod: 'monthly',
  denominatorMode: 'per100',
  customDenominator: null,
};

export const DEFAULT_INTEREST_RATE_CONFIGS: InterestRateConfigs = {
  simple: DEFAULT_INTEREST_RATE_CONFIG,
  compound: DEFAULT_INTEREST_RATE_CONFIG,
};

const FIXED_DENOMINATORS = { per100: '100', per1000: '1000' } as const;
/** Longest accepted custom denominator text, to keep stored values sane. */
const MAX_DENOMINATOR_LENGTH = 18;

export function isInterestCalculatorKind(
  value: unknown,
): value is InterestCalculatorKind {
  return INTEREST_CALCULATOR_KINDS.some(kind => kind === value);
}
export function isRateInputMode(value: unknown): value is RateInputMode {
  return RATE_INPUT_MODES.some(mode => mode === value);
}
export function isRatePeriod(value: unknown): value is RatePeriod {
  return RATE_PERIODS.some(period => period === value);
}
export function isDenominatorMode(value: unknown): value is DenominatorMode {
  return DENOMINATOR_MODES.some(mode => mode === value);
}

/**
 * A valid custom denominator: a plain positive decimal such as `"250"` or
 * `"12.5"` (no sign, exponent, grouping or spaces inside). Returns the trimmed
 * text, or `null` when it is not valid.
 */
export function parseCustomDenominator(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  if (
    text.length === 0 ||
    text.length > MAX_DENOMINATOR_LENGTH ||
    !/^\d+(\.\d+)?$/.test(text) ||
    /^0+(\.0+)?$/.test(text)
  ) {
    return null;
  }
  return text;
}

/** The period of the currently selected rate-entry mode. */
export function selectedRatePeriod(config: InterestRateConfig): RatePeriod {
  return config.rateInputMode === 'percentage'
    ? config.percentagePeriod
    : config.rupeesPeriod;
}

/**
 * The denominator the Rupees mode uses: `"100"`, `"1000"` or the saved custom
 * value. `null` only for Custom without a valid value, which a valid
 * configuration never has.
 */
export function resolveDenominator(config: InterestRateConfig): string | null {
  return config.denominatorMode === 'custom'
    ? config.customDenominator
    : FIXED_DENOMINATORS[config.denominatorMode];
}

/**
 * Turn anything (a saved value of any age, or garbage) into a valid
 * configuration. Each bad or missing field falls back to its default on its own,
 * so a partly valid record keeps its valid choices. Never throws.
 */
export function restoreInterestRateConfig(value: unknown): InterestRateConfig {
  const record =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const customDenominator = parseCustomDenominator(record.customDenominator);
  const denominatorMode = isDenominatorMode(record.denominatorMode)
    ? record.denominatorMode
    : DEFAULT_INTEREST_RATE_CONFIG.denominatorMode;
  return {
    rateInputMode: isRateInputMode(record.rateInputMode)
      ? record.rateInputMode
      : DEFAULT_INTEREST_RATE_CONFIG.rateInputMode,
    percentagePeriod: isRatePeriod(record.percentagePeriod)
      ? record.percentagePeriod
      : DEFAULT_INTEREST_RATE_CONFIG.percentagePeriod,
    rupeesPeriod: isRatePeriod(record.rupeesPeriod)
      ? record.rupeesPeriod
      : DEFAULT_INTEREST_RATE_CONFIG.rupeesPeriod,
    // Custom without a usable value cannot be honoured.
    denominatorMode:
      denominatorMode === 'custom' && customDenominator === null
        ? DEFAULT_INTEREST_RATE_CONFIG.denominatorMode
        : denominatorMode,
    customDenominator,
  };
}

/** A change to a configuration; every field is optional. */
export interface InterestRateConfigPatch {
  rateInputMode?: RateInputMode;
  /** Sets the period of the mode given by `forMode` (default: current mode). */
  period?: RatePeriod;
  forMode?: RateInputMode;
  denominatorMode?: DenominatorMode;
  /** Entered text; saved (trimmed) and preserved across denominator modes. */
  customDenominator?: string;
}

export type InterestRateConfigError =
  | 'invalidRateInputMode'
  | 'invalidPeriod'
  | 'invalidDenominatorMode'
  | 'invalidCustomDenominator'
  /** Custom was selected but no valid custom denominator exists. */
  | 'customDenominatorRequired';

export type InterestRateConfigUpdate =
  | { ok: true; config: InterestRateConfig }
  | { ok: false; error: InterestRateConfigError };

/**
 * Apply a change atomically. The result is always a valid configuration, or an
 * error and nothing changes. Switching `rateInputMode` keeps both periods, so
 * each mode shows the period it last had. The custom denominator is never
 * discarded when another denominator mode is chosen.
 */
export function updateInterestRateConfig(
  config: InterestRateConfig,
  patch: InterestRateConfigPatch,
): InterestRateConfigUpdate {
  const next: InterestRateConfig = { ...config };

  if (patch.rateInputMode !== undefined) {
    if (!isRateInputMode(patch.rateInputMode)) {
      return { ok: false, error: 'invalidRateInputMode' };
    }
    next.rateInputMode = patch.rateInputMode;
  }

  if (patch.period !== undefined) {
    if (!isRatePeriod(patch.period)) {
      return { ok: false, error: 'invalidPeriod' };
    }
    const mode = patch.forMode ?? next.rateInputMode;
    if (!isRateInputMode(mode)) {
      return { ok: false, error: 'invalidRateInputMode' };
    }
    if (mode === 'percentage') {
      next.percentagePeriod = patch.period;
    } else {
      next.rupeesPeriod = patch.period;
    }
  }

  if (patch.customDenominator !== undefined) {
    const custom = parseCustomDenominator(patch.customDenominator);
    if (custom === null) {
      return { ok: false, error: 'invalidCustomDenominator' };
    }
    next.customDenominator = custom;
  }

  if (patch.denominatorMode !== undefined) {
    if (!isDenominatorMode(patch.denominatorMode)) {
      return { ok: false, error: 'invalidDenominatorMode' };
    }
    next.denominatorMode = patch.denominatorMode;
  }

  if (next.denominatorMode === 'custom' && next.customDenominator === null) {
    return { ok: false, error: 'customDenominatorRequired' };
  }
  return { ok: true, config: next };
}
