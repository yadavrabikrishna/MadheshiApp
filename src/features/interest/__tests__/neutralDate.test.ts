import {
  calculateFixedDuration,
  fixedDayCount,
  isEndBeforeStart,
  parseNeutralDate,
  type NeutralDate,
} from '..';

function date(text: string): NeutralDate {
  const parsed = parseNeutralDate(text);
  if (!parsed) {
    throw new Error(`test date ${text} should be valid`);
  }
  return parsed;
}

function duration(start: string, end: string) {
  return calculateFixedDuration(date(start), date(end));
}

describe('parseNeutralDate', () => {
  it('parses a YYYY/MM/DD value into numbers', () => {
    expect(parseNeutralDate('2024/05/09')).toEqual({
      year: 2024,
      month: 5,
      day: 9,
    });
  });

  it.each([
    '0001/01/01',
    '0000/01/01',
    '9999/12/32',
    '2024/12/32',
    '2024/01/31',
    '2024/02/30',
    '2023/02/29',
    '2024/04/32',
  ])('accepts %s without any calendar check', text => {
    expect(parseNeutralDate(text)).not.toBeNull();
  });

  it('accepts day 32 and month 12 boundaries', () => {
    expect(parseNeutralDate('2024/12/32')).toEqual({
      year: 2024,
      month: 12,
      day: 32,
    });
  });

  it.each([
    ['empty', ''],
    ['month 00', '2024/00/10'],
    ['month 13', '2024/13/10'],
    ['day 00', '2024/01/00'],
    ['day 33', '2024/01/33'],
    ['three-digit year', '202/01/01'],
    ['five-digit year', '20245/01/01'],
    ['one-digit month', '2024/1/01'],
    ['one-digit day', '2024/01/1'],
    ['dashes', '2024-01-01'],
    ['no separators', '20240101'],
    ['trailing space', '2024/01/01 '],
    ['leading space', ' 2024/01/01'],
    ['letters', 'abcd/ef/gh'],
    ['extra part', '2024/01/01/01'],
    ['full-width digits', '２０２４/01/01'],
    ['Nepali digits', '२०२४/०१/०१'],
    ['negative year', '-024/01/01'],
  ])('rejects %s', (_label, text) => {
    expect(parseNeutralDate(text)).toBeNull();
  });

  it('rejects non-string input', () => {
    expect(parseNeutralDate(undefined)).toBeNull();
    expect(parseNeutralDate(null)).toBeNull();
    expect(parseNeutralDate(20240101)).toBeNull();
  });
});

