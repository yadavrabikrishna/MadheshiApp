import {
  DEFAULT_INTEREST_RATE_CONFIG,
  DEFAULT_INTEREST_RATE_CONFIGS,
  RATE_PERIODS,
  parseCustomDenominator,
  resolveDenominator,
  restoreInterestRateConfig,
  selectedRatePeriod,
  updateInterestRateConfig,
  validateCustomDenominatorText,
  type InterestRateConfig,
  type InterestRateConfigPatch,
} from '../interestRateConfig';

function apply(config: InterestRateConfig, patch: InterestRateConfigPatch) {
  const update = updateInterestRateConfig(config, patch);
  if (!update.ok) {
    throw new Error(`unexpected error ${update.error}`);
  }
  return update.config;
}

const D = DEFAULT_INTEREST_RATE_CONFIG;

describe('defaults and options', () => {
  it('has the specified defaults for both calculators', () => {
    expect(D).toEqual({
      rateInputMode: 'percentage',
      percentagePeriod: 'yearly',
      rupeesPeriod: 'monthly',
      denominatorMode: 'per100',
      customDenominator: null,
    });
    expect(DEFAULT_INTEREST_RATE_CONFIGS.simple).toEqual(D);
    expect(DEFAULT_INTEREST_RATE_CONFIGS.compound).toEqual(D);
  });

  it('offers exactly the six periods', () => {
    expect([...RATE_PERIODS]).toEqual([
      'yearly',
      'halfYearly',
      'quarterly',
      'monthly',
      'weekly',
      'daily',
    ]);
  });

  it('uses Yearly for Percentage and Monthly for Rupees', () => {
    expect(selectedRatePeriod(D)).toBe('yearly');
    expect(selectedRatePeriod({ ...D, rateInputMode: 'rupees' })).toBe(
      'monthly',
    );
  });
});

describe('mode and period switching', () => {
  it('accepts every period in both modes', () => {
    for (const mode of ['percentage', 'rupees'] as const) {
      for (const period of RATE_PERIODS) {
        const config = apply(D, { rateInputMode: mode, period });
        expect(selectedRatePeriod(config)).toBe(period);
      }
    }
  });

  it('keeps a separate period per mode and restores it when switching back', () => {
    let config = apply(D, { period: 'quarterly' }); // Percentage
    config = apply(config, { rateInputMode: 'rupees' });
    expect(selectedRatePeriod(config)).toBe('monthly'); // never customised
    config = apply(config, { period: 'weekly' });
    config = apply(config, { rateInputMode: 'percentage' });
    expect(selectedRatePeriod(config)).toBe('quarterly');
    config = apply(config, { rateInputMode: 'rupees' });
    expect(selectedRatePeriod(config)).toBe('weekly');
  });

  it('can set the period of the other mode without switching to it', () => {
    const config = apply(D, { period: 'daily', forMode: 'rupees' });
    expect(config.rateInputMode).toBe('percentage');
    expect(config.percentagePeriod).toBe('yearly');
    expect(config.rupeesPeriod).toBe('daily');
  });

  it('rejects an unknown mode or period and changes nothing', () => {
    expect(updateInterestRateConfig(D, { period: 'hourly' as never })).toEqual({
      ok: false,
      error: 'invalidPeriod',
    });
    expect(
      updateInterestRateConfig(D, { rateInputMode: 'basis' as never }),
    ).toEqual({ ok: false, error: 'invalidRateInputMode' });
    expect(
      updateInterestRateConfig(D, { denominatorMode: 'per10' as never }),
    ).toEqual({ ok: false, error: 'invalidDenominatorMode' });
    expect(
      updateInterestRateConfig(D, { period: 'daily', forMode: 'x' as never }),
    ).toEqual({ ok: false, error: 'invalidRateInputMode' });
  });

  it('does not mutate the configuration it is given', () => {
    const before = { ...D };
    apply(D, { rateInputMode: 'rupees', period: 'daily' });
    expect(D).toEqual(before);
  });
});

