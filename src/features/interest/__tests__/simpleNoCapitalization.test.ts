import { calculateSimpleInterest, calculateWithConfiguredRate } from '..';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  type InterestRateConfig,
  type RatePeriod,
} from '../../../types/interestRateConfig';

// Issue #60: Simple Interest always works on the ORIGINAL principal, whatever
// period the rate was entered in. The period is only an input convention that
// the existing normalization turns into a monthly rate. Expected values are
// hand-worked: interest = principal x monthly% x months, total = principal + interest.

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

function simple(rate: string, rateConfig: InterestRateConfig, endDate: string) {
  const outcome = calculateWithConfiguredRate(calculateSimpleInterest, {
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

describe('Issue #60 examples (principal Rs. 100,000, all through normalization)', () => {
  it.each([
    ['6% monthly', '6', pct('monthly')],
    ['36% half-yearly', '36', pct('halfYearly')],
    ['72% yearly', '72', pct('yearly')],
  ] as const)('%s for 12 months -> interest 72,000', (_, rate, config) => {
    const r = simple(rate, config, '2026/01/01');
    expect(r.monthlyRatePercent.toString()).toBe('6');
    expect(r.interest.toString()).toBe('72000');
    expect(r.total.toString()).toBe('172000');
  });

  it.each([
    ['30 days', '2025/01/31', '4285.71'],
    ['14 days', '2025/01/15', '2000.00'],
    ['7 days', '2025/01/08', '1000.00'],
  ] as const)('1%% weekly for %s -> %s', (_, end, expected) => {
    const r = simple('1', pct('weekly'), end);
    expect(r.interest.toDecimalPlaces(2).toFixed(2)).toBe(expected);
  });
});

describe('every period is only an input convention (never a compounding interval)', () => {
  // Each entry is 6% a month, written in that period's terms.
  const SIX_PERCENT_A_MONTH: ReadonlyArray<[RatePeriod, string]> = [
    ['yearly', '72'],
    ['halfYearly', '36'],
    ['quarterly', '18'],
    ['monthly', '6'],
    ['weekly', '1.4'],
    ['daily', '0.2'],
  ];

  it.each(SIX_PERCENT_A_MONTH)(
    '%s: linear over 12, 24 and 90 months',
    (period, rate) => {
      // Interest grows linearly: 6000 per month on the original principal. A
      // capitalised balance would grow faster than this.
      expect(simple(rate, pct(period), '2026/01/01').interest.toString()).toBe(
        '72000',
      );
      expect(simple(rate, pct(period), '2027/01/01').interest.toString()).toBe(
        '144000',
      );
      expect(simple(rate, pct(period), '2032/07/01').interest.toString()).toBe(
        '540000',
      );
      expect(simple(rate, pct(period), '2027/01/01').total.toString()).toBe(
        '244000',
      );
    },
  );

  it.each(SIX_PERCENT_A_MONTH)(
    '%s: two halves add up to the whole',
    (period, rate) => {
      // 6 months + the next 6 months on the ORIGINAL principal = 12 months.
      const first = simple(rate, pct(period), '2025/07/01').interest;
      expect(first.toString()).toBe('36000');
      expect(first.plus(first).toString()).toBe(
        simple(rate, pct(period), '2026/01/01').interest.toString(),
      );
    },
  );

  it('Rupees mode: every period and denominator gives the same simple interest', () => {
    const cases: Array<[string, InterestRateConfig]> = [
      ['72', rupees('yearly')],
      ['36', rupees('halfYearly')],
      ['18', rupees('quarterly')],
      ['6', rupees('monthly')],
      ['1.4', rupees('weekly')],
      ['0.2', rupees('daily')],
      ['60', rupees('monthly', 'per1000')],
      ['720', rupees('yearly', 'per1000')],
      ['30', rupees('monthly', { custom: '500' })],
      ['360', rupees('halfYearly', { custom: '1000' })],
    ];
    for (const [rate, config] of cases) {
      expect(simple(rate, config, '2026/01/01').interest.toString()).toBe(
        '72000',
      );
      expect(simple(rate, config, '2027/01/01').interest.toString()).toBe(
        '144000',
      );
    }
  });

  it('partial months are prorated by days / 30 on the original principal', () => {
    // 6% a month, 1 year 2 months 15 days = 14.5 months -> 87,000
    expect(simple('72', pct('yearly'), '2026/03/16').interest.toString()).toBe(
      '87000',
    );
  });
});

describe('the engine uses the monthly rate it is given, once', () => {
  it('ignores a compounding period if one is passed', () => {
    const base = {
      principal: '100000',
      rate: '6',
      rateMode: 'percentPerMonth' as const,
      startDate: '2025/01/01',
      endDate: '2026/01/01',
    };
    const plain = calculateSimpleInterest(base);
    const withPeriod = calculateSimpleInterest({
      ...base,
      compounding: { periodDays: 1, periodRatePercent: '50' },
    });
    if (!plain.ok || !withPeriod.ok) {
      throw new Error('unexpected');
    }
    expect(withPeriod.value.interest.toString()).toBe('72000');
    expect(withPeriod.value.interest.toString()).toBe(
      plain.value.interest.toString(),
    );
    expect(withPeriod.value.total.toString()).toBe('172000');
  });

  it('does not normalize a second time: the monthly percent is echoed unchanged', () => {
    const r = simple('36', pct('halfYearly'), '2026/01/01');
    expect(r.monthlyRatePercent.toString()).toBe('6');
    expect(r.monthlyRate.toString()).toBe('0.06');
  });

  it('total is always the original principal plus interest, unrounded', () => {
    const r = simple('1', pct('weekly'), '2025/01/31');
    expect(r.total.toString()).toBe(r.principal.plus(r.interest).toString());
    expect(r.interest.toString()).not.toBe(
      r.interest.toDecimalPlaces(2).toString(),
    );
  });
});
