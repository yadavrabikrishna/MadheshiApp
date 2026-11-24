import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import * as interest from '../../interest';
import {
  calculateFixedDuration,
  DAYS_PER_MONTH,
  fixedDayCount,
  isEndBeforeStart,
  MONTHS_PER_YEAR,
  parseNeutralDate,
} from '..';

const d = (text: string) => {
  const parsed = parseNeutralDate(text);
  if (!parsed) {
    throw new Error(`bad test date ${text}`);
  }
  return parsed;
};

describe('shared fixed-date module', () => {
  it('keeps the fixed scale constants', () => {
    expect([DAYS_PER_MONTH, MONTHS_PER_YEAR]).toEqual([30, 12]);
  });

  it('parses YYYY/MM/DD with month 01-12 and day 01-32 only', () => {
    expect(parseNeutralDate('2024/05/09')).toEqual({
      year: 2024,
      month: 5,
      day: 9,
    });
    expect(parseNeutralDate('0000/01/32')).toEqual({
      year: 0,
      month: 1,
      day: 32,
    });
    for (const bad of [
      '2024/00/01',
      '2024/13/01',
      '2024/01/00',
      '2024/01/33',
      '24/01/01',
      null,
      5,
    ]) {
      expect(parseNeutralDate(bad)).toBeNull();
    }
  });

  it('positions dates on the 360 / 30 scale', () => {
    expect(fixedDayCount(d('0001/01/01'))).toBe(360 + 30 + 1);
    expect(fixedDayCount(d('2080/01/31'))).toBe(fixedDayCount(d('2080/02/01')));
  });

  it('component-wise reversal differs from the fixed scale only for days 31-32', () => {
    expect(isEndBeforeStart(d('2025/01/01'), d('2024/12/31'))).toBe(true);
    expect(isEndBeforeStart(d('2020/01/32'), d('2020/02/01'))).toBe(false);
    expect(calculateFixedDuration(d('2020/01/32'), d('2020/02/01'))).toBeNull();
  });

  it.each([
    ['2025/01/01', '2025/01/01', { years: 0, months: 0, days: 0 }],
    ['2025/01/20', '2025/03/10', { years: 0, months: 1, days: 20 }],
    ['2078/11/05', '2080/02/05', { years: 1, months: 3, days: 0 }],
    ['2079/12/25', '2080/01/10', { years: 0, months: 0, days: 15 }],
    ['2080/01/32', '2080/03/01', { years: 0, months: 0, days: 29 }],
  ])('duration %s -> %s', (start, end, expected) => {
    expect(calculateFixedDuration(d(start), d(end))).toEqual(expected);
  });
});

describe('the extraction did not change what Interest exports', () => {
  it('re-exports the same functions and constants', () => {
    expect(interest.parseNeutralDate).toBe(parseNeutralDate);
    expect(interest.calculateFixedDuration).toBe(calculateFixedDuration);
    expect(interest.fixedDayCount).toBe(fixedDayCount);
    expect(interest.isEndBeforeStart).toBe(isEndBeforeStart);
    expect(interest.DAYS_PER_MONTH).toBe(30);
    expect(interest.MONTHS_PER_YEAR).toBe(12);
  });

  it('Interest gives identical durations through its own engine', () => {
    const outcome = interest.calculateSimpleInterest({
      principal: '1000',
      rate: '1',
      rateMode: 'percentPerMonth',
      startDate: '2079/12/25',
      endDate: '2080/01/10',
    });
    expect(outcome.ok && outcome.value.duration).toEqual({
      years: 0,
      months: 0,
      days: 15,
    });
  });
});

describe('feature boundaries', () => {
  const sources = (dir: string) =>
    readdirSync(join(__dirname, '..', '..', dir))
      .filter(name => name.endsWith('.ts'))
      .map(name =>
        readFileSync(join(__dirname, '..', '..', dir, name), 'utf8'),
      );

  it('Age and the shared date module never import the Interest feature', () => {
    for (const source of [...sources('age'), ...sources('date')]) {
      expect(source).not.toMatch(/from '(\.\.\/)+interest/);
    }
  });

  it('the shared date module has no imports outside itself', () => {
    for (const source of sources('date')) {
      expect(source).not.toMatch(/from '\.\.\//);
    }
  });
});
