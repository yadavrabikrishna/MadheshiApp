import {
  calculateCompoundInterest,
  calculateSimpleInterest,
  type CompoundInterestResult,
  type InterestInput,
} from '..';
import * as simpleModule from '../simpleInterest';
import { formatMoney } from '../../../utils';

// Expected values below are worked out by hand, not by the engine.
// 100000 at 2% a month: annual rate 24%, annual factor 1.24.

const BASE: InterestInput = {
  principal: '100000',
  rate: '2',
  rateMode: 'percentPerMonth',
  startDate: '2024/01/01',
  endDate: '2025/01/01',
};

function ok(overrides: Partial<InterestInput> = {}): CompoundInterestResult {
  const outcome = calculateCompoundInterest({ ...BASE, ...overrides });
  if (!outcome.ok) {
    throw new Error(`expected ok, got ${outcome.errors.join(',')}`);
  }
  return outcome.value;
}

const errors = (overrides: Partial<InterestInput> = {}) => {
  const outcome = calculateCompoundInterest({ ...BASE, ...overrides });
  if (outcome.ok) {
    throw new Error('expected errors');
  }
  return outcome.errors;
};

const range = (endDate: string, startDate = '2024/01/01') => ({
  startDate,
  endDate,
});

describe('compound calculation', () => {
  it('zero duration: no interest, no periods', () => {
    const r = ok(range('2024/01/01'));
    expect(r.interest.toString()).toBe('0');
    expect(r.total.toString()).toBe('100000');
    expect(r.completedPeriods).toBe(0);
    expect(r.remaining).toEqual({ months: 0, days: 0 });
  });

  it('under 12 months: simple interest on the original principal, 0 periods', () => {
    const r = ok(range('2024/07/01')); // 6 months
    expect(r.completedPeriods).toBe(0);
    expect(r.remaining).toEqual({ months: 6, days: 0 });
    expect(r.interest.toString()).toBe('12000'); // 100000 x 0.02 x 6
    expect(r.total.toString()).toBe('112000');
    expect(r.capitalizedBalance.toString()).toBe('100000');
  });

  it('exactly 12 months: one capitalised period, nothing remaining', () => {
    const r = ok(range('2025/01/01'));
    expect(r.completedPeriods).toBe(1);
    expect(r.remaining).toEqual({ months: 0, days: 0 });
    expect(r.total.toString()).toBe('124000');
    expect(r.interest.toString()).toBe('24000');
  });

  it('exact 24 and 36 months compound the balance each year', () => {
    expect(ok(range('2026/01/01')).total.toString()).toBe('153760'); // x1.24^2
    expect(ok(range('2027/01/01')).total.toString()).toBe('190662.4'); // x1.24^3
    expect(ok(range('2027/01/01')).completedPeriods).toBe(3);
    expect(ok(range('2027/01/01')).interest.toString()).toBe('90662.4');
  });

  it('year + partial period: simple interest on the capitalised balance, not capitalised', () => {
    const r = ok(range('2025/04/01')); // 12 months + 3 months
    expect(r.completedPeriods).toBe(1);
    expect(r.remaining).toEqual({ months: 3, days: 0 });
    expect(r.capitalizedBalance.toString()).toBe('124000');
    // 124000 x 0.02 x 3 = 7440
    expect(r.total.toString()).toBe('131440');
    expect(r.interest.toString()).toBe('31440');
  });

  it('remaining days use the 30-day month', () => {
    const r = ok(range('2025/01/11')); // 12 months + 10 days
    expect(r.remaining).toEqual({ months: 0, days: 10 });
    // 124000 + 124000 x 0.02 x 10/30 = 124000 + 826.666...
    expect(formatMoney(r.total)).toBe('1,24,826.67');
    expect(r.total.minus('124000').mul(3).toDecimalPlaces(10).toString()).toBe(
      '2480',
    );
  });

  it('two years + 1 month 15 days', () => {
    const r = ok(range('2026/02/16')); // 25 months 15 days
    expect(r.completedPeriods).toBe(2);
    expect(r.remaining).toEqual({ months: 1, days: 15 });
    // 153760 x 0.02 x 1.5 = 4612.8
    expect(r.total.toString()).toBe('158372.8');
  });

  it('day and month borrowing boundaries', () => {
    const r = ok(range('2026/02/10', '2024/11/20'));
    // days 10-20 <0 -> +30 and month-1; months <0 -> +12 and year-1
    expect(r.duration).toEqual({ years: 1, months: 2, days: 20 });
    expect(r.completedPeriods).toBe(1);
    expect(r.remaining).toEqual({ months: 2, days: 20 });
    // 124000 x 0.02 x 80/30 = 6613.333...
    expect(formatMoney(r.total)).toBe('1,30,613.33');
  });

  it('rupees-per-Rs.100 mode equals percent mode', () => {
    const a = ok({ ...range('2025/04/01'), rateMode: 'percentPerMonth' });
    const b = ok({ ...range('2025/04/01'), rateMode: 'rupeesPer100PerMonth' });
    expect(b.total.toString()).toBe(a.total.toString());
    expect(b.monthlyRate.toString()).toBe('0.02');
  });

  it('1.5% a month is 18% a year', () => {
    expect(ok({ rate: '1.5', ...range('2025/01/01') }).total.toString()).toBe(
      '118000',
    );
  });

  it('zero rate: total equals principal', () => {
    const r = ok({ rate: '0', ...range('2027/05/09') });
    expect(r.total.toString()).toBe('100000');
    expect(r.interest.toString()).toBe('0');
  });

  it('large principal and rate stay exact', () => {
    // 5% a month = 60% a year, factor 1.6; 1.6^2 = 2.56
    const r = ok({
      principal: '1000000000000',
      rate: '5',
      ...range('2026/01/01'),
    });
    expect(r.total.toString()).toBe('2560000000000');
    expect(ok({ rate: '100', ...range('2025/01/01') }).total.toString()).toBe(
      '1300000', // factor 13
    );
  });

  it('does not round before the end, and half-up rounds only the displayed amount', () => {
    // 1.25 x (1 + 0.001 x 12) = 1.265 exactly
    const r = ok({
      principal: '1.25',
      rate: '0.1',
      ...range('2025/01/01'),
    });
    expect(r.total.toString()).toBe('1.265');
    expect(formatMoney(r.total)).toBe('1.27');
    expect(r.interest.toString()).toBe('0.015');
    expect(formatMoney(r.interest)).toBe('0.02');
  });

  it('total comes from unrounded values', () => {
    // 3 decimal-place balance carried into the remainder without rounding
    const r = ok({
      principal: '1.25',
      rate: '0.1',
      ...range('2025/04/01'),
    });
    // 1.265 + 1.265 x 0.001 x 3 = 1.268795
    expect(r.total.toString()).toBe('1.268795');
  });
});

