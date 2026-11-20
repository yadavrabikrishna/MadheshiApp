import { CalcDecimal } from '../../features/interest';
import {
  formatMoney,
  groupDecimalString,
  groupIndianDigits,
} from '../formatMoney';

describe('groupIndianDigits', () => {
  it.each([
    ['0', '0'],
    ['999', '999'],
    ['1000', '1,000'],
    ['12345', '12,345'],
    ['100000', '1,00,000'],
    ['1234567', '12,34,567'],
    ['123456789', '12,34,56,789'],
  ])('%s -> %s', (input, expected) => {
    expect(groupIndianDigits(input)).toBe(expected);
  });
});

describe('groupDecimalString', () => {
  it('groups the integer part only and never rounds', () => {
    expect(groupDecimalString('1234567.891234')).toBe('12,34,567.891234');
    expect(groupDecimalString('100000')).toBe('1,00,000');
  });

  it('keeps a trailing dot while the user is typing', () => {
    expect(groupDecimalString('1234.')).toBe('1,234.');
  });

  it('handles empty and 0.x values', () => {
    expect(groupDecimalString('')).toBe('');
    expect(groupDecimalString('0.5')).toBe('0.5');
  });
});

describe('formatMoney', () => {
  it('rounds half-up to at most 2 decimal places', () => {
    expect(formatMoney('1.005')).toBe('1.01');
    expect(formatMoney('1.004')).toBe('1');
    expect(formatMoney('2.675')).toBe('2.68'); // would be 2.67 with binary floats
    expect(formatMoney('0.125')).toBe('0.13');
  });

  it('trims trailing zeros', () => {
    expect(formatMoney('10.50')).toBe('10.5');
    expect(formatMoney('10.00')).toBe('10');
    expect(formatMoney(new CalcDecimal('3.1000'))).toBe('3.1');
  });

  it('uses Nepal/Indian grouping', () => {
    expect(formatMoney('12345678.9')).toBe('1,23,45,678.9');
    expect(formatMoney('100000')).toBe('1,00,000');
  });

  it('never uses exponent notation for very large or small values', () => {
    expect(formatMoney('123456789012345678901234567890')).toBe(
      '1,23,45,67,89,01,23,45,67,89,01,23,45,67,890',
    );
    expect(formatMoney('0.000001')).toBe('0');
  });

  it('shows zero as 0, with no negative zero', () => {
    expect(formatMoney('0')).toBe('0');
    expect(formatMoney('-0.001')).toBe('0');
  });

  it('keeps the sign of negative amounts', () => {
    expect(formatMoney('-1234.5')).toBe('-1,234.5');
  });

  it('is exact for values a float cannot hold', () => {
    expect(formatMoney('9007199254740993.01')).toBe(
      '9,00,71,99,25,47,40,993.01',
    );
  });
});
