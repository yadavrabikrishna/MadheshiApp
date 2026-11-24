import { readFileSync } from 'fs';
import { join } from 'path';

import { fixedDayCount } from '../../date';
import { calculateAge, type AgeInput } from '..';

// Expected values are worked by hand with the approved fixed algorithm:
// days borrow exactly 30, months borrow exactly 12, nothing else.

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

describe('calculateAge: the fixed borrowing algorithm', () => {
  it('same date -> 0 years, 0 months, 0 days', () => {
    expect(age('2080/05/10', '2080/05/10')).toEqual([0, 0, 0]);
  });

  it('one day apart', () => {
    expect(age('2080/05/10', '2080/05/11')).toEqual([0, 0, 1]);
  });

  it('no borrowing: plain subtraction', () => {
    expect(age('2050/04/15', '2080/09/20')).toEqual([30, 5, 5]);
  });

  it('day borrow adds exactly 30', () => {
    // 10 - 20 = -10 -> +30 = 20; months 3 - 1 - 1 = 1
    expect(age('2080/01/20', '2080/03/10')).toEqual([0, 1, 20]);
  });

  it('month borrow adds exactly 12', () => {
    // months 2 - 11 = -9 -> +12 = 3; years 2080 - 2078 - 1 = 1
    expect(age('2078/11/05', '2080/02/05')).toEqual([1, 3, 0]);
  });

  it('cascades day and month borrowing across a year boundary', () => {
    // days 10-25 = -15 -> 15; months 1-12-1 = -12 -> 0; years 1-1 = 0
    expect(age('2079/12/25', '2080/01/10')).toEqual([0, 0, 15]);
  });

  it('a typical multi-year age', () => {
    // days 10-15 = -5 -> 25; months 3-6-1 = -4 -> 8; years 35-1 = 34
    expect(age('1990/06/15', '2025/03/10')).toEqual([34, 8, 25]);
  });

  it('exact whole years and months', () => {
    expect(age('2000/03/09', '2030/03/09')).toEqual([30, 0, 0]);
    expect(age('2080/01/01', '2081/01/01')).toEqual([1, 0, 0]);
    expect(age('2080/01/15', '2080/12/15')).toEqual([0, 11, 0]);
  });

  it('returns the parsed dates with the result', () => {
    const outcome = calculateAge({
      startDate: '2080/01/20',
      endDate: '2080/03/10',
    });
    expect(outcome.ok && outcome.value.startDate).toEqual({
      year: 2080,
      month: 1,
      day: 20,
    });
    expect(outcome.ok && outcome.value.endDate).toEqual({
      year: 2080,
      month: 3,
      day: 10,
    });
  });
});

describe('day 31 and 32 under the fixed-date convention', () => {
  it('accepts day 31 and 32 without normalizing', () => {
    expect(age('2080/01/01', '2080/01/32')).toEqual([0, 0, 31]);
    expect(age('2080/01/01', '2080/02/32')).toEqual([0, 1, 31]);
  });

  it('day 31 equals the next month day 01 on the fixed scale', () => {
    // 31 - the same position as 02/01: 1 - 31 = -30 -> 0; months 0
    expect(age('2080/01/31', '2080/02/01')).toEqual([0, 0, 0]);
  });

  it('a negative fixed-scale elapsed time is a reversed range', () => {
    // 01/32 sits one day after 02/01 on the fixed scale
    expect(errors('2080/01/32', '2080/02/01')).toEqual(['endBeforeStart']);
  });

  it('splits an otherwise negative day count into whole months', () => {
    // days 1-32 = -31 -> -1 still negative after one borrow: 29 elapsed days
    expect(age('2080/01/32', '2080/03/01')).toEqual([0, 0, 29]);
  });
});

