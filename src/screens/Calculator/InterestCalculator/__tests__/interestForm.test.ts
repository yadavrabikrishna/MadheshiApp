import type { SimpleInterestErrorCode } from '../../../../features/interest';
import { calculateSimpleInterest } from '../../../../features/interest';
import {
  createInterestFormReducer,
  initialInterestForm,
  type InterestFormState,
} from '../interestForm';
import {
  ERROR_PRESENTATION,
  groupErrorsByField,
} from '../simpleInterestMessages';

const valid: InterestFormState = {
  ...initialInterestForm,
  principal: '100000',
  rate: '2',
  startDate: '20250101',
  endDate: '20250401',
};

const simpleInterestFormReducer = createInterestFormReducer(
  calculateSimpleInterest,
);

describe('interest form reducer with the Simple Interest engine', () => {
  it('calculates through the engine and stores the exact result', () => {
    const state = simpleInterestFormReducer(valid, { type: 'calculate' });
    expect(state.errors).toEqual([]);
    expect(state.result?.interest.toFixed()).toBe('6000');
    expect(state.result?.total.toFixed()).toBe('106000');
  });

  it('stores engine errors and no result for invalid input', () => {
    const state = simpleInterestFormReducer(initialInterestForm, {
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
    const failed = simpleInterestFormReducer(initialInterestForm, {
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

describe('interest form reducer: the engine boundary', () => {
  const okOutcome = calculateSimpleInterest({
    principal: '100000',
    rate: '2',
    rateMode: 'percentPerMonth',
    startDate: '2025/01/01',
    endDate: '2025/04/01',
  });

  it('passes the entered values to the injected engine, with dates formatted', () => {
    const engine = jest.fn().mockReturnValue(okOutcome);
    const reducer = createInterestFormReducer(engine);

    const state = reducer(valid, { type: 'calculate' });

    expect(engine).toHaveBeenCalledTimes(1);
    expect(engine).toHaveBeenCalledWith({
      principal: '100000',
      rate: '2',
      rateMode: 'percentPerMonth',
      startDate: '2025/01/01',
      endDate: '2025/04/01',
    });
    expect(state.result).toBe(okOutcome.ok ? okOutcome.value : null);
    expect(state.errors).toEqual([]);
  });

  it('shows the errors an injected engine returns, and no result', () => {
    const engine = jest
      .fn()
      .mockReturnValue({ ok: false, errors: ['rateInvalid'] });

    const state = createInterestFormReducer(engine)(valid, {
      type: 'calculate',
    });

    expect(state.result).toBeNull();
    expect(state.errors).toEqual(['rateInvalid']);
  });

  it('does not call the engine for edits or rate-mode changes', () => {
    const engine = jest.fn();
    const reducer = createInterestFormReducer(engine);

    reducer(valid, { type: 'edit', field: 'principal', value: '5' });
    reducer(valid, { type: 'setRateMode', mode: 'rupeesPer100PerMonth' });

    expect(engine).not.toHaveBeenCalled();
  });

  it('with no engine, Calculate changes nothing: no result, no errors', () => {
    const reducer = createInterestFormReducer(null);

    expect(reducer(valid, { type: 'calculate' })).toBe(valid);
    expect(reducer(initialInterestForm, { type: 'calculate' })).toBe(
      initialInterestForm,
    );
  });

  it('with no engine, edits and rate-mode changes still work', () => {
    const reducer = createInterestFormReducer(null);

    expect(
      reducer(valid, { type: 'edit', field: 'principal', value: '5' })
        .principal,
    ).toBe('5');
    expect(
      reducer(valid, { type: 'setRateMode', mode: 'rupeesPer100PerMonth' })
        .rateMode,
    ).toBe('rupeesPer100PerMonth');
  });
});
