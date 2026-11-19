import Decimal from 'decimal.js';

import {
  calculateSimpleInterest,
  RATE_ENTRY_MODES,
  type SimpleInterestInput,
  type SimpleInterestResult,
} from '..';

const BASE: SimpleInterestInput = {
  principal: '10000',
  rate: '2',
  rateMode: 'percentPerMonth',
  startDate: '2024/01/01',
  endDate: '2025/01/01',
};

function run(overrides: Partial<SimpleInterestInput> = {}) {
  return calculateSimpleInterest({ ...BASE, ...overrides });
}

function ok(
  overrides: Partial<SimpleInterestInput> = {},
): SimpleInterestResult {
  const outcome = run(overrides);
  if (!outcome.ok) {
    throw new Error(`expected ok, got ${outcome.errors.join(',')}`);
  }
  return outcome.value;
}

function errors(overrides: Partial<SimpleInterestInput> = {}) {
  const outcome = run(overrides);
  if (outcome.ok) {
    throw new Error('expected errors');
  }
  return outcome.errors;
}

describe('calculation results', () => {
  it('calculates a full year of interest on the original principal', () => {
    const result = ok();
    expect(result.duration).toEqual({ years: 1, months: 0, days: 0 });
    expect(result.timeInMonths.toString()).toBe('12');
    expect(result.monthlyRate.toString()).toBe('0.02');
    expect(result.monthlyRatePercent.toString()).toBe('2');
    expect(result.principal.toString()).toBe('10000');
    expect(result.interest.toString()).toBe('2400');
    expect(result.total.toString()).toBe('12400');
  });

  it('echoes the parsed dates', () => {
    const result = ok();
    expect(result.startDate).toEqual({ year: 2024, month: 1, day: 1 });
    expect(result.endDate).toEqual({ year: 2025, month: 1, day: 1 });
  });

  it('never capitalises: five years is exactly five times one year', () => {
    const oneYear = ok({ endDate: '2025/01/01' });
    const fiveYears = ok({ endDate: '2029/01/01' });
    expect(fiveYears.interest.toString()).toBe(
      oneYear.interest.times(5).toString(),
    );
    expect(fiveYears.interest.toString()).toBe('12000');
    expect(fiveYears.total.toString()).toBe('22000');
  });

  it('prorates a partial month by days / 30', () => {
    const result = ok({
      principal: '30000',
      rate: '1',
      startDate: '2024/03/01',
      endDate: '2024/03/16',
    });
    expect(result.duration).toEqual({ years: 0, months: 0, days: 15 });
    expect(result.timeInMonths.toString()).toBe('0.5');
    expect(result.interest.toString()).toBe('150');
    expect(result.total.toString()).toBe('30150');
  });

  it('combines years, months and days', () => {
    const result = ok({
      principal: '100000',
      rate: '1',
      startDate: '2023/11/20',
      endDate: '2025/02/05',
    });
    // 1y 2m 15d = 14.5 months
    expect(result.duration).toEqual({ years: 1, months: 2, days: 15 });
    expect(result.timeInMonths.toString()).toBe('14.5');
    expect(result.interest.toString()).toBe('14500');
  });

  it('handles day 32 through the fixed arithmetic', () => {
    const result = ok({
      principal: '30000',
      rate: '1',
      startDate: '2024/01/01',
      endDate: '2024/01/32',
    });
    expect(result.duration).toEqual({ years: 0, months: 0, days: 31 });
    expect(result.interest.toString()).toBe('310');
  });

  it('keeps the elapsed total correct when the negative-day guard applies', () => {
    const result = ok({
      principal: '30000',
      rate: '1',
      startDate: '2020/01/32',
      endDate: '2020/03/01',
    });
    expect(result.duration).toEqual({ years: 0, months: 0, days: 29 });
    expect(result.interest.toString()).toBe('290');
  });

  it('gives equal results for the same arithmetic in either rate mode', () => {
    for (const rate of ['1', '2', '2.5', '3']) {
      const percent = ok({ rate, rateMode: 'percentPerMonth' });
      const rupees = ok({ rate, rateMode: 'rupeesPer100PerMonth' });
      expect(percent.interest.equals(rupees.interest)).toBe(true);
      expect(percent.total.equals(rupees.total)).toBe(true);
      expect(percent.monthlyRate.equals(rupees.monthlyRate)).toBe(true);
    }
  });

  it('matches the approved rate examples (annual nominal = monthly × 12)', () => {
    // Rs. 2.5 per Rs. 100 per month on Rs. 100000 for 12 months = 30% = 30000.
    expect(ok({ principal: '100000', rate: '2.5' }).interest.toString()).toBe(
      '30000',
    );
    // Rs. 3 per Rs. 100 per month = 36% annual.
    expect(ok({ principal: '100000', rate: '3' }).interest.toString()).toBe(
      '36000',
    );
  });
});

