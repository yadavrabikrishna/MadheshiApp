import { evaluateExpression } from './expressionEngine';
import { formatCalculatorResult } from './formatResult';

/**
 * Keypad input for the Simple Calculator (Issue #83): a pure state machine,
 * independent of React. It decides what each key press does to the expression;
 * it never parses or calculates. Every value comes from `evaluateExpression`,
 * which is also the safety net: a key press that would make the expression
 * `invalid` is ignored.
 *
 * The expression is kept as tokens: numbers (`12.5`, `−2`, a typed `5.`), the
 * operators `+ − × ÷ mod`, and `%` (a postfix on the number before it).
 * `mod` is the remainder and `%` is the percent sign, exactly as in the engine.
 *
 * Behaviour
 * - Digits and `.` extend the current number (no second `.`, no leading zeros,
 *   `.` at the start of a number gives `0.`). A digit or `.` after `%` is ignored.
 * - An operator after an operator replaces it (`5 + ` then `×` gives `5 ×`).
 *   `−` after `× ÷ mod` is a negative sign (`5 × −2`); another operator then
 *   replaces the whole pair. An empty expression only accepts `−` (a sign).
 *   A typed `5.` loses its point when an operator or `%` follows.
 * - `%` only follows a finished number (not an operator, a lone sign, or `%`).
 * - `=` finishes a complete, valid expression: `result` holds the displayed
 *   value. Incomplete or erroring expressions stay as they are (the error is
 *   shown from the engine's result).
 * - After `=`: a digit or `.` starts a new calculation; an operator or `%`
 *   continues from the result; DEL leaves the finished state and deletes the
 *   last item of the expression.
 * - DEL removes the last character of a number, or a whole operator / `%`.
 *   `clear` (C) resets everything.
 */

export type CalculatorOperatorKey = '+' | '−' | '×' | '÷' | 'mod';
export type CalculatorDigitKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9';
export type CalculatorKey =
  | CalculatorDigitKey
  | '.'
  | CalculatorOperatorKey
  | '%'
  | 'clear'
  | 'delete'
  | 'equals';

export interface CalculatorInputState {
  /** The expression, one entry per number / operator / `%`. */
  readonly tokens: readonly string[];
  /** The displayed result after `=`, otherwise `null`. */
  readonly result: string | null;
}

export const INITIAL_CALCULATOR_STATE: CalculatorInputState = {
  tokens: [],
  result: null,
};

const OPERATORS: ReadonlySet<string> = new Set(['+', '−', '×', '÷', 'mod']);
const SIGN_FOLLOWS: ReadonlySet<string> = new Set(['×', '÷', 'mod']);
const MINUS = '−';
const PERCENT = '%';

const isDigit = (key: string): key is CalculatorDigitKey =>
  key.length === 1 && key >= '0' && key <= '9';
const isOperatorKey = (key: string): key is CalculatorOperatorKey =>
  OPERATORS.has(key);

/** The expression as text for display and for `evaluateExpression`. */
export function expressionText(tokens: readonly string[]): string {
  return tokens.reduce(
    (text, token) =>
      token === PERCENT
        ? text + token
        : text === ''
        ? token
        : `${text} ${token}`,
    '',
  );
}

type Kind = 'none' | 'percent' | 'number' | 'sign' | 'operator';

/** What the last token is. A lone `−` is a sign at the start or after an operator. */
function lastKind(tokens: readonly string[]): Kind {
  const last = tokens[tokens.length - 1];
  if (last === undefined) {
    return 'none';
  }
  if (last === PERCENT) {
    return 'percent';
  }
  if (last === MINUS) {
    return tokens.length === 1 || OPERATORS.has(tokens[tokens.length - 2])
      ? 'sign'
      : 'operator';
  }
  return OPERATORS.has(last) ? 'operator' : 'number';
}

const withLast = (tokens: readonly string[], token: string) => [
  ...tokens.slice(0, -1),
  token,
];
/** `5.` is shown while typing; once finished it is `5`. */
const finishNumber = (token: string) =>
  token.endsWith('.') ? token.slice(0, -1) : token;