describe('no calendar knowledge: no real month lengths or leap years', () => {
  it('February 29 and 30 are ordinary days', () => {
    expect(age('2024/02/29', '2024/03/01')).toEqual([0, 0, 2]);
    expect(age('2023/02/28', '2023/03/01')).toEqual([0, 0, 3]);
    expect(age('2080/02/32', '2080/03/32')).toEqual([0, 1, 0]);
  });

  it('every month is 30 days: the same two dates give the same answer in any year', () => {
    expect(age('2023/01/15', '2023/02/15')).toEqual([0, 1, 0]);
    expect(age('2024/01/15', '2024/02/15')).toEqual([0, 1, 0]);
    expect(age('2080/01/15', '2080/02/15')).toEqual([0, 1, 0]);
  });

  it('the elapsed total always equals the fixed-scale difference', () => {
    for (let sy = 2000; sy <= 2001; sy++) {
      for (let sm = 1; sm <= 12; sm += 5) {
        for (let sd = 1; sd <= 30; sd += 7) {
          for (let em = 1; em <= 12; em += 4) {
            for (let ed = 1; ed <= 30; ed += 9) {
              const start = `${sy}/${String(sm).padStart(2, '0')}/${String(
                sd,
              ).padStart(2, '0')}`;
              const end = `2002/${String(em).padStart(2, '0')}/${String(
                ed,
              ).padStart(2, '0')}`;
              const [y, m, d] = age(start, end);
              const outcome = calculateAge({ startDate: start, endDate: end });
              if (!outcome.ok) {
                throw new Error('unexpected');
              }
              expect(y * 360 + m * 30 + d).toBe(
                fixedDayCount(outcome.value.endDate) -
                  fixedDayCount(outcome.value.startDate),
              );
              expect(m).toBeGreaterThanOrEqual(0);
              expect(m).toBeLessThan(12);
              expect(d).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    }
  });

  it('is deterministic and does not touch its input', () => {
    const input = Object.freeze({
      startDate: '1990/06/15',
      endDate: '2025/03/10',
    });
    const first = calculateAge(input);
    const second = calculateAge(input);
    expect(second).toEqual(first);
    expect(input).toEqual({ startDate: '1990/06/15', endDate: '2025/03/10' });
  });
});

describe('validation', () => {
  it.each([
    '',
    'abc',
    '2080-05-10',
    '2080/5/10',
    '2080/05/1',
    '80/05/10',
    '20800/05/10',
    '2080/13/01',
    '2080/00/01',
    '2080/01/00',
    '2080/01/33',
    ' 2080/05/10',
    '2080/05/10 ',
    '2080/05/10/1',
    '२०८०/०५/१०',
  ])('rejects the start date %j', bad => {
    expect(errors(bad, '2080/05/10')).toEqual(['startDateInvalid']);
    expect(errors('2080/05/10', bad)).toEqual(['endDateInvalid']);
  });

  it.each([undefined, null, 20800510, {}, []])(
    'missing or non-text value %j is invalid, never a throw',
    bad => {
      expect(errors(bad, '2080/05/10')).toEqual(['startDateInvalid']);
      expect(errors('2080/05/10', bad)).toEqual(['endDateInvalid']);
    },
  );

  it('reports both invalid dates, start first', () => {
    expect(errors('', 'x')).toEqual(['startDateInvalid', 'endDateInvalid']);
    expect(calculateAge(undefined as unknown as AgeInput)).toEqual({
      ok: false,
      errors: ['startDateInvalid', 'endDateInvalid'],
    });
  });

  it('rejects a reversed range by day, month and year', () => {
    expect(errors('2080/05/10', '2080/05/09')).toEqual(['endBeforeStart']);
    expect(errors('2080/05/10', '2080/04/30')).toEqual(['endBeforeStart']);
    expect(errors('2080/05/10', '2079/12/31')).toEqual(['endBeforeStart']);
  });

  it('a reversed range is only reported when both dates are valid', () => {
    expect(errors('2080/05/10', '2079/13/01')).toEqual(['endDateInvalid']);
  });

  it('gives no result for any error', () => {
    expect(calculateAge({ startDate: '', endDate: '2080/05/10' }).ok).toBe(
      false,
    );
  });
});

describe('independence', () => {
  const read = (path: string) =>
    readFileSync(join(__dirname, '..', path), 'utf8');

  it('depends only on the shared date module', () => {
    const source = read('ageCalculator.ts');
    const imports = source.match(/from '[^']+'/g) ?? [];
    expect(imports).toEqual(["from '../date'"]);
  });
});