describe('calculateFixedDuration', () => {
  it('returns zero for the same date', () => {
    expect(duration('2024/03/15', '2024/03/15')).toEqual({
      years: 0,
      months: 0,
      days: 0,
    });
  });

  it('handles a one-day difference with no borrow', () => {
    expect(duration('2024/01/01', '2024/01/02')).toEqual({
      years: 0,
      months: 0,
      days: 1,
    });
  });

  it('borrows exactly 30 days from the month', () => {
    // days 10-15 = -5 -> +30 = 25, months 2-1-1 = 0
    expect(duration('2024/01/15', '2024/02/10')).toEqual({
      years: 0,
      months: 0,
      days: 25,
    });
  });

  it('does not use the real length of the month when borrowing days', () => {
    // Same result whether the "month" is February or a 31-day month.
    expect(duration('2024/02/28', '2024/03/05')).toEqual({
      years: 0,
      months: 0,
      days: 7,
    });
    expect(duration('2024/01/28', '2024/02/05')).toEqual({
      years: 0,
      months: 0,
      days: 7,
    });
  });

  it('borrows exactly 12 months from the year', () => {
    // months 3-5 = -2 -> +12 = 10, years 1-1 = 0
    expect(duration('2024/05/10', '2025/03/10')).toEqual({
      years: 0,
      months: 10,
      days: 0,
    });
  });

  it('cascades the day borrow into the month and year borrow', () => {
    expect(duration('2023/11/20', '2025/02/05')).toEqual({
      years: 1,
      months: 2,
      days: 15,
    });
  });

  it('handles a year boundary', () => {
    // Day 31 of December is the same position as day 01 of January.
    expect(duration('2023/12/31', '2024/01/01')).toEqual({
      years: 0,
      months: 0,
      days: 0,
    });
    expect(duration('2023/12/30', '2024/01/01')).toEqual({
      years: 0,
      months: 0,
      days: 1,
    });
    expect(duration('2023/12/01', '2024/01/01')).toEqual({
      years: 0,
      months: 1,
      days: 0,
    });
  });

  it('handles multi-year durations', () => {
    expect(duration('2000/01/01', '2024/12/31')).toEqual({
      years: 24,
      months: 11,
      days: 30,
    });
    expect(duration('1990/06/15', '2024/06/15')).toEqual({
      years: 34,
      months: 0,
      days: 0,
    });
  });

  it('accepts day 32 and handles it with the fixed arithmetic', () => {
    expect(duration('2024/01/01', '2024/01/32')).toEqual({
      years: 0,
      months: 0,
      days: 31,
    });
    expect(duration('2024/01/32', '2024/02/32')).toEqual({
      years: 0,
      months: 1,
      days: 0,
    });
  });

  it('treats day 31 of one month and day 01 of the next as the same position', () => {
    expect(duration('2024/01/31', '2024/02/01')).toEqual({
      years: 0,
      months: 0,
      days: 0,
    });
  });

  it('returns null when the end is earlier than the start', () => {
    expect(duration('2024/01/02', '2024/01/01')).toBeNull();
    expect(duration('2024/02/02', '2024/01/31')).toBeNull();
    expect(duration('2025/01/01', '2024/12/31')).toBeNull();
  });

  it('judges "earlier" on the fixed scale for days 31-32', () => {
    // Day 32 of January sits after day 01 of February in this convention.
    expect(duration('2020/01/32', '2020/02/01')).toBeNull();
    expect(duration('2020/01/32', '2020/02/02')).toEqual({
      years: 0,
      months: 0,
      days: 0,
    });
  });

  describe('negative-day fallback (start day 32, end day 01)', () => {
    it('resolves a -1 day result from the borrow steps', () => {
      // Single borrow gives 0y 1m -1d; total is 29 days.
      expect(duration('2020/01/32', '2020/03/01')).toEqual({
        years: 0,
        months: 0,
        days: 29,
      });
    });

    it('cascades across the year boundary', () => {
      expect(duration('2020/12/32', '2021/02/01')).toEqual({
        years: 0,
        months: 0,
        days: 29,
      });
      expect(duration('2020/01/32', '2021/02/01')).toEqual({
        years: 0,
        months: 11,
        days: 29,
      });
    });

    it('rejects an end that is earlier as written even if the fixed position is later', () => {
      expect(duration('2024/02/01', '2024/01/32')).toBeNull();
      expect(duration('2024/02/01', '2024/01/31')).toBeNull();
      expect(duration('2024/01/01', '2023/12/32')).toBeNull();
      expect(duration('2025/01/01', '2024/12/31')).toBeNull();
    });

    it('accepts day 31 to day 32 of the same month as one day', () => {
      expect(duration('2023/12/31', '2023/12/32')).toEqual({
        years: 0,
        months: 0,
        days: 1,
      });
    });
  });

  it('is consistent with the fixed day count for every pair (exhaustive)', () => {
    const dates: NeutralDate[] = [];
    for (const year of [2023, 2024]) {
      for (let month = 1; month <= 12; month++) {
        for (let day = 1; day <= 32; day++) {
          dates.push({ year, month, day });
        }
      }
    }
    for (const start of dates) {
      for (const end of dates) {
        const elapsed = fixedDayCount(end) - fixedDayCount(start);
        const result = calculateFixedDuration(start, end);
        if (elapsed < 0 || isEndBeforeStart(start, end)) {
          expect(result).toBeNull();
          continue;
        }
        if (!result) {
          throw new Error(`unexpected null for ${start.day} -> ${end.day}`);
        }
        const total = result.years * 360 + result.months * 30 + result.days;
        if (
          total !== elapsed ||
          result.years < 0 ||
          result.months < 0 ||
          result.months > 11 ||
          result.days < 0 ||
          result.days > 31
        ) {
          throw new Error(
            `inconsistent duration ${JSON.stringify({ start, end, result })}`,
          );
        }
      }
    }
  });
});
