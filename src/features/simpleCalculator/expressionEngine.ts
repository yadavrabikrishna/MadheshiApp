import { CalcDecimal, type CalcDecimalValue } from '../interest/decimal';

/**
 * The Simple Calculator expression engine (Issue #82).
 *
 * Pure calculation code: no React, no React Native, no Redux, no storage, and
 * no `eval()` / `Function()`. The expression is tokenised by hand, then
 * evaluated with exact `decimal.js` arithmetic (the shared `CalcDecimal`
 * clone, so the global `Decimal` configuration is never touched).
 *
 * Syntax
 * - Numbers: ASCII digits with an optional decimal point (`12`, `10.5`,
 *   `.5`). A number may be negative: a `-` at the start, or right after an
 *   operator, is the number's sign (`-10 + 5`, `5 × -2`, `5 - -2`). Only one
 *   sign per number; `+` is never a sign.
 * - Operators: `+`, `-`, `×`, `÷`, `%`. For convenience `*` and `/` are read
 *   as `×` and `÷`, and the Unicode minus `−` as `-`.
 * - Spaces between tokens are ignored; a space inside a number is an error.
 * - No parentheses and no other characters.
 *
 * Semantics
 * - `×`, `÷` and `%` bind tighter than `+` and `-`; operators of the same
 *   precedence are applied left to right (`10 ÷ 5 × 2` is 4, `10 - 5 - 2` is 3).
 * - `%` is the remainder (modulo) of a truncated division: the result has the
 *   sign of the left operand, exactly like JavaScript's `%` but exact for
 *   decimals (`10 % 3` is 1, `-10 % 3` is -1, `10 % -3` is 1, `5.5 % 2` is
 *   1.5). It is NOT a percentage.
 * - Division or modulo by zero is reported as `divisionByZero`, never as a
 *   number.
 *
 * Results
 * - `ok`: the complete, valid expression's value as a plain decimal string
 *   (never exponent notation, never `-0`) at up to 100 significant digits.
 *   Display rounding belongs to the UI.
 * - `incomplete`: nothing to show yet because the user is still typing: empty
 *   input, a trailing operator (`5 +`, `5 × -`), a lone `-`, or a trailing
 *   decimal point (`5.`, `.`). No misleading partial result is returned.
 * - `invalid`: the text cannot become a valid expression by typing more
 *   (see `ExpressionError`).
 * - `divisionByZero`: a complete expression divides by zero. Incomplete and
 *   invalid input is reported as such first.
 */

/** The operators, in the order a keypad would show them. */
export const CALCULATOR_OPERATORS = ['+', '-', '×', '÷', '%'] as const;
export type CalculatorOperator = (typeof CALCULATOR_OPERATORS)[number];

/** Longest accepted expression (characters). Keeps arithmetic exact and cheap. */
export const MAX_EXPRESSION_LENGTH = 100;

export type ExpressionError =
  /** A character that is not a digit, `.`, an operator or a space. */
  | 'invalidCharacter'
  /** A number with more than one decimal point, or a point not at the end (`5.+3`). */
  | 'invalidNumber'
  /** An operator where a number belongs: leading `×`, `5 × ÷ 2`, `5 + + 2`, `--5`. */
  | 'misplacedOperator'
  /** Two numbers with nothing between them (`1 2`). */
  | 'missingOperator'
  /** Longer than `MAX_EXPRESSION_LENGTH`. */
  | 'tooLong';

export type ExpressionResult =
  | { readonly status: 'ok'; readonly value: string }
  | { readonly status: 'incomplete' }
  | { readonly status: 'divisionByZero' }
  | { readonly status: 'invalid'; readonly error: ExpressionError };

type Token =
  | { readonly kind: 'number'; readonly value: CalcDecimalValue }
  | { readonly kind: 'operator'; readonly operator: CalculatorOperator };

type Tokenized =
  | { readonly ok: true; readonly tokens: readonly Token[] }
  | { readonly ok: false; readonly result: ExpressionResult };

const INCOMPLETE: ExpressionResult = { status: 'incomplete' };
const invalid = (error: ExpressionError): Tokenized => ({
  ok: false,
  result: { status: 'invalid', error },
});

const OPERATOR_ALIASES: Readonly<Record<string, CalculatorOperator>> = {
  '+': '+',
  '-': '-',
  '−': '-', // −
  '×': '×',
  '*': '×',
  '÷': '÷',
  '/': '÷',
  '%': '%',
};

