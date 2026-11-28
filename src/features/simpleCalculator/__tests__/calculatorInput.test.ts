import { evaluateExpression } from '..';
import {
  INITIAL_CALCULATOR_STATE,
  expressionText,
  pressKey,
  type CalculatorInputState,
  type CalculatorKey,
} from '../calculatorInput';
import { formatCalculatorResult } from '../formatResult';

/** Presses keys written as a string: digits, `.`, + − × ÷ % and words. */
function press(
  keys: readonly (CalculatorKey | string)[],
  from: CalculatorInputState = INITIAL_CALCULATOR_STATE,
): CalculatorInputState {
  return keys.reduce<CalculatorInputState>(
    (state, key) => pressKey(state, key as CalculatorKey),
    from,
  );
}
const keys = (text: string) => [...text];
const shown = (state: CalculatorInputState) => expressionText(state.tokens);
const typed = (text: string) => shown(press(keys(text)));

describe('typing numbers', () => {
  it.each([
    ['12', '12'],
    ['12.5', '12.5'],
    ['.5', '0.5'],
    ['0', '0'],
    ['00', '0'],
    ['05', '5'],
    ['007', '7'],
    ['0.05', '0.05'],
    ['10', '10'],
    ['1.2.3', '1.23'],
    ['..', '0.'],
    ['5.', '5.'],
  ])('%s shows %s', (input, expected) => {
    expect(typed(input)).toBe(expected);
  });
  it('lets the second decimal point be ignored but keeps the number', () => {
    const state = press(keys('1.5'));
    expect(pressKey(state, '.')).toBe(state);
  });
});

describe('operators', () => {
  it.each([
    ['5+3', '5 + 3'],
    ['5−3', '5 − 3'],
    ['5×3', '5 × 3'],
    ['5÷3', '5 ÷ 3'],
    ['12.5+0.5', '12.5 + 0.5'],
  ])('%s shows %s', (input, expected) => {
    expect(typed(input)).toBe(expected);
  });
  it('inserts mod as a word', () => {
    expect(shown(press(['1', '0', 'mod', '3']))).toBe('10 mod 3');
  });
  it('replaces an operator typed straight after another', () => {
    expect(shown(press(['5', '+', '×']))).toBe('5 ×');
    expect(shown(press(['5', '×', '+']))).toBe('5 +');
    expect(shown(press(['5', '+', '−']))).toBe('5 −');
    expect(shown(press(['5', '−', '+']))).toBe('5 +');
    expect(shown(press(['5', '×', 'mod']))).toBe('5 mod');
    expect(shown(press(['5', 'mod', '÷', '×']))).toBe('5 ×');
  });
  it('ignores the same operator pressed twice', () => {
    const state = press(['5', '+']);
    expect(pressKey(state, '+')).toBe(state);
  });
  it('ignores an operator on an empty expression, except the minus sign', () => {
    for (const key of ['+', '×', '÷', 'mod', '%'] as const) {
      expect(pressKey(INITIAL_CALCULATOR_STATE, key)).toBe(
        INITIAL_CALCULATOR_STATE,
      );
    }
    expect(shown(press(['−']))).toBe('−');
  });
  it('treats − after × ÷ mod as a negative sign', () => {
    expect(shown(press(['5', '×', '−', '2']))).toBe('5 × −2');
    expect(shown(press(['5', '÷', '−', '2']))).toBe('5 ÷ −2');
    expect(shown(press(['5', 'mod', '−', '2']))).toBe('5 mod −2');
    expect(shown(press(['−', '5', '+', '2']))).toBe('−5 + 2');
  });
  it('replaces an operator and its sign together', () => {
    expect(shown(press(['5', '×', '−', '+']))).toBe('5 +');
    expect(shown(press(['5', '×', '−', '÷']))).toBe('5 ÷');
    const state = press(['5', '×', '−']);
    expect(pressKey(state, '−')).toBe(state);
  });
  it('does not let a lone sign take an operator', () => {
    const state = press(['−']);
    for (const key of ['+', '−', '×', '÷', 'mod', '%'] as const) {
      expect(pressKey(state, key)).toBe(state);
    }
  });
  it('drops a dangling decimal point before an operator', () => {
    expect(shown(press(['5', '.', '+']))).toBe('5 +');
    expect(shown(press(['−', '.', '×']))).toBe('−0 ×');
  });
  it('allows a negative number with a decimal', () => {
    expect(shown(press(['−', '.', '5']))).toBe('−0.5');
    expect(shown(press(['−', '0', '7']))).toBe('−7');
  });
});

