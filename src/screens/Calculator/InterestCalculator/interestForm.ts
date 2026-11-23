import type {
  RateEntryMode,
  SimpleInterestResult,
  SimpleInterestErrorCode,
} from '../../../features/interest';
import { dateMask } from '../../../utils';
import type {
  InterestCalculationInput,
  InterestEngine,
} from './interestCalculatorConfig';

/** Raw values: dates are their digits only (no `/`), numbers have no commas. */
export interface InterestFormState {
  principal: string;
  rate: string;
  rateMode: RateEntryMode;
  startDate: string;
  endDate: string;
  /** Present only while the inputs are unchanged since Calculate. */
  result: SimpleInterestResult | null;
  errors: readonly SimpleInterestErrorCode[];
}

export type InterestFormAction =
  | {
      type: 'edit';
      field: 'principal' | 'rate' | 'startDate' | 'endDate';
      value: string;
    }
  | { type: 'setRateMode'; mode: RateEntryMode }
  | { type: 'calculate' };

export const initialInterestForm: InterestFormState = {
  principal: '',
  rate: '',
  rateMode: 'percentPerMonth',
  startDate: '',
  endDate: '',
  result: null,
  errors: [],
};

/** The engine input for the entered values (dates get their `/` separators). */
export function toInterestInput(
  state: InterestFormState,
): InterestCalculationInput {
  return {
    principal: state.principal,
    rate: state.rate,
    rateMode: state.rateMode,
    startDate: dateMask.format(state.startDate),
    endDate: dateMask.format(state.endDate),
  };
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
      case 'setRateMode':
        if (action.mode === state.rateMode) {
          return state;
        }
        return { ...state, rateMode: action.mode, result: null, errors: [] };
      case 'calculate': {
        if (!engine) {
          return state;
        }
        const outcome = engine(toInterestInput(state));
        return outcome.ok
          ? { ...state, result: outcome.value, errors: [] }
          : { ...state, result: null, errors: outcome.errors };
      }
    }
  };
}
