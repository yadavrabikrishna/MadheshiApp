import type { IconName } from '../../../components';
import type { CalculatorKey } from '../../../features/simpleCalculator';
import type { TranslationKey } from '../../../i18n';

export type KeyVariant = 'digit' | 'operator' | 'control' | 'equals';

export interface KeypadKey {
  /** What pressing it does (the input state machine's key). */
  key: CalculatorKey;
  /** The text on the key; digits are localized when drawn. */
  label: string;
  /** Replaces the label when set (the delete key). */
  icon?: IconName;
  /** The spoken name; digits and the label-only keys use their label. */
  accessibilityKey?: TranslationKey;
  variant: KeyVariant;
}

const digit = (value: CalculatorKey): KeypadKey => ({
  key: value,
  label: value,
  variant: 'digit',
});

/**
 * The keypad, row by row. `mod` (remainder) and `%` (percent) are separate
 * keys. C clears everything; the backspace icon deletes the last item.
 */
export const KEYPAD_ROWS: readonly (readonly KeypadKey[])[] = [
  [
    {
      key: 'clear',
      label: 'C',
      accessibilityKey: 'calculator.basic.key.clear',
      variant: 'control',
    },
    {
      key: 'delete',
      label: 'DEL',
      icon: 'backspace-outline',
      accessibilityKey: 'calculator.basic.key.delete',
      variant: 'control',
    },
    {
      key: 'mod',
      label: 'mod',
      accessibilityKey: 'calculator.basic.key.mod',
      variant: 'operator',
    },
    {
      key: '÷',
      label: '÷',
      accessibilityKey: 'calculator.basic.key.divide',
      variant: 'operator',
    },
  ],
  [
    digit('7'),
    digit('8'),
    digit('9'),
    {
      key: '×',
      label: '×',
      accessibilityKey: 'calculator.basic.key.multiply',
      variant: 'operator',
    },
  ],
  [
    digit('4'),
    digit('5'),
    digit('6'),
    {
      key: '−',
      label: '−',
      accessibilityKey: 'calculator.basic.key.minus',
      variant: 'operator',
    },
  ],
  [
    digit('1'),
    digit('2'),
    digit('3'),
    {
      key: '+',
      label: '+',
      accessibilityKey: 'calculator.basic.key.plus',
      variant: 'operator',
    },
  ],
  [
    digit('0'),
    {
      key: '.',
      label: '.',
      accessibilityKey: 'calculator.basic.key.decimal',
      variant: 'digit',
    },
    {
      key: '%',
      label: '%',
      accessibilityKey: 'calculator.basic.key.percent',
      variant: 'operator',
    },
    {
      key: 'equals',
      label: '=',
      accessibilityKey: 'calculator.basic.key.equals',
      variant: 'equals',
    },
  ],
];
