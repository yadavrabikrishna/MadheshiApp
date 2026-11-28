import * as fs from 'fs';
import * as path from 'path';
import {
  CALCULATOR_OPERATORS,
  MAX_EXPRESSION_LENGTH,
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
    ['10%3', '1'],
    ['10+5×2', '20'],
    ['20÷5+3', '7'],
    ['10.5+2.5', '13'],
    ['-10+5', '-5'],
  ])('%s = %s', (expr, expected) => {
    expect(evaluateExpression(expr)).toEqual(ok(expected));
  });
});

describe('operators', () => {
  it('exposes all five', () => {
    expect([...CALCULATOR_OPERATORS]).toEqual(['+', '-', '×', '÷', '%']);
  });
  it.each([
    ['7+8', '15'],
    ['7-8', '-1'],
    ['7×8', '56'],
    ['7÷8', '0.875'],
    ['7%8', '7'],
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
    ['10+7%4×2', '16'],
    ['10%4×3', '6'],
    ['2×3%4', '2'],
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
    ['5.5%2', '1.5'],
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
    expect(evaluateExpression('-4%2')).toEqual(ok('0'));
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

describe('modulo sign convention (result follows the left operand)', () => {
  it.each([
    ['10%3', '1'],
    ['-10%3', '-1'],
    ['10%-3', '1'],
    ['-10%-3', '-1'],
    ['5.5%2', '1.5'],
    ['-5.5%2', '-1.5'],
    ['0%5', '0'],
    ['3%10', '3'],
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

describe('division and modulo by zero', () => {
  it.each(['5÷0', '5÷0.0', '5%0', '0÷0', '1+5÷0', '5÷0+1', '2×3÷0', '8÷4%0'])(
    '%s',
    expr => {
      const r = evaluateExpression(expr);
      if (expr === '5÷1-1') {
        expect(r).toEqual(ok('4'));
      } else {
        expect(r).toEqual(DIV0);
      }
    },
  );
  it('zero numerator is fine', () => {
    expect(evaluateExpression('0÷5')).toEqual(ok('0'));
    expect(evaluateExpression('0%5')).toEqual(ok('0'));
  });
  it('reports incomplete / invalid before division by zero', () => {
    expect(evaluateExpression('5÷0+')).toEqual(INCOMPLETE);
    expect(evaluateExpression('5÷0 a')).toEqual(invalid('invalidCharacter'));
  });
});

describe('chained expressions', () => {
  it('evaluates a long mixed chain', () => {
    // 100 - 20 + (3×4=12) - (50÷5=10) + (17%5=2) = 84
    expect(evaluateExpression('100-20+3×4-50÷5+17%5')).toEqual(ok('84'));
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
