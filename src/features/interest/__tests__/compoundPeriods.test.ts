import {
  calculateCompoundInterest,
  calculateSimpleInterest,
  calculateWithConfiguredRate,
} from '..';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  type InterestRateConfig,
  type RatePeriod,
} from '../../../types/interestRateConfig';

// Issue #58: the selected rate period is the compounding period. Every
// expected value is hand-worked from: balance x (1 + period rate) per
// completed period, then simple interest on that balance for the remainder
// (remainingDays / periodDays of the period rate), not capitalised.

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

function run(rate: string, rateConfig: InterestRateConfig, endDate: string) {
  const outcome = calculateWithConfiguredRate(calculateCompoundInterest, {
    principal: '100000',
    rate,
    rateConfig,
    startDate: '2025/01/01',
    endDate,
  });
  if (!outcome.ok) {
    throw new Error(`unexpected ${outcome.errors.join(',')}`);
  }
  return outcome.value;
}
const total = (...args: Parameters<typeof run>) =>
  run(...args).total.toString();
const total2 = (...args: Parameters<typeof run>) =>
  run(...args)
    .total.toDecimalPlaces(2)
    .toFixed(2);

describe('Issue #58 regression: 36% per half-year on Rs. 100,000', () => {
  it('one year: 136,000 then 184,960 (interest 84,960)', () => {
    expect(total('36', pct('halfYearly'), '2026/01/01')).toBe('184960');
    expect(run('36', pct('halfYearly'), '2026/01/01').interest.toString()).toBe(
      '84960',
    );
    expect(run('36', pct('halfYearly'), '2026/01/01').completedPeriods).toBe(2);
  });
  it('after 6 months: 136,000', () => {
    expect(total('36', pct('halfYearly'), '2025/07/01')).toBe('136000');
  });
  it('9 months: 136,000 + 136,000 x 36% x 90/180 = 160,480', () => {
    expect(total('36', pct('halfYearly'), '2025/10/01')).toBe('160480');
    const r = run('36', pct('halfYearly'), '2025/10/01');
    expect(r.completedPeriods).toBe(1);
    expect(r.capitalizedBalance.toString()).toBe('136000');
  });
});

describe('all six periods, Percentage mode', () => {
  it.each([
    // [period, rate, end date, expected total]
    ['yearly', '10', '2026/01/01', '110000'], // 360 d
    ['yearly', '10', '2027/01/01', '121000'], // 720 d
    ['yearly', '10', '2026/07/01', '115500'], // 540 d: 110000 + 110000 x 10% x 180/360
    ['halfYearly', '36', '2026/07/01', '251545.6'], // 1.36^3 = 2.515456
    ['quarterly', '10', '2025/04/01', '110000'], // 90 d
    ['quarterly', '10', '2026/01/01', '146410'], // 1.1^4
    ['quarterly', '10', '2025/05/16', '115500'], // 135 d: 110000 + 110000 x 10% x 45/90
    ['monthly', '2', '2025/02/01', '102000'], // 30 d
    ['monthly', '2', '2025/02/16', '103020'], // 45 d: 102000 + 102000 x 2% x 15/30
    ['weekly', '1', '2025/01/08', '101000'], // 7 d
    ['weekly', '1', '2025/01/15', '102010'], // 14 d
    ['daily', '1', '2025/01/02', '101000'],
    ['daily', '1', '2025/01/03', '102010'],
    ['daily', '1', '2025/01/04', '103030.1'], // 1.01^3
  ] as const)('%s %s%% to %s -> %s', (period, rate, end, expected) => {
    expect(total(rate, pct(period), end)).toBe(expected);
  });

  it('monthly 2% for a year: 1.02^12 = 126,824.18', () => {
    expect(total2('2', pct('monthly'), '2026/01/01')).toBe('126824.18');
  });

  it('repeating partial periods are only rounded for display', () => {
    // yearly 10%, 100 days: 100000 x 10% x 100/360 = 2777.777...
    expect(total2('10', pct('yearly'), '2025/04/11')).toBe('102777.78');
    // weekly 1%, 10 days: 7 d -> 101000, +3/7 of 1010
    expect(total2('1', pct('weekly'), '2025/01/11')).toBe('101432.86');
    expect(run('1', pct('weekly'), '2025/01/11').completedPeriods).toBe(1);
  });
});

