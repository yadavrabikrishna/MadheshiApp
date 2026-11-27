/**
 * The land conversion service (Issue #74). Pure: no React Native, no UI.
 *
 * Reference vectors were computed independently with exact rational
 * arithmetic (Python `fractions`) from the documented factors, not with this
 * service. The factors and their sources are in `registry.ts`.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import Decimal from 'decimal.js';

import {
  MAX_INPUT_LENGTH,
  landConversionService,
  parseLandInput,
} from '../landConversionService';
import * as registry from '../registry';
import type { LandConversionGroups, TeraiLandUnit } from '../types';

// Test arithmetic uses its own high-precision clone, so expectations are exact
// and independent of the (default, 20-digit) global Decimal.
const D = Decimal.clone({ precision: 200 });

const convert = (value: string, unit: TeraiLandUnit): LandConversionGroups => {
  const outcome = landConversionService.convertTerai({ value, unit });
  if (!outcome.ok) {
    throw new Error(`unexpected ${outcome.errors.join(',')}`);
  }
  return outcome.value;
};
const errorsOf = (value: unknown, unit: TeraiLandUnit = 'bigha') => {
  const outcome = landConversionService.convertTerai({
    value: value as string,
    unit,
  });
  return outcome.ok ? [] : outcome.errors;
};
const fmt = landConversionService.formatValue;

describe('registry: documented factors', () => {
  const d = (x: string) => new D(x);

  it('Terai: 1 Bigha = 72,900 sq ft = 20 Kattha = 400 Dhur', () => {
    expect(registry.SQ_FT_PER_BIGHA).toBe('72900');
    expect(registry.KATTHA_PER_BIGHA).toBe(20);
    expect(registry.DHUR_PER_KATTHA).toBe(20);
    const kattha = d(registry.SQ_FT_PER_BIGHA).div(20);
    const dhur = kattha.div(20);
    expect(kattha.toFixed()).toBe('3645');
    expect(dhur.toFixed()).toBe('182.25');
  });

  it('Hilly: 1 Ropani = 5,476 sq ft = 16 Aana = 64 Paisa = 256 Daam, exactly', () => {
    expect(registry.SQ_FT_PER_ROPANI).toBe('5476');
    expect(registry.AANA_PER_ROPANI).toBe(16);
    expect(registry.PAISA_PER_AANA).toBe(4);
    expect(registry.DAAM_PER_PAISA).toBe(4);
    const aana = d(registry.SQ_FT_PER_ROPANI).div(16);
    const paisa = aana.div(4);
    const daam = paisa.div(4);
    expect(aana.toFixed()).toBe('342.25');
    expect(paisa.toFixed()).toBe('85.5625');
    expect(daam.toFixed()).toBe('21.390625');
    // The subunits add up to the Ropani exactly (no 342-sq-ft rounding).
    expect(aana.times(16).toFixed()).toBe('5476');
    expect(daam.times(256).toFixed()).toBe('5476');
  });

  it('SI / imperial factors are the exact ones from the issue', () => {
    expect(registry.SQ_M_PER_SQ_FT).toBe('0.09290304');
    expect(registry.SQ_M_PER_HECTARE).toBe('10000');
    expect(registry.SQ_M_PER_ACRE).toBe('4046.8564224');
    // An international acre is exactly 43,560 sq ft.
    expect(
      d(registry.SQ_M_PER_ACRE).div(registry.SQ_M_PER_SQ_FT).toFixed(),
    ).toBe('43560');
  });

  it('a Ropani is 74 ft x 74 ft', () => {
    expect(74 * 74).toBe(Number(registry.SQ_FT_PER_ROPANI));
  });
});

describe('reference vectors (independently computed)', () => {
  it('1 Bigha', () => {
    expect(convert('1', 'bigha')).toEqual({
      hilly: { ropani: '13', aana: '5', paisa: '0', daam: '0.0351' },
      terai: { bigha: '1', kattha: '0', dhur: '0' },
      other: {
        squareFeet: '72900',
        squareMetres: '6772.631616',
        hectare: '0.6772631616',
        acre: expect.stringMatching(/^1\.67355371900826446280991735537190/),
      },
    });
  });

  it('1 Kattha', () => {
    expect(convert('1', 'kattha')).toEqual({
      hilly: { ropani: '0', aana: '10', paisa: '2', daam: '2.4018' },
      terai: { bigha: '0', kattha: '1', dhur: '0' },
      other: {
        squareFeet: '3645',
        squareMetres: '338.6315808',
        hectare: '0.03386315808',
        acre: expect.stringMatching(/^0\.083677685950413223140495867768595/),
      },
    });
  });

  it('1 Dhur', () => {
    expect(convert('1', 'dhur')).toEqual({
      hilly: { ropani: '0', aana: '0', paisa: '2', daam: '0.5201' },
      terai: { bigha: '0', kattha: '0', dhur: '1' },
      other: {
        squareFeet: '182.25',
        squareMetres: '16.93157904',
        hectare: '0.001693157904',
        acre: expect.stringMatching(/^0\.004183884297520661157024793388429/),
      },
    });
  });

  it('2.5 Bigha and 0.5 Dhur (decimal input)', () => {
    expect(convert('2.5', 'bigha')).toMatchObject({
      hilly: { ropani: '33', aana: '4', paisa: '2', daam: '0.0877' },
      terai: { bigha: '2', kattha: '10', dhur: '0' },
      other: {
        squareFeet: '182250',
        squareMetres: '16931.57904',
        hectare: '1.693157904',
      },
    });
    expect(convert('0.5', 'dhur')).toMatchObject({
      hilly: { ropani: '0', aana: '0', paisa: '1', daam: '0.26' },
      terai: { bigha: '0', kattha: '0', dhur: '0.5' },
      other: {
        squareFeet: '91.125',
        squareMetres: '8.46578952',
        hectare: '0.000846578952',
      },
    });
  });

  it('1 Bigha formatted for display (4 decimals, trimmed)', () => {
    const r = convert('1', 'bigha');
    expect(fmt(r.other.squareMetres)).toBe('6772.6316');
    expect(fmt(r.other.hectare)).toBe('0.6773');
    expect(fmt(r.other.acre)).toBe('1.6736');
    expect(fmt(r.other.squareFeet)).toBe('72900');
    expect(fmt(r.hilly.daam)).toBe('0.0351');
  });
});

describe('every input unit against every output', () => {
  const UNITS: TeraiLandUnit[] = ['bigha', 'kattha', 'dhur'];
  const SQ_FT = { bigha: '72900', kattha: '3645', dhur: '182.25' };

  it.each(UNITS)(
    '1 %s: canonical area and all SI outputs derive from it',
    unit => {
      const r = convert('1', unit);
      const sqft = new D(SQ_FT[unit]);
      expect(r.other.squareFeet).toBe(sqft.toFixed());
      const sqm = sqft.times('0.09290304');
      expect(r.other.squareMetres).toBe(sqm.toFixed());
      expect(new D(r.other.hectare).toFixed()).toBe(sqm.div(10000).toFixed());
      expect(
        new D(r.other.acre).minus(sqm.div('4046.8564224')).abs().lt('1e-60'),
      ).toBe(true);
    },
  );

  it.each(UNITS)('1 %s: both decompositions add back up to the area', unit => {
    const r = convert('1', unit);
    const sqft = new D(SQ_FT[unit]);
    const hilly = new D(r.hilly.ropani)
      .times(5476)
      .plus(new D(r.hilly.aana).times('342.25'))
      .plus(new D(r.hilly.paisa).times('85.5625'))
      .plus(new D(r.hilly.daam).times('21.390625'));
    // The Daam is rounded to 4 decimals, so the difference is below 0.00005
    // Daam (= 0.00005 x 21.390625 sq ft, about 0.00107 sq ft).
    expect(hilly.minus(sqft).abs().lt('0.0011')).toBe(true);
    const terai = new D(r.terai.bigha)
      .times(72900)
      .plus(new D(r.terai.kattha).times(3645))
      .plus(new D(r.terai.dhur).times('182.25'));
    expect(terai.minus(sqft).abs().lt('0.01')).toBe(true);
  });

  it('the same area entered in different units gives the same outputs', () => {
    const a = convert('1', 'bigha');
    expect(convert('20', 'kattha')).toEqual(a);
    expect(convert('400', 'dhur')).toEqual(a);
    const k = convert('1', 'kattha');
    expect(convert('20', 'dhur')).toEqual(k);
    expect(convert('0.05', 'bigha')).toEqual(k);
  });

  it('whole inputs carry into the larger unit (Terai result)', () => {
    expect(convert('25', 'dhur').terai).toEqual({
      bigha: '0',
      kattha: '1',
      dhur: '5',
    });
    expect(convert('1.5', 'bigha').terai).toEqual({
      bigha: '1',
      kattha: '10',
      dhur: '0',
    });
    expect(convert('401', 'dhur').terai).toEqual({
      bigha: '1',
      kattha: '0',
      dhur: '1',
    });
  });

  it('exact hierarchy: 16 Aana make a Ropani, 4 Paisa an Aana, 4 Daam a Paisa', () => {
    // Each Hilly remainder stays below the next larger unit.
    // 1 Bigha = 13 Ropani 5 Aana 0 Paisa 0.0351 Daam.
    const r = convert('1', 'bigha').hilly;
    expect(Number(r.aana)).toBeLessThan(16);
    expect(Number(r.paisa)).toBeLessThan(4);
    expect(Number(r.daam)).toBeLessThan(4);
  });
});

describe('zero', () => {
  it.each(['0', '0.0', '000', '0.000'])(
    '%s gives zero for every output',
    text => {
      for (const unit of ['bigha', 'kattha', 'dhur'] as const) {
        const r = convert(text, unit);
        for (const group of [r.hilly, r.terai, r.other]) {
          for (const value of Object.values(group)) {
            expect(new D(value).isZero()).toBe(true);
          }
        }
      }
    },
  );
});

describe('validation', () => {
  it.each(['', '   ', '\t'])('blank %j is empty', text => {
    expect(errorsOf(text)).toEqual(['empty']);
  });

  it.each(['-1', '-0.5', '-0', '-1000000'])('%s is negative', text => {
    expect(errorsOf(text)).toEqual(['negative']);
  });

  it.each([
    'abc',
    '1a',
    '1.2.3',
    '1,000',
    ' 1',
    '1 ',
    '1 2',
    '.5',
    '5.',
    '.',
    '+1',
    '1e5',
    '1E5',
    '--1',
    '-',
    '- 1',
    'NaN',
    'Infinity',
    '१२',
    '0x10',
  ])('%j is malformed', text => {
    expect(errorsOf(text)).toEqual(['malformed']);
  });

  it('non-string input is malformed and never throws', () => {
    for (const bad of [undefined, null, 5, {}, []]) {
      expect(errorsOf(bad)).toEqual(['malformed']);
    }
  });

  it('rejects text longer than the supported length', () => {
    expect(errorsOf('1'.repeat(MAX_INPUT_LENGTH + 1))).toEqual(['malformed']);
    expect(errorsOf('1'.repeat(MAX_INPUT_LENGTH))).toEqual([]);
  });

  it('parseLandInput returns the exact value or the reason', () => {
    const ok = parseLandInput('2.50');
    expect(ok.ok && ok.value.toFixed()).toBe('2.5');
    expect(parseLandInput('')).toEqual({ ok: false, error: 'empty' });
    expect(parseLandInput('-2')).toEqual({ ok: false, error: 'negative' });
  });

  it('is deterministic', () => {
    expect(convert('2.5', 'kattha')).toEqual(convert('2.5', 'kattha'));
  });
});

describe('large values and precision', () => {
  it('a very large whole input stays exact in square feet and square metres', () => {
    const big = '123456789012345678901234567890';
    const r = convert(big, 'bigha');
    const sqft = new D(big).times(72900);
    expect(r.other.squareFeet).toBe(sqft.toFixed());
    expect(r.other.squareMetres).toBe(sqft.times('0.09290304').toFixed());
    expect(r.terai.bigha).toBe(big);
    expect(r.terai.kattha).toBe('0');
    expect(r.terai.dhur).toBe('0');
    expect(r.other.squareFeet).not.toMatch(/e/i);
  });

  it('a 100-digit input does not lose digits', () => {
    const big = '9'.repeat(MAX_INPUT_LENGTH);
    const r = convert(big, 'dhur');
    expect(r.other.squareFeet).toBe(new D(big).times('182.25').toFixed());
  });

  it('a tiny input keeps its precision', () => {
    const r = convert('0.0000001', 'dhur');
    expect(r.other.squareFeet).toBe('0.000018225');
    expect(r.other.squareMetres).toBe('0.000001693157904');
    // Below the 4-decimal display precision the remainder rounds to zero.
    expect(fmt(r.other.squareMetres)).toBe('0');
    expect(r.terai.dhur).toBe('0');
  });

  it('does not use JavaScript numbers: a value beyond double precision is exact', () => {
    expect(convert('9007199254740993', 'dhur').other.squareFeet).toBe(
      new D('9007199254740993').times('182.25').toFixed(),
    );
  });
});

describe('decomposition rounding and carry', () => {
  it('rounds the Daam remainder half-up to 4 decimals', () => {
    // 1 Bigha leaves 0.75 sq ft = 0.03506... Daam -> 0.0351.
    expect(convert('1', 'bigha').hilly.daam).toBe('0.0351');
    // 1 Kattha: 2.40176... -> 2.4018.
    expect(convert('1', 'kattha').hilly.daam).toBe('2.4018');
  });

  it('a Daam value that rounds up to 4 carries into the Paisa/Aana, never "4 Daam"', () => {
    // 1.87791 Dhur = 15.99995780... Daam in total: rounds to exactly 16 Daam,
    // that is 1 Aana, 0 Paisa, 0 Daam. Naive rounding would show 3 Paisa and
    // 4 Daam, which is wrong.
    expect(convert('1.87791', 'dhur').hilly).toEqual({
      ropani: '0',
      aana: '1',
      paisa: '0',
      daam: '0',
    });
  });

  it('a Dhur value that rounds up to 20 carries into the Kattha', () => {
    expect(convert('19.99996', 'dhur').terai).toEqual({
      bigha: '0',
      kattha: '1',
      dhur: '0',
    });
    // ...and a Kattha value that rounds up to 20 carries into the Bigha.
    expect(convert('399.99996', 'dhur').terai).toEqual({
      bigha: '1',
      kattha: '0',
      dhur: '0',
    });
  });

  it('just below the carry boundary does not carry', () => {
    expect(convert('19.9999', 'dhur').terai).toEqual({
      bigha: '0',
      kattha: '0',
      dhur: '19.9999',
    });
  });

  it('the smallest-unit remainder is always below its next unit', () => {
    for (const text of ['0.3', '1.7', '7.77', '123.456', '99.99999']) {
      for (const unit of ['bigha', 'kattha', 'dhur'] as const) {
        const { hilly, terai } = convert(text, unit);
        expect(Number(hilly.daam)).toBeLessThan(4);
        expect(Number(hilly.paisa)).toBeLessThan(4);
        expect(Number(hilly.aana)).toBeLessThan(16);
        expect(Number(terai.dhur)).toBeLessThan(20);
        expect(Number(terai.kattha)).toBeLessThan(20);
      }
    }
  });
});

describe('round trip', () => {
  const sqftOf = (r: LandConversionGroups) => new D(r.other.squareFeet);

  it.each([
    ['1', 'bigha'],
    ['0.37', 'kattha'],
    ['12.5', 'dhur'],
    ['1234.5678', 'bigha'],
  ] as const)(
    '%s %s -> square feet -> back to the unit is exact',
    (text, unit) => {
      const per = { bigha: '72900', kattha: '3645', dhur: '182.25' }[unit];
      const back = sqftOf(convert(text, unit)).div(per);
      expect(back.eq(text)).toBe(true);
    },
  );

  it('square feet and square metres round-trip through the exact factor', () => {
    const r = convert('3.3', 'bigha');
    const back = new D(r.other.squareMetres).div('0.09290304');
    expect(back.eq(r.other.squareFeet)).toBe(true);
    const ha = new D(r.other.hectare).times(10000);
    expect(ha.eq(r.other.squareMetres)).toBe(true);
  });

  it('the Hilly decomposition converts back to the same area (within the 4-decimal Daam)', () => {
    const r = convert('7.123', 'bigha');
    const back = new D(r.hilly.ropani)
      .times(5476)
      .plus(new D(r.hilly.aana).times('342.25'))
      .plus(new D(r.hilly.paisa).times('85.5625'))
      .plus(new D(r.hilly.daam).times('21.390625'));
    expect(back.minus(r.other.squareFeet).abs().lt('0.0011')).toBe(true);
  });
});

describe('formatValue', () => {
  it.each([
    ['72900', '72900'],
    ['0', '0'],
    ['0.00', '0'],
    ['1.5', '1.5'],
    ['1.50000', '1.5'],
    ['6772.631616', '6772.6316'],
    ['0.6772631616', '0.6773'],
    ['0.12344', '0.1234'],
    ['0.12345', '0.1235'], // half-up
    ['0.12355', '0.1236'],
    ['0.99995', '1'],
    ['1.00004', '1'],
    ['2.00005', '2.0001'],
    [
      '123456789012345678901234567890.12349',
      '123456789012345678901234567890.1235',
    ],
    ['0.00004', '0'],
    ['0.00005', '0.0001'],
  ])('%s -> %s', (input, expected) => {
    expect(fmt(input)).toBe(expected);
  });

  it('never uses exponent notation, grouping or Nepali digits', () => {
    expect(fmt('0.0000001')).toBe('0');
    expect(fmt('100000000000000000000000')).toBe('100000000000000000000000');
    expect(fmt('72900.5')).not.toMatch(/[,e०-९]/i);
  });

  it('does not change the numeric result (display only)', () => {
    const r = convert('1', 'bigha');
    const before = JSON.stringify(r);
    fmt(r.other.squareMetres);
    expect(JSON.stringify(r)).toBe(before);
  });

  it("does not change decimal.js's global configuration", () => {
    const before = { precision: Decimal.precision, rounding: Decimal.rounding };
    convert('1', 'bigha');
    fmt('1.23456');
    expect({
      precision: Decimal.precision,
      rounding: Decimal.rounding,
    }).toEqual(before);
  });
});

describe('independence from the UI', () => {
  it('the service and registry import no React Native, React or UI modules', () => {
    for (const file of ['../landConversionService.ts', '../registry.ts']) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      const imports = [...source.matchAll(/from '([^']+)'/g)].map(m => m[1]);
      for (const name of imports) {
        expect(name).toMatch(/^(decimal\.js|\.\/.*)$/);
      }
    }
  });
});