describe('validation (shared with Simple Interest)', () => {
  it('rejects reversed ranges', () => {
    expect(errors(range('2023/12/31'))).toEqual(['endBeforeStart']);
    expect(errors(range('2025/01/01', '2025/01/02'))).toEqual([
      'endBeforeStart',
    ]);
  });

  it('rejects invalid dates, principal and rate in field order', () => {
    expect(
      errors({
        principal: '0',
        rate: 'abc',
        startDate: '2024/13/01',
        endDate: 'x',
      }),
    ).toHaveLength(4);
    expect(errors({ principal: '0' })).toEqual(['principalNotPositive']);
    expect(errors({ principal: '' })).toEqual(['principalInvalid']);
  });

  it('gives exactly the errors Simple Interest gives', () => {
    for (const bad of [
      { principal: '-1' },
      { rate: '-2' },
      { startDate: '2024/00/01' },
      { endDate: '2023/01/01' },
      { principal: '', rate: '', startDate: '', endDate: '' },
    ]) {
      const input = { ...BASE, ...bad };
      expect(calculateCompoundInterest(input)).toEqual(
        calculateSimpleInterest(input),
      );
    }
  });
});

describe('relationship to Simple Interest', () => {
  it('is identical to Simple Interest below 12 months', () => {
    const input = { ...BASE, ...range('2024/10/17') };
    const c = ok(range('2024/10/17'));
    const s = calculateSimpleInterest(input);
    if (!s.ok) {
      throw new Error('simple failed');
    }
    expect(c.interest.toString()).toBe(s.value.interest.toString());
    expect(c.total.toString()).toBe(s.value.total.toString());
  });

  it('never invokes the Simple engine', () => {
    const spy = jest.spyOn(simpleModule, 'calculateSimpleInterest');
    ok(range('2026/04/01'));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('Simple Interest ignores capitalisation', () => {
    const s = calculateSimpleInterest({ ...BASE, ...range('2026/01/01') });
    if (!s.ok) {
      throw new Error('simple failed');
    }
    expect(s.value.total.toString()).toBe('148000'); // 100000 + 48000
  });
});