describe('Rupees-per-amount mode compounds at the same selected period', () => {
  it.each([
    // 36% per half-year over one year = 184960 in every denominator
    ['Per 100', '36', rupees('halfYearly')],
    ['Per 1,000', '360', rupees('halfYearly', 'per1000')],
    ['Custom 500', '180', rupees('halfYearly', { custom: '500' })],
    ['Custom 12.5', '4.5', rupees('halfYearly', { custom: '12.5' })],
  ] as const)('half-yearly, %s', (_, entered, config) => {
    expect(total(entered, config, '2026/01/01')).toBe('184960');
    expect(total(entered, config, '2025/10/01')).toBe('160480');
  });

  it.each([
    ['yearly', '10', '110000', '2026/01/01'],
    ['quarterly', '10', '146410', '2026/01/01'],
    ['monthly', '2', '102000', '2025/02/01'],
    ['weekly', '1', '102010', '2025/01/15'],
    ['daily', '1', '103030.1', '2025/01/04'],
  ] as const)(
    '%s, equals Percentage at every denominator',
    (period, rate, expected, end) => {
      const per1000 = String(Number(rate) * 10);
      expect(total(rate, rupees(period), end)).toBe(expected);
      expect(total(per1000, rupees(period, 'per1000'), end)).toBe(expected);
      expect(
        total(String(Number(rate) * 5), rupees(period, { custom: '500' }), end),
      ).toBe(expected);
      expect(total(rate, pct(period), end)).toBe(expected);
    },
  );
});

describe('boundaries and short durations', () => {
  it('an exact boundary leaves no partial period', () => {
    const r = run('36', pct('halfYearly'), '2025/07/01');
    expect(r.completedPeriods).toBe(1);
    expect(r.remaining).toEqual({ months: 0, days: 0 });
    expect(r.interest.toString()).toBe('36000');
  });

  it('one day short of a period capitalises nothing', () => {
    // 179 days: 100000 x 36% x 179/180 = 35800
    const r = run('36', pct('halfYearly'), '2025/06/30');
    expect(r.completedPeriods).toBe(0);
    expect(r.capitalizedBalance.toString()).toBe('100000');
    expect(r.interest.toString()).toBe('35800');
  });

  it('shorter than one period equals Simple Interest on the same period rate', () => {
    // yearly 12% for 3 months = simple 1% a month x 3
    const compound = run('12', pct('yearly'), '2025/04/01');
    const simple = calculateSimpleInterest({
      principal: '100000',
      rate: '1',
      rateMode: 'percentPerMonth',
      startDate: '2025/01/01',
      endDate: '2025/04/01',
    });
    if (!simple.ok) {
      throw new Error('unexpected');
    }
    expect(compound.total.toString()).toBe(simple.value.total.toString());
    expect(compound.total.toString()).toBe('103000');
  });

  it('zero duration returns the principal; zero rate earns nothing', () => {
    expect(total('36', pct('halfYearly'), '2025/01/01')).toBe('100000');
    expect(run('36', pct('halfYearly'), '2025/01/01').completedPeriods).toBe(0);
    expect(total('0', pct('daily'), '2027/01/01')).toBe('100000');
    expect(total('0', rupees('weekly', 'per1000'), '2027/01/01')).toBe(
      '100000',
    );
  });

  it('remaining time is reported in months and days', () => {
    // quarterly, 135 days: 1 period + 45 days
    const r = run('10', pct('quarterly'), '2025/05/16');
    expect(r.periodDays).toBe(90);
    expect(r.remaining).toEqual({ months: 1, days: 15 });
  });
});

describe('long durations and precision', () => {
  it('daily over ten years stays finite and exact to display precision', () => {
    // 3600 days at 0.01%: 100000 x 1.0001^3600 (checked independently)
    const t = total2('0.01', pct('daily'), '2035/01/01');
    expect(t).toBe('143330.36');
  });

  it('nothing is rounded before the final amount', () => {
    const r = run('1', pct('weekly'), '2025/01/11');
    expect(r.total.toString()).not.toBe(r.total.toDecimalPlaces(2).toString());
  });
});

describe('contracts that must not change', () => {
  it('without a compounding period the engine compounds yearly from the monthly rate', () => {
    const direct = calculateCompoundInterest({
      principal: '100000',
      rate: '2',
      rateMode: 'percentPerMonth',
      startDate: '2025/01/01',
      endDate: '2026/04/01',
    });
    if (!direct.ok) {
      throw new Error('unexpected');
    }
    expect(direct.value.total.toString()).toBe('131440');
    expect(direct.value.periodDays).toBe(360);
  });

  it('Simple Interest ignores the selected period beyond the monthly rate', () => {
    const results = [
      calculateWithConfiguredRate(calculateSimpleInterest, {
        principal: '100000',
        rate: '24',
        rateConfig: pct('yearly'),
        startDate: '2025/01/01',
        endDate: '2026/04/01',
      }),
      calculateWithConfiguredRate(calculateSimpleInterest, {
        principal: '100000',
        rate: '12',
        rateConfig: pct('halfYearly'),
        startDate: '2025/01/01',
        endDate: '2026/04/01',
      }),
    ];
    for (const r of results) {
      if (!r.ok) {
        throw new Error('unexpected');
      }
      // 2% a month x 15 months
      expect(r.value.total.toString()).toBe('130000');
    }
  });

  it('an unusable configuration still never calculates', () => {
    expect(
      calculateWithConfiguredRate(calculateCompoundInterest, {
        principal: '100000',
        rate: '2',
        rateConfig: rupees('monthly', { custom: '0' }),
        startDate: '2025/01/01',
        endDate: '2026/01/01',
      }),
    ).toEqual({ ok: false, errors: ['rateConfigInvalid'] });
  });
});
