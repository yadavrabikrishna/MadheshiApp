/**
 * The generic land conversion API (Issue #76): both unit families through one
 * path. Pure: no React Native, no UI.
 *
 * Hill / Mountain reference vectors were computed independently with exact
 * rational arithmetic (Python `fractions`) from the documented factors
 * (1 Ropani = 5,476 sq ft, 16 Aana, 64 Paisa, 256 Daam), not with the service.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import Decimal from 'decimal.js';

import {
  MAX_INPUT_LENGTH,
  landConversionService,
} from '../landConversionService';
import {
  HILL_LAND_UNITS,
  LAND_FAMILY_UNITS,
  TERAI_LAND_UNITS,
  type LandConversionGroups,
  type LandUnit,
} from '../types';

const D = Decimal.clone({ precision: 200 });
const svc = landConversionService;

const convert = (value: string, unit: LandUnit): LandConversionGroups => {
  const outcome = svc.convert({ value, unit });
  if (!outcome.ok) {
    throw new Error(`unexpected ${outcome.errors.join(',')}`);
  }
  return outcome.value;
};
const hillMixed = (ropani: string, aana: string, paisa: string, daam: string) =>
  svc.convertMixed('hill', { ropani, aana, paisa, daam });
const terai = (bigha: string, kattha: string, dhur: string) =>
  svc.convertMixed('terai', { bigha, kattha, dhur });
const ok = <T extends { ok: boolean }>(outcome: T) => {
  if (!outcome.ok) {
    throw new Error(`unexpected ${JSON.stringify(outcome)}`);
  }
  return (outcome as unknown as { value: LandConversionGroups }).value;
};
const errorsOf = (value: unknown, unit: LandUnit) => {
  const outcome = svc.convert({ value: value as string, unit });
  return outcome.ok ? [] : outcome.errors;
};

describe('unit families', () => {
  it('lists the units of each family, largest first', () => {
    expect(TERAI_LAND_UNITS).toEqual(['bigha', 'kattha', 'dhur']);
    expect(HILL_LAND_UNITS).toEqual(['ropani', 'aana', 'paisa', 'daam']);
    expect(LAND_FAMILY_UNITS).toEqual({
      terai: TERAI_LAND_UNITS,
      hill: HILL_LAND_UNITS,
    });
  });
});

describe('Hill / Mountain single unit (independently computed vectors)', () => {
  it('1 Ropani', () => {
    expect(convert('1', 'ropani')).toEqual({
      hilly: { ropani: '1', aana: '0', paisa: '0', daam: '0' },
      terai: { bigha: '0', kattha: '1', dhur: '10.0466' },
      other: {
        squareFeet: '5476',
        squareMetres: '508.73704704',
        hectare: '0.050873704704',
        acre: expect.stringMatching(/^0\.12571166207529843893480257116620752/),
      },
    });
  });

  it('1 Aana', () => {
    expect(convert('1', 'aana')).toEqual({
      hilly: { ropani: '0', aana: '1', paisa: '0', daam: '0' },
      terai: { bigha: '0', kattha: '0', dhur: '1.8779' },
      other: {
        squareFeet: '342.25',
        squareMetres: '31.79606544',
        hectare: '0.003179606544',
        acre: expect.stringMatching(/^0\.0078569788797061524334251606978879/),
      },
    });
  });

  it('1 Paisa', () => {
    expect(convert('1', 'paisa')).toEqual({
      hilly: { ropani: '0', aana: '0', paisa: '1', daam: '0' },
      terai: { bigha: '0', kattha: '0', dhur: '0.4695' },
      other: {
        squareFeet: '85.5625',
        squareMetres: '7.94901636',
        hectare: '0.000794901636',
        acre: expect.stringMatching(/^0\.0019642447199265381083562901744719/),
      },
    });
  });

  it('1 Daam', () => {
    expect(convert('1', 'daam')).toEqual({
      hilly: { ropani: '0', aana: '0', paisa: '0', daam: '1' },
      terai: { bigha: '0', kattha: '0', dhur: '0.1174' },
      other: {
        squareFeet: '21.390625',
        squareMetres: '1.98725409',
        hectare: '0.000198725409',
        acre: expect.stringMatching(/^0\.00049106117998163452708907254361799/),
      },
    });
  });

  it('decimals: 0.5 Ropani and 1.5 Aana', () => {
    expect(convert('0.5', 'ropani')).toMatchObject({
      hilly: { ropani: '0', aana: '8', paisa: '0', daam: '0' },
      terai: { bigha: '0', kattha: '0', dhur: '15.0233' },
      other: { squareFeet: '2738', squareMetres: '254.36852352' },
    });
    expect(convert('1.5', 'aana')).toMatchObject({
      hilly: { ropani: '0', aana: '1', paisa: '2', daam: '0' },
      terai: { bigha: '0', kattha: '0', dhur: '2.8169' },
      other: { squareFeet: '513.375', squareMetres: '47.69409816' },
    });
  });

  it('carries across Hilly units: 16 Aana is a Ropani, 4 Paisa an Aana, 4 Daam a Paisa', () => {
    expect(convert('16', 'aana').hilly).toEqual(convert('1', 'ropani').hilly);
    expect(convert('4', 'paisa').hilly).toEqual(convert('1', 'aana').hilly);
    expect(convert('4', 'daam').hilly).toEqual(convert('1', 'paisa').hilly);
    expect(convert('256', 'daam')).toEqual(convert('1', 'ropani'));
    expect(convert('64', 'paisa')).toEqual(convert('1', 'ropani'));
    expect(convert('17', 'aana').hilly).toEqual({
      ropani: '1',
      aana: '1',
      paisa: '0',
      daam: '0',
    });
  });

  it('1 Ropani in Terai terms agrees with 5,476 sq ft / 182.25', () => {
    const dhur = new D(5476).div('182.25'); // 30.0466...
    const r = convert('1', 'ropani').terai;
    expect(new D(r.kattha).times(20).plus(r.dhur).toFixed(4)).toBe(
      dhur.toFixed(4),
    );
  });
});

describe('Terai through the generic API (existing vectors stay valid)', () => {
  it('1 Bigha matches the established reference', () => {
    expect(convert('1', 'bigha')).toMatchObject({
      hilly: { ropani: '13', aana: '5', paisa: '0', daam: '0.0351' },
      terai: { bigha: '1', kattha: '0', dhur: '0' },
      other: { squareFeet: '72900', squareMetres: '6772.631616' },
    });
  });

  it('1 Bigha, 4 Kattha, 10 Dhur (mixed) matches the established reference', () => {
    expect(ok(terai('1', '4', '10'))).toMatchObject({
      terai: { bigha: '1', kattha: '4', dhur: '10' },
      hilly: { ropani: '16', aana: '4', paisa: '3', daam: '2.843' },
      other: { squareFeet: '89302.5', squareMetres: '8296.4737296' },
    });
  });
});

describe('mixed units: Hill / Mountain', () => {
  it('2 Ropani, 3 Aana, 1 Paisa, 2 Daam (independently computed)', () => {
    // 2 x 5,476 + 3 x 342.25 + 85.5625 + 2 x 21.390625 = 12,107.09375 sq ft
    expect(ok(hillMixed('2', '3', '1', '2'))).toMatchObject({
      hilly: { ropani: '2', aana: '3', paisa: '1', daam: '2' },
      terai: { bigha: '0', kattha: '3', dhur: '6.4312' },
      other: {
        squareFeet: '12107.09375',
        squareMetres: '1124.78581494',
        hectare: '0.112478581494',
        acre: expect.stringMatching(/^0\.27794062786960514233241505968778/),
      },
    });
  });

  it('is the same area as the equivalent single-unit input', () => {
    expect(ok(hillMixed('1', '0', '0', '0'))).toEqual(convert('1', 'ropani'));
    expect(ok(hillMixed('', '1', '', ''))).toEqual(convert('1', 'aana'));
    expect(ok(hillMixed('', '', '1', ''))).toEqual(convert('1', 'paisa'));
    expect(ok(hillMixed('', '', '', '1'))).toEqual(convert('1', 'daam'));
    // (1 Ropani = 256 Daam, 1 Aana = 16, 1 Paisa = 4, 1 Daam = 1)
    expect(ok(hillMixed('1', '1', '1', '1'))).toEqual(convert('277', 'daam'));
  });

  it('carries: the entered split is not kept', () => {
    expect(ok(hillMixed('0', '0', '0', '300')).hilly).toEqual({
      ropani: '1',
      aana: '2',
      paisa: '3',
      daam: '0',
    });
    expect(ok(hillMixed('0', '20', '0', '0')).hilly).toEqual({
      ropani: '1',
      aana: '4',
      paisa: '0',
      daam: '0',
    });
  });

  it('blank and whitespace-only fields count as zero when one is filled', () => {
    expect(ok(hillMixed('  ', '', '2', ''))).toEqual(convert('2', 'paisa'));
    expect(ok(hillMixed('3', '', '', ''))).toEqual(convert('3', 'ropani'));
  });

  it('accepts decimals in any field, summed exactly', () => {
    const r = ok(hillMixed('0.1', '0.2', '0.3', '0.4'));
    const sqft = new D('0.1')
      .times(5476)
      .plus(new D('0.2').times('342.25'))
      .plus(new D('0.3').times('85.5625'))
      .plus(new D('0.4').times('21.390625'));
    expect(r.other.squareFeet).toBe(sqft.toFixed());
  });

  it('all zero is valid and gives zeros', () => {
    for (const fields of [
      ['0', '0', '0', '0'],
      ['0', '', '', ''],
      ['', '', '', '0.0'],
    ] as const) {
      const r = ok(hillMixed(fields[0], fields[1], fields[2], fields[3]));
      for (const group of [r.hilly, r.terai, r.other]) {
        for (const value of Object.values(group)) {
          expect(new D(value).isZero()).toBe(true);
        }
      }
    }
  });

  it('all blank is rejected with an empty form error', () => {
    expect(hillMixed('', '', '', '')).toEqual({
      ok: false,
      formError: 'empty',
      fieldErrors: {},
    });
    expect(hillMixed(' ', '\t', '', '  ')).toMatchObject({
      ok: false,
      formError: 'empty',
    });
  });

  it('reports malformed and negative fields per field, never converting', () => {
    expect(hillMixed('1', 'abc', '', '')).toEqual({
      ok: false,
      fieldErrors: { aana: 'malformed' },
    });
    expect(hillMixed('-1', '2', '1e2', '-0.5')).toEqual({
      ok: false,
      fieldErrors: {
        ropani: 'negative',
        paisa: 'malformed',
        daam: 'negative',
      },
    });
    for (const bad of ['.5', '5.', '1,5', '+1', '1 2', '१२']) {
      expect(hillMixed('', bad, '', '1')).toMatchObject({
        ok: false,
        fieldErrors: { aana: 'malformed' },
      });
    }
  });

  it('only the family’s own fields are read', () => {
    // Terai fields on a hill call (or the reverse) are ignored, and a blank
    // hill input stays "empty" rather than picking up another family.
    const mixedUp = svc.convertMixed('hill', {
      bigha: '5',
      ropani: '',
      aana: '',
      paisa: '',
      daam: '',
    } as never);
    expect(mixedUp).toMatchObject({ ok: false, formError: 'empty' });
  });

  it('keeps exact precision with large values', () => {
    const big = '123456789012345678901234567890';
    const r = ok(hillMixed(big, big, big, big));
    const perAll = new D(5476).plus('342.25').plus('85.5625').plus('21.390625');
    expect(r.other.squareFeet).toBe(new D(big).times(perAll).toFixed());
  });
});

describe('validation and precision: single units, both families', () => {
  const ALL: LandUnit[] = [...TERAI_LAND_UNITS, ...HILL_LAND_UNITS];

  it.each(ALL)(
    '%s: blank is empty, negative and malformed are rejected',
    unit => {
      expect(errorsOf('', unit)).toEqual(['empty']);
      expect(errorsOf('  ', unit)).toEqual(['empty']);
      expect(errorsOf('-1', unit)).toEqual(['negative']);
      expect(errorsOf('-0', unit)).toEqual(['negative']);
      for (const bad of [
        'abc',
        '1.2.3',
        '1,000',
        ' 1',
        '.5',
        '5.',
        '1e5',
        '+1',
      ]) {
        expect(errorsOf(bad, unit)).toEqual(['malformed']);
      }
      for (const bad of [undefined, null, 5, {}]) {
        expect(errorsOf(bad, unit)).toEqual(['malformed']);
      }
    },
  );

  it.each(ALL)('%s: zero is valid', unit => {
    for (const text of ['0', '0.0', '000']) {
      const r = convert(text, unit);
      for (const group of [r.hilly, r.terai, r.other]) {
        for (const value of Object.values(group)) {
          expect(new D(value).isZero()).toBe(true);
        }
      }
    }
  });

  it.each(ALL)('%s: input length limit', unit => {
    expect(errorsOf('1'.repeat(MAX_INPUT_LENGTH + 1), unit)).toEqual([
      'malformed',
    ]);
    expect(errorsOf('1'.repeat(MAX_INPUT_LENGTH), unit)).toEqual([]);
  });

  it.each(ALL)('%s: a 100-digit input stays exact in square feet', unit => {
    const big = '9'.repeat(MAX_INPUT_LENGTH);
    const per = {
      bigha: '72900',
      kattha: '3645',
      dhur: '182.25',
      ropani: '5476',
      aana: '342.25',
      paisa: '85.5625',
      daam: '21.390625',
    }[unit];
    expect(convert(big, unit).other.squareFeet).toBe(
      new D(big).times(per).toFixed(),
    );
  });

  it('an unknown unit or family is a programming error and throws', () => {
    expect(() => svc.convert({ value: '1', unit: 'acre' as never })).toThrow(
      RangeError,
    );
    expect(() => svc.convert({ value: '1', unit: undefined as never })).toThrow(
      RangeError,
    );
    expect(() =>
      svc.convert({ value: '1', unit: 'toString' as never }),
    ).toThrow(RangeError);
    expect(() => svc.convertMixed('hilly' as never, {} as never)).toThrow(
      RangeError,
    );
  });

  it('round half up at the 4-decimal boundary, with carry, in the Hilly result', () => {
    // 3.99996 Daam rounds to 4.0000 and carries to 1 Paisa, 0 Daam.
    expect(convert('3.99996', 'daam').hilly).toEqual({
      ropani: '0',
      aana: '0',
      paisa: '1',
      daam: '0',
    });
    expect(convert('3.9999', 'daam').hilly.daam).toBe('3.9999');
    // 15.99996 Daam carries into 1 Aana; 255.99996 Daam into 1 Ropani.
    expect(convert('15.99996', 'daam').hilly).toEqual({
      ropani: '0',
      aana: '1',
      paisa: '0',
      daam: '0',
    });
    expect(convert('255.99996', 'daam').hilly).toEqual({
      ropani: '1',
      aana: '0',
      paisa: '0',
      daam: '0',
    });
  });

  it('Terai carry still works for Hill input (Dhur 19.99996 -> 1 Kattha)', () => {
    // 19.99996 Dhur of area, entered as Hill units: 3,644.99...
    const sqft = new D('19.99996').times('182.25');
    const daam = sqft.div('21.390625');
    const r = convert(daam.toFixed(60), 'daam').terai;
    expect(r).toEqual({ bigha: '0', kattha: '1', dhur: '0' });
  });
});

describe('families agree through square feet (round trip)', () => {
  it('the same area entered in either family gives identical outputs', () => {
    // 1 Bigha = 72,900 sq ft = 13.3126... Ropani: use exact Daam instead.
    const sqft = new D('72900');
    const daam = sqft.div('21.390625');
    // The area is not a whole number of Daam, so use a long decimal.
    const viaDaam = convert(daam.toFixed(60), 'daam');
    const viaBigha = convert('1', 'bigha');
    // (a 60-digit Daam value, so equal to far below display precision)
    expect(
      new D(viaDaam.other.squareFeet).minus('72900').abs().lt('1e-40'),
    ).toBe(true);
    expect(viaDaam.hilly).toEqual(viaBigha.hilly);
    expect(viaDaam.terai).toEqual(viaBigha.terai);
  });

  it('1 Ropani -> sq ft -> back to Ropani is exact', () => {
    const r = convert('7.25', 'ropani');
    expect(new D(r.other.squareFeet).div(5476).eq('7.25')).toBe(true);
  });

  it('every hill unit is exactly the registry area', () => {
    const per = { ropani: 5476, aana: 342.25, paisa: 85.5625, daam: 21.390625 };
    for (const unit of HILL_LAND_UNITS) {
      expect(convert('1', unit).other.squareFeet).toBe(String(per[unit]));
    }
  });
});

describe('formatting and global state', () => {
  it('formatValue is unchanged: at most 4 decimals, half-up, trimmed', () => {
    expect(svc.formatValue('0.12345')).toBe('0.1235');
    expect(svc.formatValue('1.50000')).toBe('1.5');
    expect(svc.formatValue('0.99995')).toBe('1');
    expect(svc.formatValue(convert('1', 'ropani').other.acre)).toBe('0.1257');
    expect(svc.formatValue(convert('1', 'daam').other.squareMetres)).toBe(
      '1.9873',
    );
  });

  it("does not change decimal.js's global configuration", () => {
    const before = { precision: Decimal.precision, rounding: Decimal.rounding };
    convert('1', 'ropani');
    hillMixed('1', '2', '3', '4');
    terai('1', '2', '3');
    svc.formatValue('1.23456');
    expect({
      precision: Decimal.precision,
      rounding: Decimal.rounding,
    }).toEqual(before);
  });
});

describe('independence from the UI', () => {
  it('the domain files import no React Native, React or UI modules', () => {
    for (const file of [
      '../landConversionService.ts',
      '../registry.ts',
      '../types.ts',
      '../index.ts',
    ]) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      const imports = [...source.matchAll(/from '([^']+)'/g)].map(m => m[1]);
      for (const name of imports) {
        expect(name).toMatch(/^(decimal\.js|\.\/.*)$/);
      }
    }
  });
});
