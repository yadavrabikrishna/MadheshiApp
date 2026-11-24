import {
  calculateCompoundInterest,
  calculateSimpleInterest,
  calculateWithConfiguredRate,
  isUsableRateConfig,
  normalizeConfiguredRate,
} from '..';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  type InterestRateConfig,
  type RatePeriod,
} from '../../../types/interestRateConfig';

// Every expected value is worked out by hand from the issue's table
// (monthly % = entered x factor; Rupees first becomes entered / denominator x 100).

const pct = (period: RatePeriod): InterestRateConfig => ({
  ...DEFAULT_INTEREST_RATE_CONFIG,
  rateInputMode: 'percentage',
  percentagePeriod: period,
});

const rupees = (
  period: RatePeriod,
  denominator: 'per100' | 'per1000' | { custom: string } = 'per100',
): InterestRateConfig => ({
  ...DEFAULT_INTEREST_RATE_CONFIG,
  rateInputMode: 'rupees',
  rupeesPeriod: period,
  denominatorMode: typeof denominator === 'string' ? denominator : 'custom',
  customDenominator:
    typeof denominator === 'string' ? null : denominator.custom,
});

/** The monthly percentage rate as text, rounded to 20 places for repeating values. */
function monthly(entered: string, config: InterestRateConfig, places = 20) {
  const result = normalizeConfiguredRate(entered, config);
  if (!result.ok) {
    throw new Error(`unexpected ${result.error}`);
  }
  return result.monthlyRatePercent.toDecimalPlaces(places).toString();
}

describe('Percentage mode: all six periods', () => {
  // entered 12 (a multiple of every divisor except weekly's 7)
  it.each([
    ['yearly', '1'], // 12 / 12
    ['halfYearly', '2'], // 12 / 6
    ['quarterly', '4'], // 12 / 3
    ['monthly', '12'], // as entered
    ['weekly', '51.42857142857142857143'], // 12 x 30 / 7 = 360/7
    ['daily', '360'], // 12 x 30
  ] as const)('%s: 12 -> %s', (period, expected) => {
    expect(monthly('12', pct(period))).toBe(expected);
  });

  it.each([
    ['yearly', '0.5'],
    ['halfYearly', '1'],
    ['quarterly', '2'],
    ['monthly', '6'],
    ['weekly', '25.71428571428571428571'], // 180/7
    ['daily', '180'],
  ] as const)('%s: 6 -> %s', (period, expected) => {
    expect(monthly('6', pct(period))).toBe(expected);
  });

  it('Percentage defaults to Yearly', () => {
    expect(DEFAULT_INTEREST_RATE_CONFIG.percentagePeriod).toBe('yearly');
    expect(monthly('24', DEFAULT_INTEREST_RATE_CONFIG)).toBe('2');
  });
});

describe('Rupees per amount mode: all six periods', () => {
  // Rs. 2 per Rs. 100 is 2%; Rs. 2 per Rs. 1,000 is 0.2%.
  it.each([
    ['yearly', '0.16666666666666666667'], // 2 / 12
    ['halfYearly', '0.33333333333333333333'], // 2 / 6
    ['quarterly', '0.66666666666666666667'], // 2 / 3
    ['monthly', '2'],
    ['weekly', '8.57142857142857142857'], // 2 x 30 / 7 = 60/7
    ['daily', '60'], // 2 x 30
  ] as const)('Per 100, %s: 2 -> %s', (period, expected) => {
    expect(monthly('2', rupees(period))).toBe(expected);
  });

  it.each([
    ['yearly', '0.01666666666666666667'], // 0.2 / 12
    ['halfYearly', '0.03333333333333333333'],
    ['quarterly', '0.06666666666666666667'],
    ['monthly', '0.2'],
    ['weekly', '0.85714285714285714286'], // 6/7
    ['daily', '6'],
  ] as const)('Per 1,000, %s: 2 -> %s', (period, expected) => {
    expect(monthly('2', rupees(period, 'per1000'))).toBe(expected);
  });

  it.each([
    ['yearly', '0.08333333333333333333'], // 1 / 12
    ['halfYearly', '0.16666666666666666667'],
    ['quarterly', '0.33333333333333333333'],
    ['monthly', '1'],
    ['weekly', '4.28571428571428571429'], // 30/7
    ['daily', '30'],
  ] as const)('Custom 5,000, %s: 50 -> %s', (period, expected) => {
    // 50 / 5000 x 100 = 1%
    expect(monthly('50', rupees(period, { custom: '5000' }))).toBe(expected);
  });

  it('Rupees defaults to Monthly and Per 100', () => {
    expect(DEFAULT_INTEREST_RATE_CONFIG.rupeesPeriod).toBe('monthly');
    expect(DEFAULT_INTEREST_RATE_CONFIG.denominatorMode).toBe('per100');
    expect(
      monthly('2', {
        ...DEFAULT_INTEREST_RATE_CONFIG,
        rateInputMode: 'rupees',
      }),
    ).toBe('2');
  });

  it('supports a decimal custom denominator', () => {
    // 0.25 / 12.5 x 100 = 2
    expect(monthly('0.25', rupees('monthly', { custom: '12.5' }))).toBe('2');
  });
});

