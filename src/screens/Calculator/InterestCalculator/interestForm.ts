import {
  calculateWithConfiguredRate,
  type ConfiguredInterestInput,
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
  /** Present only while the inputs are unchanged since Calculate. */
  result: InterestCalculationResult | null;
  errors: readonly InterestErrorCode[];
}

export type InterestFormAction =
  | {
      type: 'edit';
      field: 'principal' | 'rate' | 'startDate' | 'endDate';
      value: string;
    }
  | { type: 'setRateConfig'; config: InterestRateConfig }
  | { type: 'calculate' };

export const initialInterestForm: InterestFormState = {
  principal: '',
  rate: '',
  rateConfig: DEFAULT_INTEREST_RATE_CONFIG,
  startDate: '',
  endDate: '',
  result: null,
  errors: [],
};

/**
 * The entered values with the saved rate configuration (dates get their `/`
 * separators). The rate is normalized to the engine's monthly rate when
 * calculating (`calculateWithConfiguredRate`), not here.
 */
export function toInterestInput(
  state: InterestFormState,
): ConfiguredInterestInput {
  return {
    principal: state.principal,
    rate: state.rate,
    rateConfig: state.rateConfig,
    startDate: dateMask.format(state.startDate),
    endDate: dateMask.format(state.endDate),
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
        };
      case 'calculate': {
        if (!engine) {
          return state;
        }
        const outcome = calculateWithConfiguredRate(
          engine,
          toInterestInput(state),
        );
        return outcome.ok
          ? { ...state, result: outcome.value, errors: [] }
          : { ...state, result: null, errors: outcome.errors };
      }
    }
  };
}