const isDigitOrPoint = (char: string) =>
  (char >= '0' && char <= '9') || char === '.';
const isSpace = (char: string) =>
  char === ' ' || char === '\t' || char === '\n' || char === ' ';

/** Reads the text left to right, stopping at the first problem. */
function tokenize(expression: string): Tokenized {
  const tokens: Token[] = [];
  let expectOperand = true;
  let negative = false;
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (isSpace(char)) {
      index += 1;
      continue;
    }

    if (isDigitOrPoint(char)) {
      let end = index;
      while (end < expression.length && isDigitOrPoint(expression[end])) {
        end += 1;
      }
      const text = expression.slice(index, end);
      if (!expectOperand) {
        return invalid('missingOperator');
      }
      if (text.split('.').length > 2) {
        return invalid('invalidNumber');
      }
      if (text.endsWith('.')) {
        // "5." or ".": still being typed at the very end, wrong anywhere else.
        const rest = expression.slice(end);
        return [...rest].every(isSpace)
          ? { ok: false, result: INCOMPLETE }
          : invalid('invalidNumber');
      }
      const magnitude = new CalcDecimal(text);
      tokens.push({
        kind: 'number',
        value: negative ? magnitude.negated() : magnitude,
      });
      negative = false;
      expectOperand = false;
      index = end;
      continue;
    }

    const operator = OPERATOR_ALIASES[char];
    if (operator === undefined) {
      return invalid('invalidCharacter');
    }
    if (expectOperand) {
      // Only one `-` may precede a number, as its sign.
      if (operator !== '-' || negative) {
        return invalid('misplacedOperator');
      }
      negative = true;
    } else {
      tokens.push({ kind: 'operator', operator });
      expectOperand = true;
    }
    index += 1;
  }

  // Empty, a trailing operator, or a lone sign: nothing to calculate yet.
  return expectOperand
    ? { ok: false, result: INCOMPLETE }
    : { ok: true, tokens };
}

const isHigherPrecedence = (operator: CalculatorOperator) =>
  operator === '×' || operator === '÷' || operator === '%';

/** Applies one operator; `undefined` means division (or modulo) by zero. */
function apply(
  operator: CalculatorOperator,
  left: CalcDecimalValue,
  right: CalcDecimalValue,
): CalcDecimalValue | undefined {
  switch (operator) {
    case '+':
      return left.plus(right);
    case '-':
      return left.minus(right);
    case '×':
      return left.times(right);
    case '÷':
      return right.isZero() ? undefined : left.div(right);
    case '%':
      // Truncated remainder: the sign follows the left operand.
      return right.isZero() ? undefined : left.mod(right);
  }
}

/** Evaluates well-formed tokens (number, then operator number, ...). */
function evaluateTokens(tokens: readonly Token[]): ExpressionResult {
  // Pass 1: × ÷ % left to right, collapsing them into the surrounding terms.
  const terms: CalcDecimalValue[] = [];
  const additive: CalculatorOperator[] = [];
  let current = (tokens[0] as { value: CalcDecimalValue }).value;

  for (let i = 1; i < tokens.length; i += 2) {
    const operator = (tokens[i] as { operator: CalculatorOperator }).operator;
    const operand = (tokens[i + 1] as { value: CalcDecimalValue }).value;
    if (isHigherPrecedence(operator)) {
      const next = apply(operator, current, operand);
      if (next === undefined) {
        return { status: 'divisionByZero' };
      }
      current = next;
    } else {
      terms.push(current);
      additive.push(operator);
      current = operand;
    }
  }
  terms.push(current);

  // Pass 2: + - left to right.
  let total = terms[0];
  for (let i = 0; i < additive.length; i += 1) {
    total = apply(additive[i], total, terms[i + 1]) as CalcDecimalValue;
  }
  // Never show "-0".
  return { status: 'ok', value: total.isZero() ? '0' : total.toFixed() };
}

/**
 * Evaluates a calculator expression safely (see the file comment for the
 * syntax and rules). Never throws for any string input.
 */
export function evaluateExpression(expression: string): ExpressionResult {
  if (typeof expression !== 'string') {
    return { status: 'invalid', error: 'invalidCharacter' };
  }
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return { status: 'invalid', error: 'tooLong' };
  }
  const tokenized = tokenize(expression);
  return tokenized.ok ? evaluateTokens(tokenized.tokens) : tokenized.result;
}
