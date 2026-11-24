import type { SimpleInterestErrorCode } from '../../../../features/interest';
import { calculateSimpleInterest } from '../../../../features/interest';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  type InterestRateConfig,
} from '../../../../types/interestRateConfig';
import {
  createInterestFormReducer,
  initialInterestForm,
  type InterestFormState,
} from '../interestForm';
import {
  ERROR_PRESENTATION,
  groupErrorsByField,
} from '../simpleInterestMessages';

const MONTHLY: InterestRateConfig = {
  ...DEFAULT_INTEREST_RATE_CONFIG,
  percentagePeriod: 'monthly',
};
const RUPEES: InterestRateConfig = {
  ...DEFAULT_INTEREST_RATE_CONFIG,
  rateInputMode: 'rupees',
};

const valid: InterestFormState = {
  ...initialInterestForm,
  rateConfig: MONTHLY,
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

  it('clears the result when the rate configuration changes, not when it is unchanged', () => {
    const calculated = simpleInterestFormReducer(valid, { type: 'calculate' });
    expect(
      simpleInterestFormReducer(calculated, {
        type: 'setRateConfig',
        config: { ...MONTHLY }, // equal values, new object
      }),
    ).toBe(calculated);
    for (const config of [
      RUPEES,
      { ...MONTHLY, percentagePeriod: 'yearly' as const },
      { ...MONTHLY, denominatorMode: 'per1000' as const },
    ]) {
      const next = simpleInterestFormReducer(calculated, {
        type: 'setRateConfig',
        config,
      });
      expect(next.result).toBeNull();
      expect(next.rateConfig).toBe(config);
    }
  });

  it('reads the entered rate through the saved configuration', () => {
    // 12 yearly = 1 monthly: 100000 x 1% x 3 months = 3000.
    const yearly = simpleInterestFormReducer(
      { ...valid, rate: '12', rateConfig: DEFAULT_INTEREST_RATE_CONFIG },
      { type: 'calculate' },
    );
    expect(yearly.result?.interest.toFixed()).toBe('3000');
    // Rs. 2 per Rs. 1,000 monthly = 0.2% monthly: 100000 x 0.2% x 3 = 600.
    const rupees = simpleInterestFormReducer(
      {
        ...valid,
        rateConfig: { ...RUPEES, denominatorMode: 'per1000' },
      },
      { type: 'calculate' },
    );
    expect(rupees.result?.interest.toFixed()).toBe('600');
  });

  it('never calculates with an unusable rate configuration', () => {
    const state = simpleInterestFormReducer(
      {
        ...valid,
        rateConfig: {
          ...RUPEES,
          denominatorMode: 'custom',
          customDenominator: null,
        },
      },
      { type: 'calculate' },
    );
    expect(state.result).toBeNull();
    expect(state.errors).toEqual(['rateConfigInvalid']);
  });
});

describe('error presentation', () => {
  const codes: SimpleInterestErrorCode[] = [
    'principalInvalid',
    'principalNotPositive',
    'rateInvalid',
    'rateNegative',
    'rateConfigInvalid',
    'rateModeInvalid',
    'startDateInvalid',
    'endDateInvalid',
    'endBeforeStart',
  ];

  it('maps all 9 engine error codes to a field and a message', () => {
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
    // The engine gets the normalized monthly percentage rate (2 monthly = 2).
    expect(engine).toHaveBeenCalledWith({
      principal: '100000',
      rate: '2',
      rateMode: 'percentPerMonth',
      compounding: { periodDays: 30, periodRatePercent: '2' },
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
    reducer(valid, { type: 'setRateConfig', config: RUPEES });

    expect(engine).not.toHaveBeenCalled();
  });

  it('with no engine, Calculate changes nothing: no result, no errors', () => {
    const reducer = createInterestFormReducer(null);

    expect(reducer(valid, { type: 'calculate' })).toBe(valid);
    expect(reducer(initialInterestForm, { type: 'calculate' })).toBe(
      initialInterestForm,
    );
  });

  it('with no engine, edits and rate-config changes still work', () => {
    const reducer = createInterestFormReducer(null);

    expect(
      reducer(valid, { type: 'edit', field: 'principal', value: '5' })
        .principal,
    ).toBe('5');
    expect(
      reducer(valid, { type: 'setRateConfig', config: RUPEES }).rateConfig,
    ).toBe(RUPEES);
  });
});

describe('interest form reducer: direct duration (Issue #62)', () => {
  const direct: InterestFormState = {
    ...valid,
    durationMode: 'direct',
    years: '1',
    months: '15',
    days: '45',
  };

  it('defaults to Date range with empty duration values', () => {
    expect(initialInterestForm.durationMode).toBe('dateRange');
    expect([
      initialInterestForm.years,
      initialInterestForm.months,
      initialInterestForm.days,
    ]).toEqual(['', '', '']);
  });

  it('calculates through the same engine path as the equivalent dates', () => {
    const engine = jest.fn(calculateSimpleInterest);
    const reducer = createInterestFormReducer(engine);

    const viaDuration = reducer(direct, { type: 'calculate' });
    const viaDates = reducer(
      { ...valid, startDate: '20250101', endDate: '20270516' },
      { type: 'calculate' },
    );

    // 1 y 15 m 45 d = 855 days = 2 years, 4 months, 15 days.
    expect(viaDuration.result?.duration).toEqual({
      years: 2,
      months: 4,
      days: 15,
    });
    expect(viaDuration.result?.total.toString()).toBe(
      viaDates.result?.total.toString(),
    );
    expect(engine).toHaveBeenCalledTimes(2);
  });

  it('never calculates a zero or invalid duration, and keeps other errors', () => {
    const zero = simpleInterestFormReducer(
      { ...direct, years: '0', months: '', days: '0' },
      { type: 'calculate' },
    );
    expect(zero.result).toBeNull();
    expect(zero.durationErrors).toEqual(['durationZero']);
    expect(zero.errors).toEqual([]);

    const bad = simpleInterestFormReducer(
      { ...direct, months: '1.5', principal: '' },
      { type: 'calculate' },
    );
    expect(bad.result).toBeNull();
    expect(bad.durationErrors).toEqual(['durationInvalid']);
    expect(bad.errors).toEqual(['principalInvalid']);
  });

  it('keeps both modes values when the mode changes, and drops the result', () => {
    const calculated = simpleInterestFormReducer(direct, { type: 'calculate' });
    expect(calculated.result).not.toBeNull();

    const back = simpleInterestFormReducer(calculated, {
      type: 'setDurationMode',
      mode: 'dateRange',
    });

    expect(back.durationMode).toBe('dateRange');
    expect(back.result).toBeNull();
    expect([back.startDate, back.endDate]).toEqual(['20250101', '20250401']);
    expect([back.years, back.months, back.days]).toEqual(['1', '15', '45']);
    // Same mode: nothing changes.
    expect(
      simpleInterestFormReducer(back, {
        type: 'setDurationMode',
        mode: 'dateRange',
      }),
    ).toBe(back);
  });

  it('ignores the dates in Direct duration and the duration in Date range', () => {
    const noDates = simpleInterestFormReducer(
      { ...direct, startDate: '', endDate: '' },
      { type: 'calculate' },
    );
    expect(noDates.errors).toEqual([]);
    expect(noDates.result).not.toBeNull();

    const noDuration = simpleInterestFormReducer(
      { ...valid, years: '', months: '', days: '' },
      { type: 'calculate' },
    );
    expect(noDuration.result?.total.toString()).toBe('106000');
  });
});