describe('equivalent configurations give the same monthly rate', () => {
  it.each([
    ['yearly', '24'],
    ['halfYearly', '12'],
    ['quarterly', '6'],
    ['monthly', '2'],
  ] as const)('2%% a month, entered per %s', (period, entered) => {
    expect(monthly(entered, pct(period))).toBe('2');
    expect(monthly(entered, rupees(period))).toBe('2');
  });

  it('weekly and daily equivalents of 2% a month, exactly', () => {
    // weekly: 7 x 30/7... 14/30 per week = 2% a month; use 7 -> 30 and 7/15 -> 2
    expect(monthly('7', pct('weekly'))).toBe('30');
    expect(monthly('7', rupees('weekly'))).toBe('30');
    expect(monthly('70', rupees('weekly', 'per1000'))).toBe('30');
    expect(monthly('1', pct('daily'))).toBe('30');
    expect(monthly('10', rupees('daily', 'per1000'))).toBe('30');
    expect(monthly('250', rupees('daily', { custom: '25000' }))).toBe('30');
  });
});

describe('precision', () => {
  it('keeps zero and decimal values exact', () => {
    expect(monthly('0', pct('yearly'))).toBe('0');
    expect(monthly('0.0', rupees('weekly'))).toBe('0');
    expect(monthly('2.5', pct('monthly'))).toBe('2.5');
    expect(monthly('0.1', pct('yearly'), 30)).toBe(
      '0.008333333333333333333333333333',
    );
    expect(monthly('0.125', pct('quarterly'), 30)).toBe(
      '0.041666666666666666666666666667',
    );
  });

  it('handles large values without loss', () => {
    expect(monthly('1200000000000000000000', pct('yearly'))).toBe(
      '100000000000000000000',
    );
    expect(monthly('12345678901234567890.123456789', pct('monthly'))).toBe(
      '12345678901234567890.123456789',
    );
    // 99999999999 / 3 x 100 x 30 = 99999999999000
    expect(monthly('99999999999', rupees('daily', { custom: '3' }))).toBe(
      '99999999999000',
    );
  });

  it('is not subject to binary floating point', () => {
    // 0.1 + 0.2 style: 0.3 x 3 would be 0.8999999999999999 with doubles
    expect(monthly('0.3', pct('daily'))).toBe('9');
    expect(monthly('0.07', pct('daily'))).toBe('2.1');
  });

  it('rounds a repeating value once, at Decimal precision, never earlier', () => {
    const result = normalizeConfiguredRate('1', pct('quarterly'));
    if (!result.ok) {
      throw new Error('unexpected');
    }
    // 1 / 3 at 100 significant digits: "0." followed by one hundred 3s.
    expect(result.monthlyRatePercent.toString()).toBe(`0.${'3'.repeat(100)}`);
    // Rupees divides once too: (1 x 100) / (3 x 7)... check 2/3 and 6/7 repeating.
    const weekly = normalizeConfiguredRate('1', rupees('weekly', 'per1000'));
    if (!weekly.ok) {
      throw new Error('unexpected');
    }
    // 1 / 1000 x 100 x 30 / 7 = 3/7 = 0.428571428571...
    expect(
      weekly.monthlyRatePercent
        .toString()
        .startsWith('0.4285714285714285714285714285714285714285'),
    ).toBe(true);
  });

  it('does not round a rate that has a short exact form', () => {
    expect(
      normalizeConfiguredRate('0.0000000001', pct('monthly')).ok &&
        (
          normalizeConfiguredRate('0.0000000001', pct('monthly')) as {
            monthlyRatePercent: { toString(): string };
          }
        ).monthlyRatePercent.toString(),
    ).toBe('0.0000000001');
  });
});

