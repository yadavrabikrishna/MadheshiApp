import {
  calculateWithConfiguredRate,
  directDurationToDates,
  normalizeDirectDuration,
  type ConfiguredInterestInput,
  type DirectDurationErrorCode,
  type InterestErrorCode,
} from '../../../features/interest';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  type InterestRateConfig,
} from '../../../types/interestRateConfig';
import { dateMask } from '../../../utils';
import type {
  InterestCalculationResult,
  InterestEngine,
} from './interestCalculatorConfig';

/** How the elapsed time is entered. Date range is the default. */
export type DurationMode = 'dateRange' | 'direct';

/** The direct-duration inputs are digits only. */
export type DurationField = 'years' | 'months' | 'days';

/** Raw values: dates are their digits only (no `/`), numbers have no commas. */
export interface InterestFormState {
  principal: string;
  rate: string;
  /**
   * The saved rate configuration the entered rate is read through. It is the
   * one used by the last Calculate (the shown result), kept in sync with Settings.
   */
  rateConfig: InterestRateConfig;
  startDate: string;
  endDate: string;
  /** Both modes keep their own values; switching never clears either set. */
  durationMode: DurationMode;
  years: string;
  months: string;
  days: string;
  /** Present only while the inputs are unchanged since Calculate. */
  result: InterestCalculationResult | null;
  errors: readonly InterestErrorCode[];
  /** Direct-duration problems found by the last Calculate. */
  durationErrors: readonly DirectDurationErrorCode[];
}

export type InterestFormAction =
  | {
      type: 'edit';
      field: 'principal' | 'rate' | 'startDate' | 'endDate' | DurationField;
      value: string;
    }
  | { type: 'setDurationMode'; mode: DurationMode }
  | { type: 'setRateConfig'; config: InterestRateConfig }
  | { type: 'calculate' };

export const initialInterestForm: InterestFormState = {
  principal: '',
  rate: '',
  rateConfig: DEFAULT_INTEREST_RATE_CONFIG,
  startDate: '',
  endDate: '',
  durationMode: 'dateRange',
  years: '',
  months: '',
  days: '',
  result: null,
  errors: [],
  durationErrors: [],
};

/**
 * The entered values with the saved rate configuration (dates get their `/`
 * separators). The rate is normalized to the engine's monthly rate when
 * calculating (`calculateWithConfiguredRate`), not here.
 */
export function toInterestInput(
  state: InterestFormState,
): ConfiguredInterestInput {
  // Direct duration enters the same path as a pair of neutral dates whose
  // difference is the normalized duration; an unusable duration is reported
  // separately by `calculate`, so the dates here are only placeholders.
  const direct = normalizeDirectDuration(state);
  const dates =
    state.durationMode === 'direct'
      ? directDurationToDates(
          direct.ok ? direct.duration : { years: 0, months: 0, days: 0 },
        )
      : {
          startDate: dateMask.format(state.startDate),
          endDate: dateMask.format(state.endDate),
        };
  return {
    principal: state.principal,
    rate: state.rate,
    rateConfig: state.rateConfig,
    ...dates,
  };
}

function sameRateConfig(a: InterestRateConfig, b: InterestRateConfig) {
  return (
    a.rateInputMode === b.rateInputMode &&
    a.percentagePeriod === b.percentagePeriod &&
    a.rupeesPeriod === b.rupeesPeriod &&
    a.denominatorMode === b.denominatorMode &&
    a.customDenominator === b.customDenominator
  );
}

/**
 * The form reducer for one interest type. The engine is injected, so this file
 * knows nothing about Simple or Compound; with no engine, Calculate does
 * nothing (no result, no errors).
 */
export function createInterestFormReducer(engine: InterestEngine | null) {
  return function interestFormReducer(
    state: InterestFormState,
    action: InterestFormAction,
  ): InterestFormState {
    switch (action.type) {
      case 'edit':
        // Any edit invalidates the shown result and stale errors.
        return {
          ...state,
          [action.field]: action.value,
          result: null,
          errors: [],
          durationErrors: [],
        };
      case 'setDurationMode':
        if (action.mode === state.durationMode) {
          return state;
        }
        // Only the mode changes: every entered value in both modes is kept.
        return {
          ...state,
          durationMode: action.mode,
          result: null,
          errors: [],
          durationErrors: [],
        };
      case 'setRateConfig':
        // Same configuration (a no-op save): keep the result.
        if (sameRateConfig(action.config, state.rateConfig)) {
          return state;
        }
        // The rate is now read differently, so a shown result no longer matches.
        return {
          ...state,
          rateConfig: action.config,
          result: null,
          errors: [],
          durationErrors: [],
        };
      case 'calculate': {
        if (!engine) {
          return state;
        }
        const direct =
          state.durationMode === 'direct'
            ? normalizeDirectDuration(state)
            : null;
        const outcome = calculateWithConfiguredRate(
          engine,
          toInterestInput(state),
        );
        if (direct && !direct.ok) {
          // Never a result for an unusable duration; the other fields are
          // still checked so every problem shows together.
          return {
            ...state,
            result: null,
            errors: outcome.ok ? [] : outcome.errors,
            durationErrors: [direct.error],
          };
        }
        return outcome.ok
          ? { ...state, result: outcome.value, errors: [], durationErrors: [] }
          : {
              ...state,
              result: null,
              errors: outcome.errors,
              durationErrors: [],
            };
      }
    }
  };
}
