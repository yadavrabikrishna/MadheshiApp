import {
  calculateCompoundInterest,
  calculateFixedDuration,
  calculateSimpleInterest,
  directDurationToDates,
  normalizeDirectDuration,
  parseNeutralDate,
} from '..';

const text = (years: string, months: string, days: string) => ({
  years,
  months,
  days,
});
const normalized = (years: string, months: string, days: string) => {
  const r = normalizeDirectDuration(text(years, months, days));
  if (!r.ok) {
    throw new Error(`unexpected ${r.error}`);
  }
  return r.duration;
};

describe('normalizeDirectDuration', () => {
  it.each([
    ['0', '15', '0', { years: 1, months: 3, days: 0 }], // 15 months
    ['0', '0', '45', { years: 0, months: 1, days: 15 }], // 45 days
    ['1', '15', '45', { years: 2, months: 4, days: 15 }], // 855 days (the issue text says 3 years; its own formula gives 2)
    ['0', '12', '0', { years: 1, months: 0, days: 0 }],
    ['0', '0', '360', { years: 1, months: 0, days: 0 }],
    ['0', '0', '359', { years: 0, months: 11, days: 29 }],
    ['0', '0', '29', { years: 0, months: 0, days: 29 }],
    ['0', '0', '30', { years: 0, months: 1, days: 0 }],
    ['2', '0', '0', { years: 2, months: 0, days: 0 }],
    ['', '', '7', { years: 0, months: 0, days: 7 }], // blank = 0
  ] as const)('%s y %s m %s d -> %j', (y, m, d, expected) => {
    expect(normalized(y, m, d)).toEqual(expected);
  });

  it('reports the total in days (years x 360 + months x 30 + days)', () => {
    const r = normalizeDirectDuration(text('1', '15', '45'));
    expect(r.ok && r.totalDays).toBe(360 + 450 + 45);
  });

  it('accepts Devanagari digits', () => {
    expect(normalized('०', '१५', '०')).toEqual({
      years: 1,
      months: 3,
      days: 0,
    });
  });

  it.each([
    ['0', '0', '0'],
    ['', '', ''],
    ['00', '000', '0'],
  ])('rejects a zero total (%j, %j, %j)', (y, m, d) => {
    expect(normalizeDirectDuration(text(y, m, d))).toEqual({
      ok: false,
      error: 'durationZero',
    });
  });

  it.each([
    ['-1', '0', '0'],
    ['0', '1.5', '0'],
    ['0', '0', 'abc'],
    ['1e2', '0', '0'],
    [' 1', '0', '0'],
    ['+1', '0', '0'],
    ['1,0', '0', '0'],
  ])('rejects invalid input (%j, %j, %j)', (y, m, d) => {
    expect(normalizeDirectDuration(text(y, m, d))).toEqual({
      ok: false,
      error: 'durationInvalid',
    });
  });

  it('rejects a duration longer than a neutral date can hold', () => {
    expect(normalizeDirectDuration(text('10000', '0', '0'))).toEqual({
      ok: false,
      error: 'durationTooLong',
    });
    expect(normalizeDirectDuration(text('0', '0', '3600000'))).toEqual({
      ok: false,
      error: 'durationTooLong',
    });
    expect(normalized('9999', '11', '29')).toEqual({
      years: 9999,
      months: 11,
      days: 29,
    });
  });
});

describe('directDurationToDates: reuses the existing duration path', () => {
  it.each([
    [{ years: 1, months: 3, days: 0 }, '0001/04/01'],
    [{ years: 0, months: 1, days: 15 }, '0000/02/16'],
    [{ years: 2, months: 4, days: 15 }, '0002/05/16'],
    [{ years: 9999, months: 11, days: 29 }, '9999/12/30'],
  ])('%j -> end %s', (duration, end) => {
    const dates = directDurationToDates(duration);
    expect(dates).toEqual({ startDate: '0000/01/01', endDate: end });
    const start = parseNeutralDate(dates.startDate);
    const finish = parseNeutralDate(dates.endDate);
    expect(start && finish && calculateFixedDuration(start, finish)).toEqual(
      duration,
    );
  });

  it('gives the same result as the equivalent date range, in both engines', () => {
    // 1 year, 15 months, 45 days = 855 days = 2 years, 4 months, 15 days.
    const { startDate, endDate } = directDurationToDates(
      normalized('1', '15', '45'),
    );
    const direct = {
      principal: '100000',
      rate: '2',
      rateMode: 'percentPerMonth',
    } as const;
    for (const engine of [calculateSimpleInterest, calculateCompoundInterest]) {
      const viaDuration = engine({ ...direct, startDate, endDate });
      const viaDates = engine({
        ...direct,
        startDate: '2025/01/01',
        endDate: '2027/05/16',
      });
      if (!viaDuration.ok || !viaDates.ok) {
        throw new Error('unexpected');
      }
      expect(viaDuration.value.interest.toString()).toBe(
        viaDates.value.interest.toString(),
      );
      expect(viaDuration.value.total.toString()).toBe(
        viaDates.value.total.toString(),
      );
    }
  });
});