describe('zero cases', () => {
  it('returns zero interest and total = principal for identical dates', () => {
    const result = ok({ startDate: '2024/06/15', endDate: '2024/06/15' });
    expect(result.duration).toEqual({ years: 0, months: 0, days: 0 });
    expect(result.timeInMonths.toString()).toBe('0');
    expect(result.interest.toString()).toBe('0');
    expect(result.total.toString()).toBe('10000');
  });

  it('returns zero interest for a zero rate', () => {
    const result = ok({ rate: '0' });
    expect(result.monthlyRate.toString()).toBe('0');
    expect(result.interest.toString()).toBe('0');
    expect(result.total.toString()).toBe('10000');
  });

  it('accepts a zero rate in both modes', () => {
    for (const rateMode of RATE_ENTRY_MODES) {
      expect(run({ rate: '0', rateMode }).ok).toBe(true);
    }
  });
});

describe('decimal precision', () => {
  it('does not lose precision to binary floating point', () => {
    // 0.1 × 0.2% for exactly one month = 0.0002; floating point cannot do this.
    const result = ok({
      principal: '0.1',
      rate: '0.2',
      startDate: '2024/01/01',
      endDate: '2024/02/01',
    });
    expect(result.interest.toString()).toBe('0.0002');
    expect(result.total.toString()).toBe('0.1002');
  });

  it('does not round interest or total to two decimals', () => {
    // Exactly on a half-paisa boundary: 100.5 × 1% = 1.005.
    const result = ok({
      principal: '100.5',
      rate: '1',
      startDate: '2024/01/01',
      endDate: '2024/02/01',
    });
    expect(result.interest.toString()).toBe('1.005');
    expect(result.total.toString()).toBe('101.505');
  });

  it('keeps just-above and just-below half-paisa values distinct', () => {
    const above = ok({
      principal: '100.51',
      rate: '1',
      startDate: '2024/01/01',
      endDate: '2024/02/01',
    });
    const below = ok({
      principal: '100.49',
      rate: '1',
      startDate: '2024/01/01',
      endDate: '2024/02/01',
    });
    expect(above.interest.toString()).toBe('1.0051');
    expect(below.interest.toString()).toBe('1.0049');
  });

  it('keeps full precision for non-terminating results', () => {
    // 1000 × 1% × 1/30 month = 0.3333... (not 0.33 and not 20 digits).
    const result = ok({
      principal: '1000',
      rate: '1',
      startDate: '2024/01/01',
      endDate: '2024/01/02',
    });
    const text = result.interest.toString();
    expect(text.startsWith('0.3333333333333333333333333')).toBe(true);
    expect(text.length).toBeGreaterThan(60);
    expect(result.interest.times(30).minus(10).abs().lessThan('1e-90')).toBe(
      true,
    );
    expect(result.timeInMonths.times(30).minus(1).abs().lessThan('1e-90')).toBe(
      true,
    );
  });

  it('calculates large values exactly with plain decimal strings', () => {
    const result = ok({
      principal: '999999999999999999999.99',
      rate: '12.5',
      startDate: '2000/01/01',
      endDate: '2010/01/01',
    });
    expect(result.timeInMonths.toString()).toBe('120');
    expect(result.interest.toString()).toBe('14999999999999999999999.85');
    expect(result.total.toString()).toBe('15999999999999999999999.84');
  });

  it('handles very small values without exponent notation', () => {
    const result = ok({
      principal: '0.0000001',
      rate: '0.0001',
      startDate: '2024/01/01',
      endDate: '2024/02/01',
    });
    expect(result.interest.toString()).toBe('0.0000000000001');
    expect(result.interest.toString()).not.toMatch(/e/i);
  });

  it('does not mutate the global Decimal configuration', () => {
    const before = { precision: Decimal.precision, rounding: Decimal.rounding };
    ok({ principal: '1000', rate: '1', endDate: '2024/01/02' });
    expect(Decimal.precision).toBe(before.precision);
    expect(Decimal.rounding).toBe(before.rounding);
    expect(new Decimal(1).div(3).toString()).toBe('0.33333333333333333333');
  });

  it('is deterministic', () => {
    const a = ok({ principal: '1234.56', rate: '2.75', endDate: '2024/09/17' });
    const b = ok({ principal: '1234.56', rate: '2.75', endDate: '2024/09/17' });
    expect(a.interest.toString()).toBe(b.interest.toString());
    expect(a.total.toString()).toBe(b.total.toString());
  });
});