describe('percent', () => {
  it('follows a finished number', () => {
    expect(typed('200×10%')).toBe('200 × 10%');
    expect(shown(press(['5', '.', '%']))).toBe('5%');
    expect(shown(press(['−', '5', '%']))).toBe('−5%');
  });
  it('is ignored anywhere else', () => {
    for (const keysTyped of [
      ['%'],
      ['5', '+', '%'],
      ['−', '%'],
      ['5', '%', '%'],
      ['5', '×', '−', '%'],
    ]) {
      const before = press(keysTyped.slice(0, -1));
      expect(pressKey(before, '%')).toBe(before);
    }
  });
  it('does not take a digit or point straight after it', () => {
    const state = press(['5', '%']);
    expect(pressKey(state, '3')).toBe(state);
    expect(pressKey(state, '.')).toBe(state);
  });
  it('continues with an operator after it', () => {
    expect(shown(press(['5', '%', '+', '2']))).toBe('5% + 2');
  });
});

describe('DEL', () => {
  it('removes the last digit, then the number', () => {
    expect(shown(press(['1', '2', 'delete']))).toBe('1');
    expect(shown(press(['1', 'delete']))).toBe('');
  });
  it('removes a whole operator, mod and %', () => {
    expect(shown(press(['5', '+', 'delete']))).toBe('5');
    expect(shown(press(['5', 'mod', 'delete']))).toBe('5');
    expect(shown(press(['5', '%', 'delete']))).toBe('5');
    expect(shown(press(['5', '×', '−', 'delete']))).toBe('5 ×');
  });
  it('removes a decimal point and a sign digit by digit', () => {
    expect(shown(press(['1', '.', 'delete']))).toBe('1');
    expect(shown(press(['−', '5', 'delete']))).toBe('');
    expect(shown(press(['0', '.', '5', 'delete', 'delete']))).toBe('0');
  });
  it('does nothing on an empty expression', () => {
    expect(pressKey(INITIAL_CALCULATOR_STATE, 'delete')).toBe(
      INITIAL_CALCULATOR_STATE,
    );
  });
  it('lets typing continue after a deletion', () => {
    expect(shown(press(['1', '2', '+', '3', 'delete', 'delete', '×']))).toBe(
      '12 ×',
    );
  });
});

describe('clear', () => {
  it('resets the expression and the result', () => {
    expect(press(['5', '+', '3', 'equals', 'clear'])).toEqual(
      INITIAL_CALCULATOR_STATE,
    );
    expect(press(['5', '+', 'clear'])).toEqual(INITIAL_CALCULATOR_STATE);
  });
});

describe('equals', () => {
  it.each([
    ['10+5', '15'],
    ['10−5', '5'],
    ['10×5', '50'],
    ['10÷5', '2'],
    ['20÷5+3', '7'],
    ['10+5×2', '20'],
    ['10.5+2.5', '13'],
    ['0.1+0.2', '0.3'],
    ['200×10%', '20'],
    ['200÷10%', '2000'],
    ['200+10%', '220'],
    ['200−10%', '180'],
    ['5×−2', '−10'],
    ['5', '5'],
    ['10%', '0.1'],
  ])('%s = %s', (input, expected) => {
    const state = press([...keys(input), 'equals']);
    expect(state.result).toBe(expected.replace('−', '-'));
  });
  it('finishes mod expressions', () => {
    expect(press(['1', '0', 'mod', '3', 'equals']).result).toBe('1');
    expect(press(['2', '0', 'mod', '5', 'equals']).result).toBe('0');
    expect(press(['−', '1', '0', 'mod', '3', 'equals']).result).toBe('-1');
  });
  it('keeps the expression when finished', () => {
    const state = press(keys('5+3').concat('equals'));
    expect(shown(state)).toBe('5 + 3');
  });
  it('rounds long results for display', () => {
    expect(press(['1', '÷', '3', 'equals']).result).toBe('0.3333333333');
    expect(press(['2', '÷', '3', 'equals']).result).toBe('0.6666666667');
  });
  it('does nothing for an incomplete or empty expression', () => {
    for (const input of [[], ['5', '+'], ['5', '.'], ['−'], ['5', '×', '−']]) {
      const state = press(input as CalculatorKey[]);
      expect(pressKey(state, 'equals')).toBe(state);
    }
  });
  it('does nothing for division or mod by zero (the error stays shown)', () => {
    for (const input of ['5÷0', '5÷0%']) {
      const state = press(keys(input));
      expect(pressKey(state, 'equals')).toBe(state);
      expect(evaluateExpression(shown(state)).status).toBe('divisionByZero');
    }
    const modZero = press(['5', 'mod', '0']);
    expect(pressKey(modZero, 'equals')).toBe(modZero);
  });
  it('is a no-op when pressed again', () => {
    const state = press(keys('5+3').concat('equals'));
    expect(pressKey(state, 'equals')).toBe(state);
  });
});