describe('denominator', () => {
  it('resolves Per 100 and Per 1,000', () => {
    expect(resolveDenominator(D)).toBe('100');
    expect(resolveDenominator({ ...D, denominatorMode: 'per1000' })).toBe(
      '1000',
    );
  });

  it('uses the saved custom value in Custom mode', () => {
    const config = apply(D, {
      customDenominator: '250',
      denominatorMode: 'custom',
    });
    expect(resolveDenominator(config)).toBe('250');
  });

  it('preserves the custom value when switching denominator modes', () => {
    let config = apply(D, {
      customDenominator: ' 12.5 ',
      denominatorMode: 'custom',
    });
    expect(config.customDenominator).toBe('12.5'); // trimmed
    config = apply(config, { denominatorMode: 'per1000' });
    expect(config.customDenominator).toBe('12.5');
    config = apply(config, { denominatorMode: 'per100' });
    config = apply(config, { denominatorMode: 'custom' });
    expect(resolveDenominator(config)).toBe('12.5');
  });

  it('can store a custom value while another mode is selected', () => {
    const config = apply(D, { customDenominator: '500' });
    expect(config.denominatorMode).toBe('per100');
    expect(config.customDenominator).toBe('500');
  });

  it('requires a valid custom value before Custom can be selected', () => {
    expect(updateInterestRateConfig(D, { denominatorMode: 'custom' })).toEqual({
      ok: false,
      error: 'customDenominatorRequired',
    });
  });

  it.each([
    '',
    '  ',
    '0',
    '0.0',
    '00',
    '-5',
    '+5',
    '1e3',
    'abc',
    '1,000',
    '1 0',
    '.5',
    '5.',
    '1'.repeat(19),
    'Infinity',
    'NaN',
  ])('rejects the custom denominator %j', value => {
    expect(parseCustomDenominator(value)).toBeNull();
    expect(updateInterestRateConfig(D, { customDenominator: value })).toEqual({
      ok: false,
      error: 'invalidCustomDenominator',
    });
  });

  it.each([
    ['1', '1'],
    ['0.5', '0.5'],
    ['250', '250'],
    [' 7.25 ', '7.25'],
    ['0.001', '0.001'],
    ['1'.repeat(18), '1'.repeat(18)],
  ])('accepts the custom denominator %j', (value, expected) => {
    expect(parseCustomDenominator(value)).toBe(expected);
  });

  it('rejects non-strings', () => {
    for (const value of [100, null, undefined, {}, true]) {
      expect(parseCustomDenominator(value)).toBeNull();
    }
  });

  it('an invalid custom value does not discard the saved one', () => {
    const config = apply(D, { customDenominator: '250' });
    expect(
      updateInterestRateConfig(config, { customDenominator: 'oops' }).ok,
    ).toBe(false);
    expect(config.customDenominator).toBe('250');
  });

  it('is all-or-nothing: a patch with one bad field applies none of it', () => {
    expect(
      updateInterestRateConfig(D, {
        rateInputMode: 'rupees',
        customDenominator: 'bad',
      }).ok,
    ).toBe(false);
  });
});

describe('restoring saved data', () => {
  it('returns the defaults for missing or non-object data', () => {
    for (const value of [undefined, null, 5, 'x', [], true]) {
      expect(restoreInterestRateConfig(value)).toEqual(D);
    }
  });

  it('round-trips a valid configuration', () => {
    const config: InterestRateConfig = {
      rateInputMode: 'rupees',
      percentagePeriod: 'halfYearly',
      rupeesPeriod: 'daily',
      denominatorMode: 'custom',
      customDenominator: '12.5',
    };
    expect(
      restoreInterestRateConfig(JSON.parse(JSON.stringify(config))),
    ).toEqual(config);
  });

  it('repairs each invalid field on its own and keeps the valid ones', () => {
    expect(
      restoreInterestRateConfig({
        rateInputMode: 'rupees',
        percentagePeriod: 'fortnightly',
        rupeesPeriod: 'weekly',
        denominatorMode: 'per1000',
        customDenominator: -3,
      }),
    ).toEqual({
      rateInputMode: 'rupees',
      percentagePeriod: 'yearly',
      rupeesPeriod: 'weekly',
      denominatorMode: 'per1000',
      customDenominator: null,
    });
  });

  it('falls back to Per 100 for Custom without a usable value', () => {
    for (const customDenominator of [undefined, '0', 'abc', 7]) {
      expect(
        restoreInterestRateConfig({
          denominatorMode: 'custom',
          customDenominator,
        }).denominatorMode,
      ).toBe('per100');
    }
  });

  it('keeps Custom when its value is valid', () => {
    const config = restoreInterestRateConfig({
      denominatorMode: 'custom',
      customDenominator: '40',
    });
    expect(config.denominatorMode).toBe('custom');
    expect(resolveDenominator(config)).toBe('40');
  });

  it('keeps a valid custom value while another mode is selected', () => {
    expect(
      restoreInterestRateConfig({
        denominatorMode: 'per100',
        customDenominator: '40',
      }).customDenominator,
    ).toBe('40');
  });

  it('ignores unknown extra fields', () => {
    expect(restoreInterestRateConfig({ ...D, legacy: 1 })).toEqual(D);
  });

  it('always yields a valid configuration for arbitrary garbage', () => {
    const garbage = [
      { rateInputMode: 1, percentagePeriod: {}, denominatorMode: [] },
      { customDenominator: 'NaN', denominatorMode: 'custom' },
      { rupeesPeriod: null },
    ];
    for (const value of garbage) {
      const config = restoreInterestRateConfig(value);
      expect(resolveDenominator(config)).not.toBeNull();
      expect(RATE_PERIODS).toContain(selectedRatePeriod(config));
    }
  });
});

describe('validateCustomDenominatorText', () => {
  it.each(['', '   '])('reports %j as empty', text => {
    expect(validateCustomDenominatorText(text)).toBe('empty');
  });

  it.each([
    'abc',
    '1e3',
    '1,000',
    '.5',
    '5.',
    '+5',
    '1 0',
    'NaN',
    '1'.repeat(19),
  ])('reports %j as not a number', text => {
    expect(validateCustomDenominatorText(text)).toBe('notNumber');
  });

  it.each(['0', '0.0', '-1', '-0.5', '-0'])(
    'reports %j as not positive',
    text => {
      expect(validateCustomDenominatorText(text)).toBe('notPositive');
    },
  );

  it.each(['1', '250', '12.5', ' 7 ', '0.001'])('accepts %j', text => {
    expect(validateCustomDenominatorText(text)).toBeNull();
  });

  it('agrees with parseCustomDenominator', () => {
    for (const text of ['', 'x', '0', '-3', '5', '2.5', '.5', '1e2']) {
      expect(validateCustomDenominatorText(text) === null).toBe(
        parseCustomDenominator(text) !== null,
      );
    }
  });
});