describe('invalid input and configuration', () => {
  it.each([
    ['', 'rateInvalid'],
    ['abc', 'rateInvalid'],
    ['1e3', 'rateInvalid'],
    ['1,5', 'rateInvalid'],
    [' 2', 'rateInvalid'],
    ['.5', 'rateInvalid'],
    ['-1', 'rateNegative'],
    ['-0.5', 'rateNegative'],
  ] as const)('rejects the entered rate %j as %s', (entered, error) => {
    expect(normalizeConfiguredRate(entered, pct('yearly'))).toEqual({
      ok: false,
      error,
    });
    expect(normalizeConfiguredRate(entered, rupees('monthly'))).toEqual({
      ok: false,
      error,
    });
  });

  it.each([
    [
      'custom without a value',
      {
        ...rupees('monthly'),
        denominatorMode: 'custom' as const,
        customDenominator: null,
      },
    ],
    ['custom zero', rupees('monthly', { custom: '0' })],
    ['custom negative', rupees('monthly', { custom: '-5' })],
    ['custom text', rupees('monthly', { custom: 'abc' })],
    ['custom exponent', rupees('monthly', { custom: '1e3' })],
    [
      'unknown period',
      { ...rupees('monthly'), rupeesPeriod: 'hourly' as never },
    ],
    [
      'unknown mode',
      { ...DEFAULT_INTEREST_RATE_CONFIG, rateInputMode: 'basis' as never },
    ],
    [
      'unknown denominator mode',
      { ...rupees('monthly'), denominatorMode: 'per10' as never },
    ],
  ])('rejects an unusable configuration: %s', (_, config) => {
    expect(isUsableRateConfig(config)).toBe(false);
    expect(normalizeConfiguredRate('2', config)).toEqual({
      ok: false,
      error: 'rateConfigInvalid',
    });
  });

  it('a bad custom value does not matter in Percentage mode', () => {
    const config = {
      ...pct('monthly'),
      denominatorMode: 'custom' as const,
      customDenominator: null,
    };
    expect(monthly('2', config)).toBe('2');
  });

  it('reports a bad entered rate before a bad configuration', () => {
    expect(
      normalizeConfiguredRate('abc', rupees('monthly', { custom: '0' })),
    ).toEqual({ ok: false, error: 'rateInvalid' });
  });

  it('never throws on garbage configurations', () => {
    for (const config of [
      null,
      undefined,
      5,
      'x',
      [],
    ] as unknown as InterestRateConfig[]) {
      expect(normalizeConfiguredRate('2', config)).toEqual({
        ok: false,
        error: 'rateConfigInvalid',
      });
    }
  });
});

const BASE = {
  principal: '100000',
  startDate: '2025/01/01',
  endDate: '2025/12/31',
};
const ONE_YEAR = { ...BASE, endDate: '2026/01/01' };

describe('integration with the Simple Interest engine', () => {
  const simple = (
    rate: string,
    rateConfig: InterestRateConfig,
    dates = ONE_YEAR,
  ) =>
    calculateWithConfiguredRate(calculateSimpleInterest, {
      ...dates,
      rate,
      rateConfig,
    });

  function interest(outcome: ReturnType<typeof simple>) {
    if (!outcome.ok) {
      throw new Error(`unexpected ${outcome.errors.join(',')}`);
    }
    return outcome.value.interest.toString();
  }

  it('yearly 24% for one year: 100000 x 24% = 24000', () => {
    expect(interest(simple('24', pct('yearly')))).toBe('24000');
  });

  it('every equivalent configuration of 2% a month gives the same interest (12 months: 24000)', () => {
    for (const outcome of [
      simple('2', pct('monthly')),
      simple('24', pct('yearly')),
      simple('12', pct('halfYearly')),
      simple('6', pct('quarterly')),
      simple('2', rupees('monthly')),
      simple('24', rupees('yearly')),
      simple('20', rupees('monthly', 'per1000')),
      simple('50', rupees('monthly', { custom: '2500' })),
    ]) {
      expect(interest(outcome)).toBe('24000');
    }
  });

  it('weekly 7% is 30% a month: 100000 for 1 month = 30000', () => {
    const oneMonth = { ...BASE, endDate: '2025/02/01' };
    expect(interest(simple('7', pct('weekly'), oneMonth))).toBe('30000');
    expect(interest(simple('7', rupees('weekly'), oneMonth))).toBe('30000');
  });

  it('daily 1% is 30% a month; 10 days at 1% a day = 10% of 100000', () => {
    const tenDays = { ...BASE, endDate: '2025/01/11' };
    expect(interest(simple('1', pct('daily'), tenDays))).toBe('10000');
  });

  it('matches the unchanged engine given the equivalent monthly rate', () => {
    const direct = calculateSimpleInterest({
      ...ONE_YEAR,
      rate: '1.5',
      rateMode: 'percentPerMonth',
    });
    const configured = simple('18', pct('yearly'));
    if (!direct.ok || !configured.ok) {
      throw new Error('unexpected');
    }
    expect(configured.value.total.toString()).toBe(
      direct.value.total.toString(),
    );
    expect(configured.value.monthlyRate.toString()).toBe('0.015');
  });

  it('zero rate gives no interest', () => {
    expect(interest(simple('0', pct('yearly')))).toBe('0');
  });
});

