/**
 * The Basic Calculator screen (Issue #83), driven through its keys with the
 * REAL engine: nothing is mocked, so every expected value is the engine's.
 * Reference results were computed independently.
 */
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { setLanguage, setTheme } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
import { darkColors, lightColors } from '../../../../theme/colors';
import { BasicCalculatorView } from '../BasicCalculatorView';

jest.setTimeout(30000);

type User = ReturnType<typeof userEvent.setup>;

function makeStore() {
  return createAppStore({
    preferencesRepository: {
      saveLanguage: jest.fn().mockResolvedValue(undefined),
      saveTheme: jest.fn().mockResolvedValue(undefined),
      saveInterestRateConfig: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
}

async function launch() {
  const store = makeStore();
  const user = userEvent.setup();
  await render(
    <Provider store={store}>
      <BasicCalculatorView />
    </Provider>,
  );
  return { store, user };
}

const KEY_NAMES: Record<string, string> = {
  C: 'Clear all',
  DEL: 'Delete',
  '.': 'Decimal point',
  '+': 'Plus',
  '−': 'Minus',
  '×': 'Multiply',
  '÷': 'Divide',
  mod: 'Modulo (remainder)',
  '%': 'Percent',
  '=': 'Equals',
};
const key = (name: string) =>
  screen.getByRole('button', { name: KEY_NAMES[name] ?? name });

/** Presses keys given as a list: digits, `.`, + − × ÷ %, `mod`, C, DEL, =. */
async function press(user: User, keys: readonly string[]) {
  for (const k of keys) {
    await user.press(key(k));
  }
}
/** `10+5×2` style text to keys (`mod` is its own key). */
const tokens = (text: string) =>
  [...text.replace(/mod/g, ' ')].map(c => (c === ' ' ? 'mod' : c));

const expression = () => screen.getByTestId('calculator-expression');
const result = () => screen.getByTestId('calculator-result');
const error = () => screen.queryByTestId('calculator-error');
const expressionText = () => String(expression().props.children);
const resultText = () => String(result().props.children);

async function type(user: User, text: string) {
  await press(user, tokens(text));
}

describe('rendering', () => {
  it('shows every required key', async () => {
    await launch();
    for (const name of [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '.',
      '+',
      '−',
      '×',
      '÷',
      'mod',
      '%',
      'C',
      'DEL',
      '=',
    ]) {
      expect(key(name)).toBeOnTheScreen();
    }
  });

  it('lays the keys out as the design asks', async () => {
    await launch();
    const order = screen
      .getAllByRole('button')
      .map(button => button.props.testID.replace('calculator-key-', ''));
    expect(order).toEqual([
      'clear',
      'delete',
      'mod',
      '÷',
      '7',
      '8',
      '9',
      '×',
      '4',
      '5',
      '6',
      '−',
      '1',
      '2',
      '3',
      '+',
      '0',
      '.',
      '%',
      'equals',
    ]);
  });

  it('starts empty: 0 in the expression, no result and no error', async () => {
    await launch();
    expect(expressionText()).toBe('0');
    expect(resultText()).toBe('');
    expect(error()).toBeNull();
  });

  it('has no text field, so the device keyboard never appears', async () => {
    await launch();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain('"TextInput"');
  });

  it('keeps mod and percent as separate keys', async () => {
    await launch();
    expect(key('mod')).not.toBe(key('%'));
    expect(screen.getAllByText('mod')).toHaveLength(1);
    expect(screen.getAllByText('%')).toHaveLength(1);
  });
});

describe('number and operator input', () => {
  it.each([
    ['12', '12'],
    ['12.5', '12.5'],
    ['.5', '0.5'],
    ['007', '7'],
    ['5+3', '5 + 3'],
    ['5−3', '5 − 3'],
    ['5×3', '5 × 3'],
    ['5÷3', '5 ÷ 3'],
    ['10mod3', '10 mod 3'],
    ['200×10%', '200 × 10%'],
    ['5×−2', '5 × −2'],
  ])('typing %s shows %s', async (input, shown) => {
    const { user } = await launch();
    await type(user, input);
    expect(expressionText()).toBe(shown);
  });

  it('prevents a second decimal point in a number, but allows one per number', async () => {
    const { user } = await launch();
    await type(user, '1.2.3');
    expect(expressionText()).toBe('1.23');
    await type(user, '+4.5.6');
    expect(expressionText()).toBe('1.23 + 4.56');
  });

  it('replaces an operator typed after another operator', async () => {
    const { user } = await launch();
    await type(user, '5+×');
    expect(expressionText()).toBe('5 ×');
    await press(user, ['mod']);
    expect(expressionText()).toBe('5 mod');
  });

  it('ignores an operator or % on an empty expression', async () => {
    const { user } = await launch();
    await press(user, ['×', '÷', '+', 'mod', '%']);
    expect(expressionText()).toBe('0');
    await press(user, ['−']);
    expect(expressionText()).toBe('−');
  });

  it('ignores a second minus straight after a minus', async () => {
    const { user } = await launch();
    await type(user, '5−−2');
    expect(expressionText()).toBe('5 − 2');
  });

  it('ignores a digit straight after %', async () => {
    const { user } = await launch();
    await type(user, '5%3');
    expect(expressionText()).toBe('5%');
  });
});

describe('live result', () => {
  it('updates as each key is pressed', async () => {
    const { user } = await launch();
    await press(user, ['1', '2']);
    expect(resultText()).toBe(''); // a lone number is its own value
    await press(user, ['+']);
    expect(resultText()).toBe(''); // incomplete: no misleading result
    await press(user, ['3']);
    expect(resultText()).toBe('15');
    await press(user, ['×']);
    expect(resultText()).toBe('');
    await press(user, ['2']);
    expect(resultText()).toBe('18');
    await press(user, ['0']);
    expect(resultText()).toBe('72');
  });

  it.each([
    ['10+5', '15'],
    ['10−5', '5'],
    ['10×5', '50'],
    ['10÷5', '2'],
    ['10mod3', '1'],
    ['20mod5', '0'],
    ['10+5×2', '20'],
    ['20÷5+3', '7'],
    ['10.5+2.5', '13'],
    ['0.1+0.2', '0.3'],
    ['5×−2', '−10'],
    ['1÷3', '0.3333333333'],
    ['2÷3', '0.6666666667'],
  ])('%s previews %s', async (input, expected) => {
    const { user } = await launch();
    await type(user, input);
    expect(resultText()).toBe(expected);
  });

  it('shows a negative remainder like the engine does', async () => {
    const { user } = await launch();
    await press(user, ['−', '1', '0', 'mod', '3']);
    expect(expressionText()).toBe('−10 mod 3');
    expect(resultText()).toBe('−1');
  });

  it('keeps the result when a trailing operator is typed and drops it on DEL', async () => {
    const { user } = await launch();
    await type(user, '4+5');
    expect(resultText()).toBe('9');
    await press(user, ['×']);
    expect(resultText()).toBe('');
    await press(user, ['DEL']);
    expect(resultText()).toBe('9');
  });
});

describe('percent behaves as the engine defines it', () => {
  it.each([
    ['200×10%', '20'],
    ['200÷10%', '2000'],
    ['200+10%', '220'],
    ['200−10%', '180'],
    ['100+10+10%', '121'],
    ['100−10−10%', '81'],
    ['200+10%×2', '200.2'],
    ['10%', '0.1'],
    ['10%+5', '5.1'],
  ])('%s gives %s', async (input, expected) => {
    const { user } = await launch();
    await type(user, input);
    expect(resultText()).toBe(expected);
  });

  it('is not the remainder: 10 mod 3 and 10% differ', async () => {
    const { user } = await launch();
    await type(user, '10mod3');
    expect(resultText()).toBe('1');
    await press(user, ['C']);
    await type(user, '10%+3');
    expect(resultText()).toBe('3.1');
  });
});

describe('AC / DEL', () => {
  it('C clears the expression, the result and an error', async () => {
    const { user } = await launch();
    await type(user, '5+3');
    await press(user, ['C']);
    expect(expressionText()).toBe('0');
    expect(resultText()).toBe('');

    await type(user, '5÷0');
    expect(error()).not.toBeNull();
    await press(user, ['C']);
    expect(error()).toBeNull();
    expect(expressionText()).toBe('0');
  });

  it('C clears a finished calculation', async () => {
    const { user } = await launch();
    await type(user, '5+3=');
    await press(user, ['C']);
    expect(expressionText()).toBe('0');
    expect(resultText()).toBe('');
  });

  it('DEL removes the last digit and updates the live result', async () => {
    const { user } = await launch();
    await type(user, '12+34');
    expect(resultText()).toBe('46');
    await press(user, ['DEL']);
    expect(expressionText()).toBe('12 + 3');
    expect(resultText()).toBe('15');
    await press(user, ['DEL', 'DEL']);
    expect(expressionText()).toBe('12');
    expect(resultText()).toBe('');
  });

  it('DEL removes a whole operator, mod and %', async () => {
    const { user } = await launch();
    await type(user, '5mod');
    await press(user, ['DEL']);
    expect(expressionText()).toBe('5');
    await press(user, ['%', 'DEL']);
    expect(expressionText()).toBe('5');
  });

  it('DEL on an empty expression does nothing', async () => {
    const { user } = await launch();
    await press(user, ['DEL']);
    expect(expressionText()).toBe('0');
  });

  it('DEL fixes a division by zero', async () => {
    const { user } = await launch();
    await type(user, '8÷0');
    expect(error()).not.toBeNull();
    await press(user, ['DEL', '4']);
    expect(error()).toBeNull();
    expect(resultText()).toBe('2');
  });
});

describe('equals', () => {
  it.each([
    ['10+5', '15'],
    ['10−5', '5'],
    ['10×5', '50'],
    ['10÷5', '2'],
    ['10mod3', '1'],
    ['10+5×2', '20'],
    ['20÷5+3', '7'],
    ['10.5+2.5', '13'],
    ['−10+5', '−5'],
    ['200×10%', '20'],
    ['200+10%', '220'],
    ['200−10%', '180'],
    ['7', '7'],
  ])('%s = %s', async (input, expected) => {
    const { user } = await launch();
    await type(user, input);
    await press(user, ['=']);
    expect(resultText()).toBe(expected);
  });

  it('shows the final result large and keeps the expression above it', async () => {
    const { user } = await launch();
    await type(user, '5+3');
    const liveSize = (result().props.style as Array<object>).flat();
    await press(user, ['=']);
    expect(expressionText()).toBe('5 + 3');
    expect(resultText()).toBe('8');
    expect((result().props.style as Array<object>).flat()).not.toEqual(
      liveSize,
    );
  });

  it('does nothing on an empty or incomplete expression', async () => {
    const { user } = await launch();
    await press(user, ['=']);
    expect(expressionText()).toBe('0');
    expect(resultText()).toBe('');
    await type(user, '5+');
    await press(user, ['=']);
    expect(expressionText()).toBe('5 +');
    expect(resultText()).toBe('');
    expect(error()).toBeNull();
  });
});

describe('continuing after =', () => {
  it('continues from the result with an operator', async () => {
    const { user } = await launch();
    await type(user, '5+3=');
    await press(user, ['×', '2']);
    expect(expressionText()).toBe('8 × 2');
    expect(resultText()).toBe('16');
    await press(user, ['=']);
    expect(resultText()).toBe('16');
    expect(expressionText()).toBe('8 × 2');
  });

  it.each([
    ['+', '5', '13'],
    ['−', '5', '3'],
    ['×', '5', '40'],
    ['÷', '4', '2'],
    ['mod', '3', '2'],
  ])('continues with %s', async (operator, operand, expected) => {
    const { user } = await launch();
    await type(user, '5+3=');
    await press(user, [operator, operand, '=']);
    expect(resultText()).toBe(expected);
  });

  it('continues from a negative result', async () => {
    const { user } = await launch();
    await type(user, '3−10=');
    expect(resultText()).toBe('−7');
    await press(user, ['×', '2']);
    expect(expressionText()).toBe('−7 × 2');
    expect(resultText()).toBe('−14');
  });

  it('continues with % on the result', async () => {
    const { user } = await launch();
    await type(user, '5+3=');
    await press(user, ['%']);
    expect(expressionText()).toBe('8%');
    expect(resultText()).toBe('0.08');
  });

  it('starts a new calculation on a digit or the point', async () => {
    const { user } = await launch();
    await type(user, '5+3=');
    await press(user, ['7']);
    expect(expressionText()).toBe('7');
    expect(resultText()).toBe('');
    await type(user, '+1=');
    await press(user, ['.']);
    expect(expressionText()).toBe('0.');
  });

  it('keeps chaining several finished calculations', async () => {
    const { user } = await launch();
    await type(user, '2+3=');
    await press(user, ['×', '4', '=']);
    await press(user, ['−', '1', '0', '=']);
    expect(expressionText()).toBe('20 − 10');
    expect(resultText()).toBe('10');
  });

  it('DEL after = goes back to editing the expression', async () => {
    const { user } = await launch();
    await type(user, '5+12=');
    await press(user, ['DEL']);
    expect(expressionText()).toBe('5 + 1');
    expect(resultText()).toBe('6');
  });
});

describe('errors', () => {
  it.each(['8÷0', '8÷0.0', '8mod0', '1+8÷0', '8÷0%', '5mod0%'])(
    '%s shows the division by zero message',
    async input => {
      const { user } = await launch();
      await type(user, input);
      expect(screen.getByTestId('calculator-error')).toHaveTextContent(
        en['calculator.basic.error.divisionByZero'],
      );
      expect(screen.queryByTestId('calculator-result')).toBeNull();
    },
  );

  it('keeps the error shown on = and lets the user carry on typing', async () => {
    const { user } = await launch();
    await type(user, '8÷0');
    await press(user, ['=']);
    expect(error()).not.toBeNull();
    expect(expressionText()).toBe('8 ÷ 0');
    await press(user, ['+']);
    expect(error()).toBeNull(); // incomplete: no error, no result
    await press(user, ['2']);
    expect(error()).not.toBeNull(); // 8 ÷ 0 + 2 still divides by zero
  });

  it('does not report an error for an incomplete expression', async () => {
    const { user } = await launch();
    await type(user, '5÷');
    expect(error()).toBeNull();
    await press(user, ['0']);
    expect(error()).not.toBeNull();
  });

  it('never shows the invalid-expression error for key input', async () => {
    const { user } = await launch();
    for (const k of ['×', '%', '.', '.', '+', '+', '−', '−', '%', '%', '5']) {
      await press(user, [k]);
      expect(error()).toBeNull();
    }
  });
});

describe('language', () => {
  it('names the keys in Nepali and shows Devanagari digits', async () => {
    const { store, user } = await launch();
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    const name = (k: keyof typeof np) => np[k];
    expect(
      screen.getByRole('button', { name: name('calculator.basic.key.mod') }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: name('calculator.basic.key.percent'),
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: name('calculator.basic.key.equals') }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '७' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: '१' }));
    await user.press(screen.getByRole('button', { name: '२' }));
    await user.press(
      screen.getByRole('button', { name: name('calculator.basic.key.plus') }),
    );
    await user.press(screen.getByRole('button', { name: '३' }));
    expect(expressionText()).toBe('१२ + ३');
    expect(resultText()).toBe('१५');
  });

  it('shows the error message in Nepali', async () => {
    const { store, user } = await launch();
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    const k = (digit: string) => screen.getByRole('button', { name: digit });
    await user.press(k('८'));
    await user.press(
      screen.getByRole('button', { name: np['calculator.basic.key.divide'] }),
    );
    await user.press(k('०'));
    expect(screen.getByTestId('calculator-error')).toHaveTextContent(
      np['calculator.basic.error.divisionByZero'],
    );
  });

  it('keeps the calculation when the language changes', async () => {
    const { store, user } = await launch();
    await type(user, '12+3');
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    expect(expressionText()).toBe('१२ + ३');
    expect(resultText()).toBe('१५');
    await act(async () => {
      await store.dispatch(setLanguage('en'));
    });
    expect(expressionText()).toBe('12 + 3');
    expect(resultText()).toBe('15');
    expect(user).toBeDefined();
  });

  it('has a Nepali name for every key', () => {
    for (const keyName of Object.keys(en)) {
      if (keyName.startsWith('calculator.basic.')) {
        expect(np[keyName as keyof typeof np]).toBeTruthy();
      }
    }
  });
});

describe('themes', () => {
  async function inTheme(mode: 'light' | 'dark') {
    const { store, user } = await launch();
    await act(async () => {
      await store.dispatch(setTheme(mode));
    });
    return user;
  }

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ] as const)(
    'draws the keys and display with the %s theme',
    async (mode, colors) => {
      await inTheme(mode);
      const flat = (style: unknown) =>
        Object.assign({}, ...[style as object].flat(Infinity).filter(Boolean));
      const keyStyle = (id: string) =>
        flat(screen.getByTestId(`calculator-key-${id}`).props.style);

      expect(keyStyle('7').backgroundColor).toBe(colors.surface);
      expect(keyStyle('÷').backgroundColor).toBe(colors.border);
      expect(keyStyle('equals').backgroundColor).toBe(colors.primary);
      expect(flat(expression().props.style).color).toBe(colors.text);
    },
  );

  it('shows the error in the theme error color', async () => {
    for (const [mode, colors] of [
      ['light', lightColors],
      ['dark', darkColors],
    ] as const) {
      const { store, user } = await launch();
      await act(async () => {
        await store.dispatch(setTheme(mode));
      });
      await type(user, '8÷0');
      const style = [error()?.props.style].flat(Infinity).filter(Boolean);
      expect(Object.assign({}, ...style).color).toBe(colors.error);
      await screen.unmount();
    }
  });

  it('keeps the calculation when the theme changes', async () => {
    const { store, user } = await launch();
    await type(user, '12+3');
    await act(async () => {
      await store.dispatch(setTheme('dark'));
    });
    expect(expressionText()).toBe('12 + 3');
    expect(resultText()).toBe('15');
    expect(user).toBeDefined();
  });
});
