import { fillTemplate } from '../fillTemplate';

describe('fillTemplate', () => {
  it('fills named placeholders', () => {
    expect(fillTemplate('{rate}% per month', { rate: '2.5' })).toBe(
      '2.5% per month',
    );
  });

  it('fills the same placeholder more than once and keeps word order flexible', () => {
    expect(fillTemplate('{a} / {b} / {a}', { a: 'x', b: 'y' })).toBe(
      'x / y / x',
    );
    expect(
      fillTemplate('{fraction} ({percent})', {
        percent: '2',
        fraction: '0.02',
      }),
    ).toBe('0.02 (2)');
  });

  it('leaves unknown placeholders and plain text untouched', () => {
    expect(fillTemplate('Rs. {rate} {missing}', { rate: '5' })).toBe(
      'Rs. 5 {missing}',
    );
    expect(fillTemplate('no placeholders', {})).toBe('no placeholders');
  });

  it('does not treat inherited object keys as values', () => {
    expect(fillTemplate('{toString}', {})).toBe('{toString}');
  });
});
