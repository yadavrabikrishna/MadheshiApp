import {
  calculateSimpleInterest,
  type RateEntryMode,
  type SimpleInterestOutcome,
  type SimpleInterestResult,
  type SimpleInterestErrorCode,
} from '../../../features/interest';
import { dateMask } from '../../../utils';

/** Raw values: dates are their digits only (no `/`), numbers have no commas. */
export interface SimpleInterestFormState {
  principal: string;
  rate: string;
  rateMode: RateEntryMode;
  startDate: string;
  endDate: string;
  /** Present only while the inputs are unchanged since Calculate. */
  result: SimpleInterestResult | null;
  errors: readonly SimpleInterestErrorCode[];
}

export type SimpleInterestFormAction =
  | {
      type: 'edit';
      field: 'principal' | 'rate' | 'startDate' | 'endDate';
      value: string;
    }
  | { type: 'setRateMode'; mode: RateEntryMode }
  | { type: 'calculate' };

export const initialSimpleInterestForm: SimpleInterestFormState = {
  principal: '',
  rate: '',
  rateMode: 'percentPerMonth',
  startDate: '',
  endDate: '',
  result: null,
  errors: [],
};

/** The single place that calls the engine. */
export function runSimpleInterest(
  state: SimpleInterestFormState,
): SimpleInterestOutcome {
  return calculateSimpleInterest({
    principal: state.principal,
    rate: state.rate,
    rateMode: state.rateMode,
    startDate: dateMask.format(state.startDate),
    endDate: dateMask.format(state.endDate),
  });
}

export function simpleInterestFormReducer(
  state: SimpleInterestFormState,
  action: SimpleInterestFormAction,
): SimpleInterestFormState {
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
      const outcome = runSimpleInterest(state);
      return outcome.ok
        ? { ...state, result: outcome.value, errors: [] }
        : { ...state, result: null, errors: outcome.errors };
    }
  }
}