describe('integration with the Compound Interest engine', () => {
  const compound = (
    rate: string,
    rateConfig: InterestRateConfig,
    endDate: string,
  ) =>
    calculateWithConfiguredRate(calculateCompoundInterest, {
      ...BASE,
      endDate,
      rate,
      rateConfig,
    });

  const total = (outcome: ReturnType<typeof compound>) => {
    if (!outcome.ok) {
      throw new Error(`unexpected ${outcome.errors.join(',')}`);
    }
    return outcome.value.total.toString();
  };

  it('yearly 24% = 2% a month: capitalised yearly, 100000 -> 124000 -> 153760', () => {
    expect(total(compound('24', pct('yearly'), '2026/01/01'))).toBe('124000');
    expect(total(compound('24', pct('yearly'), '2027/01/01'))).toBe('153760');
  });

  it('the entered period does not change the compounding frequency', () => {
    // Weekly 7% = 30% a month = 360% a year: one capitalisation per 12 months,
    // 100000 x (1 + 3.6) = 460000. Not compounded weekly or monthly.
    expect(total(compound('7', pct('weekly'), '2026/01/01'))).toBe('460000');
    // Daily 1% likewise.
    expect(total(compound('1', pct('daily'), '2026/01/01'))).toBe('460000');
  });

  it('year + partial period keeps the unchanged rules (simple on the capitalised balance)', () => {
    // 2% a month, 15 months: 124000 + 124000 x 2% x 3 = 131440
    expect(total(compound('24', pct('yearly'), '2026/04/01'))).toBe('131440');
    expect(total(compound('2', rupees('monthly'), '2026/04/01'))).toBe(
      '131440',
    );
    expect(
      total(compound('20', rupees('monthly', 'per1000'), '2026/04/01')),
    ).toBe('131440');
  });

  it('under 12 months equals Simple Interest', () => {
    const c = compound('24', pct('yearly'), '2025/07/01'); // 6 months
    const s = calculateWithConfiguredRate(calculateSimpleInterest, {
      ...BASE,
      endDate: '2025/07/01',
      rate: '24',
      rateConfig: pct('yearly'),
    });
    if (!c.ok || !s.ok) {
      throw new Error('unexpected');
    }
    expect(c.value.total.toString()).toBe(s.value.total.toString());
    expect(c.value.total.toString()).toBe('112000');
  });
});

describe('the engine contract and failures', () => {
  it('gives the engine the normalized monthly percentage rate, as percentPerMonth', () => {
    const engine = jest.fn().mockReturnValue({ ok: false, errors: [] });

    calculateWithConfiguredRate(engine, {
      ...BASE,
      rate: '12',
      rateConfig: pct('yearly'),
    });

    expect(engine).toHaveBeenCalledTimes(1);
    expect(engine).toHaveBeenCalledWith({
      principal: '100000',
      rate: '1',
      rateMode: 'percentPerMonth',
      startDate: '2025/01/01',
      endDate: '2025/12/31',
    });
  });

  it('with a bad entered rate, the engine reports it with its own code (and no result)', () => {
    for (const [entered, code] of [
      ['abc', 'rateInvalid'],
      ['-3', 'rateNegative'],
    ] as const) {
      expect(
        calculateWithConfiguredRate(calculateSimpleInterest, {
          ...BASE,
          rate: entered,
          rateConfig: pct('yearly'),
        }),
      ).toEqual({ ok: false, errors: [code] });
    }
  });

  it('never silently calculates with an unusable configuration', () => {
    const bad = rupees('monthly', { custom: '0' });
    for (const engine of [calculateSimpleInterest, calculateCompoundInterest]) {
      expect(
        calculateWithConfiguredRate(engine, {
          ...BASE,
          rate: '2',
          rateConfig: bad,
        }),
      ).toEqual({ ok: false, errors: ['rateConfigInvalid'] });
    }
  });

  it('reports every problem together, in field order', () => {
    expect(
      calculateWithConfiguredRate(calculateSimpleInterest, {
        principal: '',
        rate: '2',
        rateConfig: rupees('monthly', { custom: 'x' }),
        startDate: '2025/13/01',
        endDate: '2025/01/01',
      }),
    ).toEqual({
      ok: false,
      errors: ['principalInvalid', 'rateConfigInvalid', 'startDateInvalid'],
    });
  });

  it('reports invalid dates, principal and rate exactly as the engine does', () => {
    const input = {
      principal: '0',
      rate: 'x',
      startDate: '2025/01/02',
      endDate: '2025/01/01',
    };
    const configured = calculateWithConfiguredRate(calculateSimpleInterest, {
      ...input,
      rateConfig: pct('yearly'),
    });
    expect(configured).toEqual(
      calculateSimpleInterest({ ...input, rateMode: 'percentPerMonth' }),
    );
  });
});