function typeDigit(
  tokens: readonly string[],
  digit: CalculatorDigitKey,
): readonly string[] | null {
  const last = tokens[tokens.length - 1];
  switch (lastKind(tokens)) {
    case 'percent':
      return null;
    case 'number':
      // 0 then a digit replaces the 0 (no leading zeros): 05 is 5, −05 is −5.
      return last === '0' || last === `${MINUS}0`
        ? withLast(tokens, last.slice(0, -1) + digit)
        : withLast(tokens, last + digit);
    case 'sign':
      return withLast(tokens, MINUS + digit);
    default:
      return [...tokens, digit];
  }
}

function typePoint(tokens: readonly string[]): readonly string[] | null {
  const last = tokens[tokens.length - 1];
  switch (lastKind(tokens)) {
    case 'percent':
      return null;
    case 'number':
      return last.includes('.') ? null : withLast(tokens, `${last}.`);
    case 'sign':
      return withLast(tokens, `${MINUS}0.`);
    default:
      return [...tokens, '0.'];
  }
}

function typeOperator(
  tokens: readonly string[],
  operator: CalculatorOperatorKey,
): readonly string[] | null {
  const last = tokens[tokens.length - 1];
  switch (lastKind(tokens)) {
    case 'none':
      return operator === MINUS ? [MINUS] : null;
    case 'number':
      return [...withLast(tokens, finishNumber(last)), operator];
    case 'percent':
      return [...tokens, operator];
    case 'sign':
      // Only a sign so far: nothing to operate on. After an operator, another
      // operator replaces the operator and its sign.
      return tokens.length === 1 || operator === MINUS
        ? null
        : [...tokens.slice(0, -2), operator];
    case 'operator':
      if (operator === MINUS && SIGN_FOLLOWS.has(last)) {
        return [...tokens, MINUS]; // 5 × −
      }
      return operator === last ? null : withLast(tokens, operator);
  }
}

function typePercent(tokens: readonly string[]): readonly string[] | null {
  return lastKind(tokens) === 'number'
    ? [...withLast(tokens, finishNumber(tokens[tokens.length - 1])), PERCENT]
    : null;
}

function deleteLast(tokens: readonly string[]): readonly string[] {
  const last = tokens[tokens.length - 1];
  if (last === undefined) {
    return tokens;
  }
  if (last === PERCENT || OPERATORS.has(last)) {
    return tokens.slice(0, -1);
  }
  const shorter = last.slice(0, -1);
  return shorter === '' || shorter === MINUS
    ? tokens.slice(0, -1)
    : withLast(tokens, shorter);
}

function applyKey(
  state: CalculatorInputState,
  key: CalculatorKey,
): CalculatorInputState {
  if (key === 'clear') {
    return INITIAL_CALCULATOR_STATE;
  }
  if (key === 'delete') {
    return state.tokens.length === 0
      ? state
      : { tokens: deleteLast(state.tokens), result: null };
  }
  if (key === 'equals') {
    if (state.result !== null || state.tokens.length === 0) {
      return state;
    }
    const evaluation = evaluateExpression(expressionText(state.tokens));
    return evaluation.status === 'ok'
      ? {
          tokens: state.tokens,
          result: formatCalculatorResult(evaluation.value),
        }
      : state;
  }

  // A finished calculation: digits start over, operators and % continue.
  let tokens = state.tokens;
  if (state.result !== null) {
    tokens =
      isDigit(key) || key === '.' ? [] : [state.result.replace('-', MINUS)];
  }

  let next: readonly string[] | null;
  if (isDigit(key)) {
    next = typeDigit(tokens, key);
  } else if (key === '.') {
    next = typePoint(tokens);
  } else if (key === PERCENT) {
    next = typePercent(tokens);
  } else if (isOperatorKey(key)) {
    next = typeOperator(tokens, key);
  } else {
    next = null;
  }
  return next === null ? state : { tokens: next, result: null };
}

/**
 * The state after one key press. Invalid sequences are ignored (the same state
 * object is returned), judged by the engine itself.
 */
export function pressKey(
  state: CalculatorInputState,
  key: CalculatorKey,
): CalculatorInputState {
  const next = applyKey(state, key);
  if (next === state) {
    return state;
  }
  if (
    next.result === null &&
    evaluateExpression(expressionText(next.tokens)).status === 'invalid'
  ) {
    return state;
  }
  return next;
}
