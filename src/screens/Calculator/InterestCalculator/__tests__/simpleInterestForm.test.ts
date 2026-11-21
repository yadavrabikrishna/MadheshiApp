import type { SimpleInterestErrorCode } from '../../../../features/interest';
import {
  initialSimpleInterestForm,
  simpleInterestFormReducer,
  type SimpleInterestFormState,
} from '../simpleInterestForm';
import {
  ERROR_PRESENTATION,
  groupErrorsByField,
} from '../simpleInterestMessages';

const valid: SimpleInterestFormState = {
  ...initialSimpleInterestForm,
  principal: '100000',
  rate: '2',
  startDate: '20250101',
  endDate: '20250401',
};

describe('simpleInterestFormReducer', () => {
  it('calculates through the engine and stores the exact result', () => {
    const state = simpleInterestFormReducer(valid, { type: 'calculate' });
    expect(state.errors).toEqual([]);
    expect(state.result?.interest.toFixed()).toBe('6000');
    expect(state.result?.total.toFixed()).toBe('106000');
  });

  it('stores engine errors and no result for invalid input', () => {
    const state = simpleInterestFormReducer(initialSimpleInterestForm, {
      type: 'calculate',
    });
    expect(state.result).toBeNull();
    expect(state.errors).toEqual([
      'principalInvalid',
      'rateInvalid',
      'startDateInvalid',
      'endDateInvalid',
    ]);
  });

  it('clears the result and errors on any edit', () => {
    const calculated = simpleInterestFormReducer(valid, { type: 'calculate' });
    for (const field of [
      'principal',
      'rate',
      'startDate',
      'endDate',
    ] as const) {
      const edited = simpleInterestFormReducer(calculated, {
        type: 'edit',
        field,
        value: '1',
      });
      expect(edited.result).toBeNull();
      expect(edited[field]).toBe('1');
    }
    const failed = simpleInterestFormReducer(initialSimpleInterestForm, {
      type: 'calculate',
    });
    expect(
      simpleInterestFormReducer(failed, {
        type: 'edit',
        field: 'rate',
        value: '1',
      }).errors,
    ).toEqual([]);
  });

  it('clears the result when the rate mode changes, not when it is re-selected', () => {
    const calculated = simpleInterestFormReducer(valid, { type: 'calculate' });
    expect(
      simpleInterestFormReducer(calculated, {
        type: 'setRateMode',
        mode: 'percentPerMonth',
      }),
    ).toBe(calculated);
    expect(
      simpleInterestFormReducer(calculated, {
        type: 'setRateMode',
        mode: 'rupeesPer100PerMonth',
      }).result,
    ).toBeNull();
  });
});

describe('error presentation', () => {
  const codes: SimpleInterestErrorCode[] = [
    'principalInvalid',
    'principalNotPositive',
    'rateInvalid',
    'rateNegative',
    'rateModeInvalid',
    'startDateInvalid',
    'endDateInvalid',
    'endBeforeStart',
  ];

  it('maps all 8 engine error codes to a field and a message', () => {
    expect(Object.keys(ERROR_PRESENTATION).sort()).toEqual([...codes].sort());
  });

  it('groups messages by field and shows endBeforeStart beside End Date', () => {
    expect(groupErrorsByField(['principalInvalid', 'endBeforeStart'])).toEqual({
      principal: ['simpleInterest.error.principalInvalid'],
      endDate: ['simpleInterest.error.endBeforeStart'],
    });
  });
});