describe('continuing from a result', () => {
  const finished = (text: string) => press([...keys(text), 'equals']);

  it('continues with an operator', () => {
    const state = press(['×', '2'], finished('5+3'));
    expect(shown(state)).toBe('8 × 2');
    expect(state.result).toBeNull();
    expect(press(['equals'], state).result).toBe('16');
  });
  it.each([
    ['+', '10', '18'],
    ['−', '3', '5'],
    ['÷', '4', '2'],
    ['mod', '3', '2'],
  ])('continues with %s', (operator, operand, expected) => {
    const state = press(
      [operator, ...keys(operand), 'equals'],
      finished('5+3'),
    );
    expect(state.result).toBe(operator === '+' ? '18' : expected);
  });
  it('continues from a negative result', () => {
    const state = press(['×', '2', 'equals'], finished('3−10'));
    expect(shown(press(['×', '2'], finished('3−10')))).toBe('−7 × 2');
    expect(state.result).toBe('-14');
  });
  it('continues with % on the result', () => {
    const state = press(['%'], finished('5+3'));
    expect(shown(state)).toBe('8%');
    expect(press(['equals'], state).result).toBe('0.08');
  });
  it('starts a new calculation on a digit or a point', () => {
    expect(shown(press(['7'], finished('5+3')))).toBe('7');
    expect(shown(press(['.'], finished('5+3')))).toBe('0.');
    expect(press(['7'], finished('5+3')).result).toBeNull();
  });
  it('continues from the rounded value that was shown', () => {
    const state = press(['×', '3', 'equals'], finished('1÷3'));
    expect(shown(press(['×', '3'], finished('1÷3')))).toBe('0.3333333333 × 3');
    expect(state.result).toBe('0.9999999999');
  });
  it('leaves the finished state on DEL and deletes the last item', () => {
    const state = press(['delete'], finished('5+12'));
    expect(shown(state)).toBe('5 + 1');
    expect(state.result).toBeNull();
  });
  it('lets C clear a finished calculation', () => {
    expect(press(['clear'], finished('5+3'))).toEqual(INITIAL_CALCULATOR_STATE);
  });
  it('continues from a long (80 digit) result within the length limit', () => {
    const big = press([
      ...keys('9'.repeat(40) + '×' + '9'.repeat(40)),
      'equals',
    ]);
    expect(big.result).not.toBeNull();
    const next = pressKey(big, '+');
    // 80 digits + " + " is still within the 100-character limit
    expect(shown(next)).toBe(`${big.result} +`);
  });
});

describe('the engine is the safety net', () => {
  it('never lets the expression become invalid, for any key sequence', () => {
    const all: CalculatorKey[] = [
      '0',
      '1',
      '5',
      '9',
      '.',
      '+',
      '−',
      '×',
      '÷',
      'mod',
      '%',
      'delete',
      'equals',
    ];
    // Deterministic pseudo-random walks.
    let seed = 12345;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let walk = 0; walk < 300; walk += 1) {
      let state = INITIAL_CALCULATOR_STATE;
      for (let step = 0; step < 40; step += 1) {
        state = pressKey(state, all[next() % all.length]);
        expect(evaluateExpression(shown(state)).status).not.toBe('invalid');
      }
    }
  });
  it('stops at the engine length limit', () => {
    let state = INITIAL_CALCULATOR_STATE;
    for (let i = 0; i < 150; i += 1) {
      state = pressKey(state, '7');
    }
    expect(shown(state)).toBe('7'.repeat(100));
  });
});

describe('formatCalculatorResult', () => {
  it.each([
    ['15', '15'],
    ['0.1', '0.1'],
    ['-5', '-5'],
    ['0.33333333333333', '0.3333333333'],
    ['0.66666666666666', '0.6666666667'],
    ['2.00000000005', '2.0000000001'],
    ['0.00000000001', '0'],
    ['-0.00000000001', '0'],
    ['1234567890123.5', '1234567890123.5'],
    ['9999999999800000000001', '9999999999800000000001'],
    ['0.0000000001', '0.0000000001'],
  ])('%s -> %s', (value, expected) => {
    expect(formatCalculatorResult(value)).toBe(expected);
  });
});
