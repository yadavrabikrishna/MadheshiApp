import * as fs from 'fs';
import * as path from 'path';
import {
  CALCULATOR_OPERATORS,
  MAX_EXPRESSION_LENGTH,
  PERCENT_SIGN,
  evaluateExpression,
} from '..';

const ok = (value: string) => ({ status: 'ok', value });
const invalid = (error: string) => ({ status: 'invalid', error });
const INCOMPLETE = { status: 'incomplete' };
const DIV0 = { status: 'divisionByZero' };

describe('issue examples', () => {
  it.each([
    ['10+5', '15'],
    ['10-5', '5'],
    ['10×5', '50'],
    ['10÷5', '2'],
    ['10 mod 3', '1'],
    ['10+5×2', '20'],
    ['20÷5+3', '7'],
    ['10.5+2.5', '13'],
    ['-10+5', '-5'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
});

describe('operators', () => {
  it('exposes the five binary operators (% is a postfix, not an operator)', () => {
    expect([...CALCULATOR_OPERATORS]).toEqual(['+', '-', '×', '÷', 'mod']);
  });
  it.each([
    ['7+8', '15'],
    ['7-8', '-1'],
    ['7×8', '56'],
    ['7÷8', '0.875'],
    ['7 mod 8', '7'],
    ['9*3', '27'],
    ['9/3', '3'],
    ['9−3', '6'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
  it('ignores spaces between tokens', () => {
    expect(evaluateExpression(' 10 + 5 × 2 ')).toEqual(ok('20'));
  });
});

describe('precedence and associativity', () => {
  it.each([
    ['2+3×4', '14'],
    ['2×3+4', '10'],
    ['20-6÷3', '18'],
    ['10÷5×2', '4'],
    ['10-5-2', '3'],
    ['100÷10÷5', '2'],
    ['10+7 mod 4×2', '16'],
    ['10 mod 4×3', '6'],
    ['2×3 mod 4', '2'],
    ['1+2+3×4-5', '10'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
});

describe('decimals and precision', () => {
  it.each([
    ['0.1+0.2', '0.3'],
    ['0.3-0.1', '0.2'],
    ['1.1×1.1', '1.21'],
    ['.5+.5', '1'],
    ['0.1×3', '0.3'],
    ['5.5 mod 2', '1.5'],
    ['10.5÷0.5', '21'],
  ])('%s = %s', (expr, expected) => {
    const value = expr === '1÷3×3' ? undefined : expected;
    if (value === undefined) {
      const r = evaluateExpression(expr);
      expect(r.status).toBe('ok');
      return;
    }
    expect(evaluateExpression(expr)).toEqual(ok(value));
  });
  it('never uses exponent notation', () => {
    const tiny = evaluateExpression('0.0000000001×0.0000000001');
    expect(tiny).toEqual(ok('0.00000000000000000001'));
    const big = evaluateExpression('99999999999×99999999999');
    expect(big).toEqual(ok('9999999999800000000001'));
  });
  it('normalises negative zero', () => {
    expect(evaluateExpression('-0')).toEqual(ok('0'));
    expect(evaluateExpression('0×-5')).toEqual(ok('0'));
    expect(evaluateExpression('-4 mod 2')).toEqual(ok('0'));
  });
});

describe('negative numbers', () => {
  it.each([
    ['-5', '-5'],
    ['-10+5', '-5'],
    ['5×-2', '-10'],
    ['5--2', '7'],
    ['5+-2', '3'],
    ['-2×-3', '6'],
    ['-6÷-3', '2'],
    ['-1.5+0.5', '-1'],
    ['−5+2', '-3'],
    ['5-3-4', '-2'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
});

describe('mod sign convention (result follows the left operand)', () => {
  it.each([
    ['10 mod 3', '1'],
    ['-10 mod 3', '-1'],
    ['10 mod -3', '1'],
    ['-10 mod -3', '-1'],
    ['5.5 mod 2', '1.5'],
    ['-5.5 mod 2', '-1.5'],
    ['0 mod 5', '0'],
    ['3 mod 10', '3'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
});

describe('incomplete expressions give no result', () => {
  it.each([
    '',
    '   ',
    '5+',
    '5×',
    '5 ÷ ',
    '-',
    '5×-',
    '5.',
    '.',
    '5+3.',
    '5+.',
  ])('%j', expr => {
    expect(evaluateExpression(expr)).toEqual(INCOMPLETE);
  });
});

describe('invalid input', () => {
  it.each([
    ['×5', 'misplacedOperator'],
    ['÷5', 'misplacedOperator'],
    ['%5', 'misplacedOperator'],
    ['+5', 'misplacedOperator'],
    ['5++2', 'misplacedOperator'],
    ['5×÷2', 'misplacedOperator'],
    ['5×+2', 'misplacedOperator'],
    ['--5', 'misplacedOperator'],
    ['5---2', 'misplacedOperator'],
    ['1 2', 'missingOperator'],
    ['1.5 2', 'missingOperator'],
    ['1..2', 'invalidNumber'],
    ['1.2.3', 'invalidNumber'],
    ['5.+3', 'invalidNumber'],
    ['5.×3', 'invalidNumber'],
    ['abc', 'invalidCharacter'],
    ['5+a', 'invalidCharacter'],
    ['(1+2)', 'invalidCharacter'],
    ['1e3', 'invalidCharacter'],
    ['1,000', 'invalidCharacter'],
    ['१+२', 'invalidCharacter'],
    ['5^2', 'invalidCharacter'],
  ])('%j -> %s', (expr, error) => {
    expect(evaluateExpression(expr)).toEqual(invalid(error));
  });
  it('rejects overly long input', () => {
    expect(evaluateExpression('1'.repeat(MAX_EXPRESSION_LENGTH + 1))).toEqual(
      invalid('tooLong'),
    );
    expect(evaluateExpression('1'.repeat(MAX_EXPRESSION_LENGTH))).toEqual(
      ok('1'.repeat(MAX_EXPRESSION_LENGTH)),
    );
  });
  it('never throws on non-string input', () => {
    expect(evaluateExpression(undefined as unknown as string)).toEqual(
      invalid('invalidCharacter'),
    );
  });
});

describe('division and mod by zero', () => {
  it.each([
    '5÷0',
    '5÷0.0',
    '5 mod 0',
    '0÷0',
    '1+5÷0',
    '5÷0+1',
    '2×3÷0',
    '8÷4 mod 0',
  ])('%s', expr => {
    const r = evaluateExpression(expr);
    if (expr === '5÷1-1') {
      expect(r).toEqual(ok('4'));
    } else {
      expect(r).toEqual(DIV0);
    }
  });
  it('zero numerator is fine', () => {
    expect(evaluateExpression('0÷5')).toEqual(ok('0'));
    expect(evaluateExpression('0 mod 5')).toEqual(ok('0'));
  });
  it('reports incomplete / invalid before division by zero', () => {
    expect(evaluateExpression('5÷0+')).toEqual(INCOMPLETE);
    expect(evaluateExpression('5÷0 a')).toEqual(invalid('invalidCharacter'));
  });
});

describe('chained expressions', () => {
  it('evaluates a long mixed chain', () => {
    // 100 - 20 + (3×4=12) - (50÷5=10) + (17 mod 5=2) = 84
    expect(evaluateExpression('100-20+3×4-50÷5+17 mod 5')).toEqual(ok('84'));
  });
  it('is stable for every prefix of a valid expression (live typing)', () => {
    const text = '12.5+3×4';
    const statuses = [...text].map(
      (_, i) => evaluateExpression(text.slice(0, i + 1)).status,
    );
    expect(statuses).toEqual([
      'ok', // 1
      'ok', // 12
      'incomplete', // 12.
      'ok', // 12.5
      'incomplete', // 12.5+
      'ok', // 12.5+3
      'incomplete', // 12.5+3×
      'ok', // 12.5+3×4
    ]);
    expect(evaluateExpression(text)).toEqual(ok('24.5'));
  });
});

describe('safety', () => {
  it('has no eval, Function, or UI/state imports', () => {
    const dir = path.join(__dirname, '..');
    const sources = fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.ts'))
      .map(f => fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const src of sources) {
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(code).not.toMatch(/\beval\s*\(/);
      expect(code).not.toMatch(/\bnew\s+Function\b|\bFunction\s*\(/);
      expect(code).not.toMatch(/from\s+['"](react|react-native|@reduxjs)/);
    }
  });
  it('treats code-like text as invalid, not as code', () => {
    expect(evaluateExpression('process.exit()').status).toBe('invalid');
    expect(evaluateExpression('1;2').status).toBe('invalid');
  });
});

describe('mod (remainder) is a word, separate from %', () => {
  it('uses % only as the percent sign', () => {
    expect(PERCENT_SIGN).toBe('%');
  });
  it.each([
    ['10 mod 3', '1'],
    ['20 mod 5', '0'],
    ['-10 mod 3', '-1'],
    ['10mod3', '1'],
    ['10 MOD 3', '1'],
    ['10 Mod 3', '1'],
    ['7.5 mod 2', '1.5'],
    ['0.7 mod 0.2', '0.1'],
    ['1 mod 3', '1'],
    ['100 mod 7 mod 3', '2'],
    ['10 + 7 mod 4 × 2', '16'],
    ['10 mod 4 × 3', '6'],
    ['2 × 7 mod 4', '2'],
    ['20 - 17 mod 5', '18'],
    ['10 mod -3', '1'],
    ['-10 mod -3', '-1'],
    ['5 - -7 mod 4', '8'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
  it.each([
    ['5 mod 0', DIV0],
    ['5 mod 0.0', DIV0],
    ['1 + 5 mod 0', DIV0],
    ['5 mod', INCOMPLETE],
    ['5 mod -', INCOMPLETE],
    ['mod 5', invalid('misplacedOperator')],
    ['5 mod mod 2', invalid('misplacedOperator')],
    ['5 mod × 2', invalid('misplacedOperator')],
    ['5 mod % 2', invalid('misplacedOperator')],
    ['5 mo 2', invalid('invalidCharacter')],
    ['5 modulo 2', invalid('invalidCharacter')],
    ['5 m od 2', invalid('invalidCharacter')],
    ['5 mod2d', invalid('invalidCharacter')],
  ])('%s -> %j', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(expected);
  });
  it('treats 5%3 as an error, not as a remainder', () => {
    expect(evaluateExpression('5%3')).toEqual(invalid('missingOperator'));
    expect(evaluateExpression('10%3')).toEqual(invalid('missingOperator'));
  });
});

describe('percent: add / subtract is of the running total', () => {
  it.each([
    ['200 + 10%', '220'],
    ['200 − 10%', '180'],
    ['200 - 10%', '180'],
    ['200+10%', '220'],
    ['100 + 10 + 10%', '121'],
    ['100 + 10% + 10%', '121'],
    ['100 - 10 - 10%', '81'],
    ['100 + 50 × 2 + 10%', '220'],
    ['100 + 50 × 2 - 10%', '180'],
    ['10 + 5 - 20%', '12'],
    ['200 + 0%', '200'],
    ['200 + 100%', '400'],
    ['200 - 100%', '0'],
    ['200 + 150%', '500'],
    ['200 - 150%', '-100'],
    ['200 + 12.5%', '225'],
    ['80 + 2.5%', '82'],
    ['0.5 + 10%', '0.55'],
    ['-200 + 10%', '-220'],
    ['-200 - 10%', '-180'],
    ['200 + -10%', '180'],
    ['200 - -10%', '220'],
    ['200 mod 7 + 50%', '6'],
    ['200 ÷ 4 + 10%', '55'],
    ['0.1 + 0.2 + 50%', '0.45'],
    ['10% + 5%', '0.105'],
    ['200 × 2 + 10% - 10%', '396'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
  it('stays exact (no binary floating point)', () => {
    expect(evaluateExpression('19.99 + 7%')).toEqual(ok('21.3893'));
    expect(evaluateExpression('0.07 + 0.7%')).toEqual(ok('0.07049'));
    expect(evaluateExpression('3 + 33.3333%')).toEqual(ok('3.999999'));
  });
});

describe('percent: a fraction for × ÷ mod and on its own', () => {
  it.each([
    ['200 × 10%', '20'],
    ['200 ÷ 10%', '2000'],
    ['10% × 200', '20'],
    ['10% ÷ 4', '0.025'],
    ['10%', '0.1'],
    ['50%', '0.5'],
    ['0%', '0'],
    ['250%', '2.5'],
    ['12.5%', '0.125'],
    ['-10%', '-0.1'],
    ['200 × -10%', '-20'],
    ['-200 × 10%', '-20'],
    ['-200 ÷ -10%', '2000'],
    ['10% + 5', '5.1'],
    ['10% - 5', '-4.9'],
    ['10% + 20%', '0.12'],
    ['50% × 50%', '0.25'],
    ['200 mod 10%', '0'],
    ['1 mod 30%', '0.1'],
    ['200 × 10% + 5', '25'],
    ['200 + 10% × 2', '200.2'],
    ['200 + 5 × 10%', '200.5'],
    ['200 + 10% ÷ 2', '200.05'],
    ['200 + 10% mod 3', '200.1'],
    ['200 + 10 × 10% + 10%', '221.1'],
    ['1 ÷ 8 × 50%', '0.0625'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
  it('divides by a zero percentage as division by zero', () => {
    expect(evaluateExpression('5 ÷ 0%')).toEqual(DIV0);
    expect(evaluateExpression('5 mod 0%')).toEqual(DIV0);
    expect(evaluateExpression('0% ÷ 5')).toEqual(ok('0'));
  });
});

describe('percent: incomplete and invalid input', () => {
  it.each([
    ['5% +', INCOMPLETE],
    ['5% ×', INCOMPLETE],
    ['5% mod', INCOMPLETE],
    ['200 + 10% -', INCOMPLETE],
    ['%', invalid('misplacedOperator')],
    ['%5', invalid('misplacedOperator')],
    ['5%%', invalid('misplacedOperator')],
    ['5 % %', invalid('misplacedOperator')],
    ['5 + %', invalid('misplacedOperator')],
    ['5 × %', invalid('misplacedOperator')],
    ['- %', invalid('misplacedOperator')],
    ['-%5', invalid('misplacedOperator')],
    ['5% 3', invalid('missingOperator')],
    ['5%3', invalid('missingOperator')],
    ['5%.5', invalid('missingOperator')],
    ['5.%', invalid('invalidNumber')],
    ['5.% + 1', invalid('invalidNumber')],
    ['5.5.5%', invalid('invalidNumber')],
    ['1e2%', invalid('invalidCharacter')],
    ['(5)%', invalid('invalidCharacter')],
  ])('%j -> %j', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(expected);
  });
  it('is stable for every prefix while typing 200+10%', () => {
    const text = '200+10%';
    const statuses = [...text].map(
      (_, i) => evaluateExpression(text.slice(0, i + 1)).status,
    );
    expect(statuses).toEqual([
      'ok', // 2
      'ok', // 20
      'ok', // 200
      'incomplete', // 200+
      'ok', // 200+1
      'ok', // 200+10
      'ok', // 200+10%
    ]);
    expect(evaluateExpression('200+1')).toEqual(ok('201'));
    expect(evaluateExpression('200+10')).toEqual(ok('210'));
    expect(evaluateExpression(text)).toEqual(ok('220'));
  });
});

describe('mod and % together', () => {
  it.each([
    ['10 mod 3 + 10%', '1.1'],
    ['200 + 10% mod 3 × 2', '200.2'],
    ['100 mod 7 + 50 × 2 - 10%', '91.8'],
    ['200 × 10% mod 7', '6'],
    ['1000 - 10% - 10%', '810'],
    ['1000 + 10% - 10%', '990'],
    ['50 × 10% × 10% + 1', '1.5'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
});
