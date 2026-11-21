import {
  normalizeMonthlyRate,
  parseDecimalInput,
  RATE_ENTRY_MODES,
  type RateEntryMode,
} from '..';

describe('parseDecimalInput', () => {
  it.each(['0', '0.0', '1', '100000', '2.5', '0.0001', '007'])(
    'accepts %s',
    text => {
      const result = parseDecimalInput(text);
      expect(result.kind).toBe('ok');
    },
  );

  it('builds the value from the string without losing precision', () => {
    const result = parseDecimalInput('0.1');
    if (result.kind !== 'ok') {
      throw new Error('expected ok');
    }
    expect(result.value.plus('0.2').toString()).toBe('0.3');
  });

  it.each(['-1', '-0.5', '-0'])('reports %s as negative', text => {
    expect(parseDecimalInput(text)).toEqual({ kind: 'negative' });
  });

  it.each([
    '',
    ' ',
    'abc',
    '1e5',
    '1E5',
    '1,000',
    ' 100',
    '100 ',
    '1.',
    '.5',
    '-',
    '+5',
    '1.2.3',
    '--1',
    'NaN',
    'Infinity',
    '१२३',
    '１２３',
    '5%',
  ])('rejects %p as invalid', text => {
    expect(parseDecimalInput(text)).toEqual({ kind: 'invalid' });
  });

  it('rejects non-string input', () => {
    expect(parseDecimalInput(undefined)).toEqual({ kind: 'invalid' });
    expect(parseDecimalInput(null)).toEqual({ kind: 'invalid' });
    expect(parseDecimalInput(5)).toEqual({ kind: 'invalid' });
  });
});

describe('normalizeMonthlyRate', () => {
  it('exposes exactly the two approved rate-entry modes', () => {
    expect(RATE_ENTRY_MODES).toEqual([
      'percentPerMonth',
      'rupeesPer100PerMonth',
    ]);
  });

  it.each([
    ['1', '0.01', '1'],
    ['2', '0.02', '2'],
    ['2.5', '0.025', '2.5'],
    ['3', '0.03', '3'],
    ['0', '0', '0'],
    ['0.125', '0.00125', '0.125'],
  ])(
    'rate %s normalises to monthly fraction %s',
    (entered, fraction, percent) => {
      for (const mode of RATE_ENTRY_MODES) {
        const result = normalizeMonthlyRate(entered, mode);
        if (!result.ok) {
          throw new Error(`expected ok for ${entered} / ${mode}`);
        }
        expect(result.value.monthlyRate.toString()).toBe(fraction);
        expect(result.value.monthlyRatePercent.toString()).toBe(percent);
      }
    },
  );

  it('gives identical normalized rates in both modes', () => {
    const a = normalizeMonthlyRate('2.5', 'percentPerMonth');
    const b = normalizeMonthlyRate('2.5', 'rupeesPer100PerMonth');
    if (!a.ok || !b.ok) {
      throw new Error('expected ok');
    }
    expect(a.value.monthlyRate.equals(b.value.monthlyRate)).toBe(true);
  });

  it('accepts zero', () => {
    const result = normalizeMonthlyRate('0', 'percentPerMonth');
    expect(result.ok).toBe(true);
  });

  it.each(['-1', '-0.01'])('rejects negative %s', text => {
    expect(normalizeMonthlyRate(text, 'percentPerMonth')).toEqual({
      ok: false,
      error: 'rateNegative',
    });
  });

  it.each(['', 'abc', '1%', '1e2', '1,5', '.5', '5.'])(
    'rejects malformed %p',
    text => {
      expect(normalizeMonthlyRate(text, 'rupeesPer100PerMonth')).toEqual({
        ok: false,
        error: 'rateInvalid',
      });
    },
  );

  it('rejects an unknown mode', () => {
    expect(
      normalizeMonthlyRate('2', 'weekly' as unknown as RateEntryMode),
    ).toEqual({ ok: false, error: 'rateModeInvalid' });
  });
});