describe('principal validation', () => {
  it.each([
    '',
    'abc',
    '1e5',
    '1,000',
    ' 100',
    '100 ',
    '1.',
    '.5',
    '+5',
    '1.2.3',
  ])('rejects malformed principal %p', principal => {
    expect(errors({ principal })).toEqual(['principalInvalid']);
  });

  it.each(['0', '0.00', '-5', '-0.5'])(
    'rejects non-positive principal %p',
    principal => {
      expect(errors({ principal })).toEqual(['principalNotPositive']);
    },
  );

  it('accepts a tiny positive principal', () => {
    expect(run({ principal: '0.01' }).ok).toBe(true);
  });
});

describe('rate validation', () => {
  it.each(['-1', '-0.5'])('rejects negative rate %p', rate => {
    expect(errors({ rate })).toEqual(['rateNegative']);
  });

  it.each(['', 'abc', '2%', '1e2', '2,5', '.5'])(
    'rejects malformed rate %p',
    rate => {
      expect(errors({ rate })).toEqual(['rateInvalid']);
    },
  );

  it('rejects an unknown rate mode', () => {
    expect(
      errors({
        rateMode: 'yearly' as unknown as SimpleInterestInput['rateMode'],
      }),
    ).toEqual(['rateModeInvalid']);
  });
});

describe('date validation', () => {
  it('rejects an invalid start date', () => {
    expect(errors({ startDate: '2024/13/01' })).toEqual(['startDateInvalid']);
    expect(errors({ startDate: '' })).toEqual(['startDateInvalid']);
    expect(errors({ startDate: '2024-01-01' })).toEqual(['startDateInvalid']);
  });

  it('rejects an invalid end date', () => {
    expect(errors({ endDate: '2025/01/33' })).toEqual(['endDateInvalid']);
    expect(errors({ endDate: '2025/00/10' })).toEqual(['endDateInvalid']);
    expect(errors({ endDate: '202/01/01' })).toEqual(['endDateInvalid']);
  });

  it('rejects an end date earlier than the start date', () => {
    expect(errors({ startDate: '2024/06/15', endDate: '2024/06/14' })).toEqual([
      'endBeforeStart',
    ]);
    expect(errors({ startDate: '2025/01/01', endDate: '2024/12/31' })).toEqual([
      'endBeforeStart',
    ]);
  });

  it('does not report endBeforeStart when a date is malformed', () => {
    expect(errors({ startDate: 'bad', endDate: '2020/01/01' })).toEqual([
      'startDateInvalid',
    ]);
    expect(errors({ startDate: '2025/01/01', endDate: 'bad' })).toEqual([
      'endDateInvalid',
    ]);
  });

  it('accepts neutral values that are not real calendar dates', () => {
    expect(run({ startDate: '2023/02/30', endDate: '2023/04/32' }).ok).toBe(
      true,
    );
  });
});

describe('multiple errors', () => {
  it('reports every problem in field order', () => {
    expect(
      errors({
        principal: '0',
        rate: '-1',
        startDate: 'x',
        endDate: 'y',
      }),
    ).toEqual([
      'principalNotPositive',
      'rateNegative',
      'startDateInvalid',
      'endDateInvalid',
    ]);
  });

  it('reports the date range error alongside field errors', () => {
    expect(
      errors({
        principal: 'abc',
        startDate: '2025/01/01',
        endDate: '2024/01/01',
      }),
    ).toEqual(['principalInvalid', 'endBeforeStart']);
  });

  it('never throws on unusable input', () => {
    const junk = {
      principal: undefined,
      rate: null,
      rateMode: undefined,
      startDate: 5,
      endDate: {},
    } as unknown as SimpleInterestInput;
    expect(() => calculateSimpleInterest(junk)).not.toThrow();
    const outcome = calculateSimpleInterest(junk);
    expect(outcome.ok).toBe(false);
  });
});
