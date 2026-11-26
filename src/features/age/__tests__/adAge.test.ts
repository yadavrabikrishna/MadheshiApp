import { readFileSync } from 'fs';
import { join } from 'path';

import { calculateAge, type AgeInput } from '..';
import * as date from '../../date';

// Issue #68: AD dates use the same shared calculateAge() and the same fixed
// 30-day / 12-month algorithm as BS. These are the AD-typical (Gregorian-
// looking) cases; the expected values are worked by hand with the fixed
// algorithm, never with real month lengths or leap years.

function age(startDate: string, endDate: string) {
  const outcome = calculateAge({ startDate, endDate });
  if (!outcome.ok) {
    throw new Error(`unexpected ${outcome.errors.join(',')}`);
  }
  const { years, months, days } = outcome.value;
  return [years, months, days];
}
const errors = (startDate: unknown, endDate: unknown) => {
  const outcome = calculateAge({ startDate, endDate } as AgeInput);
  return outcome.ok ? [] : outcome.errors;
};

describe('AD age: the shared fixed algorithm', () => {
  it('same date', () => {
    expect(age('2024/02/29', '2024/02/29')).toEqual([0, 0, 0]);
  });

  it('one day apart', () => {
    expect(age('2026/11/25', '2026/11/26')).toEqual([0, 0, 1]);
  });

  it('plain subtraction without borrowing', () => {
    expect(age('1990/03/05', '2026/11/25')).toEqual([36, 8, 20]);
  });

  it('day borrow adds exactly 30 (not 28, 29 or 31)', () => {
    // 10 - 20 = -10 -> 20; months 3 - 1 - 1 = 1
    expect(age('2026/01/20', '2026/03/10')).toEqual([0, 1, 20]);
    // January 31 -> March 1: 1 - 31 = -30 -> 0; months 3 - 1 - 1 = 1
    expect(age('2026/01/31', '2026/03/01')).toEqual([0, 1, 0]);
  });

  it('month borrow adds exactly 12', () => {
    // months 2 - 11 = -9 -> 3; years 2026 - 2024 - 1 = 1
    expect(age('2024/11/05', '2026/02/05')).toEqual([1, 3, 0]);
  });

  it('cascades day and month borrowing across a year boundary', () => {
    // days 5 - 28 = -23 -> 7; months 1 - 12 - 1 = -12 -> 0; years 0
    expect(age('2025/12/28', '2026/01/05')).toEqual([0, 0, 7]);
  });

  it('multi-year ranges', () => {
    // days 25 - 15 = 10; months 11 - 6 = 5; years 36
    expect(age('1990/06/15', '2026/11/25')).toEqual([36, 5, 10]);
    expect(age('1900/01/01', '2100/12/30')).toEqual([200, 11, 29]);
  });

  it('whole years and months', () => {
    expect(age('2000/02/29', '2026/02/29')).toEqual([26, 0, 0]);
    expect(age('2026/01/15', '2026/12/15')).toEqual([0, 11, 0]);
  });

  it('returns the AD dates as plain numbers, unchanged', () => {
    const outcome = calculateAge({
      startDate: '2024/02/29',
      endDate: '2026/11/25',
    });
    expect(outcome.ok && outcome.value.startDate).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
  });
});

describe('AD age: no Gregorian calendar arithmetic', () => {
  it('leap and common years give the same answer', () => {
    // February 28 -> March 1 is 3 fixed days in 2023 (common), 2024 (leap)
    // and 1900 (not leap, divisible by 100).
    for (const year of ['2023', '2024', '1900', '2000']) {
      expect(age(`${year}/02/28`, `${year}/03/01`)).toEqual([0, 0, 3]);
    }
  });

  it('every month is 30 days: 31-day and 28-day months are not special', () => {
    expect(age('2026/01/15', '2026/02/15')).toEqual([0, 1, 0]);
    expect(age('2026/02/15', '2026/03/15')).toEqual([0, 1, 0]);
    expect(age('2026/07/15', '2026/08/15')).toEqual([0, 1, 0]);
  });

  it('impossible Gregorian dates are accepted by the shared domain (the AD UI only offers 01-30)', () => {
    expect(age('2026/02/30', '2026/03/01')).toEqual([0, 0, 1]);
    expect(age('2026/04/31', '2026/05/01')).toEqual([0, 0, 0]);
    expect(age('2026/02/32', '2026/03/32')).toEqual([0, 1, 0]);
  });

  it('does not use JavaScript dates, Intl or leap-year logic', () => {
    for (const file of ['../ageCalculator.ts', '../../date/fixedDate.ts']) {
      const source = readFileSync(join(__dirname, file), 'utf8').replace(
        /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
        '',
      );
      expect(source).not.toMatch(/\bnew Date\b|\bDate\.|\bIntl\b|toLocale/);
      expect(source).not.toMatch(/leap|isLeap|% ?4\b|% ?400\b/i);
    }
  });

  it('runs the same shared functions as BS (one calculateAge, no AD variant)', () => {
    expect(Object.keys(date)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/ad|gregorian/i)]),
    );
    const bs = age('2080/01/20', '2080/03/10');
    const ad = age('2026/01/20', '2026/03/10');
    expect(ad).toEqual(bs); // same day/month difference, same answer
  });
});

describe('AD age: validation outcomes match BS', () => {
  it('shared boundaries: four-digit year, month 01-12, day 01-32', () => {
    expect(age('1900/01/01', '1900/01/01')).toEqual([0, 0, 0]);
    expect(age('2100/12/32', '2100/12/32')).toEqual([0, 0, 0]);
  });

  it.each(['2026/13/01', '2026/00/10', '2026/01/00', '2026/01/33', '26/01/01'])(
    'rejects %s without throwing',
    bad => {
      expect(errors(bad, '2026/01/01')).toEqual(['startDateInvalid']);
      expect(errors('2026/01/01', bad)).toEqual(['endDateInvalid']);
    },
  );

  it('rejects the AD separators and ISO dates; only YYYY/MM/DD is accepted', () => {
    expect(errors('2026-01-01', '2026/01/02')).toEqual(['startDateInvalid']);
    expect(errors('2026/01/01', '2026-01-02')).toEqual(['endDateInvalid']);
  });

  it('reports both invalid dates, start first', () => {
    expect(errors('', 'x')).toEqual(['startDateInvalid', 'endDateInvalid']);
  });

  it('end before start is reported by day, month and year', () => {
    expect(errors('2026/05/10', '2026/05/09')).toEqual(['endBeforeStart']);
    expect(errors('2026/05/10', '2026/04/30')).toEqual(['endBeforeStart']);
    expect(errors('2026/05/10', '2025/12/31')).toEqual(['endBeforeStart']);
  });

  it('invalid input never throws', () => {
    expect(() =>
      calculateAge({ startDate: undefined, endDate: null } as never),
    ).not.toThrow();
  });
});
