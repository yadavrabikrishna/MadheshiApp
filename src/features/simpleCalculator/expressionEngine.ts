import { CalcDecimal, type CalcDecimalValue } from '../interest/decimal';

/**
 * The Simple Calculator expression engine (Issues #82 and its follow-up).
 *
 * Pure calculation code: no React, no React Native, no Redux, no storage, and
 * no `eval()` / `Function()`. The expression is tokenised by hand, then
 * evaluated with exact `decimal.js` arithmetic (the shared `CalcDecimal`
 * clone, so the global `Decimal` configuration is never touched).
 *
 * Two different things, two different spellings
 * - `mod` is the MODULO (remainder) operator, a binary operator written as
 *   the word `mod` (`10 mod 3` is 1). It is never written `%`.
 * - `%` is the PERCENT sign, a postfix on a number (`10%`). It is never the
 *   remainder. (`5%3` is therefore invalid: a number cannot follow `%`.)
 *
 * Syntax
 * - Numbers: ASCII digits with an optional decimal point (`12`, `10.5`,
 *   `.5`). A number may be negative: a `-` at the start, or right after an
 *   operator, is the number's sign (`-10 + 5`, `5 × -2`, `5 - -2`). Only one
 *   sign per number; `+` is never a sign. A number may be followed by one
 *   `%` (`10%`, `-2.5%`), which makes it a percentage.
 * - Operators: `+`, `-`, `×`, `÷`, `mod` (case-insensitive). For convenience
 *   `*` and `/` are read as `×` and `÷`, and the Unicode minus `−` as `-`.
 * - Spaces between tokens are ignored; a space inside a number is an error.
 *   `mod` needs no spaces (`10mod3`).
 * - No parentheses and no other characters or words.
 *
 * Operators
 * - `×`, `÷` and `mod` bind tighter than `+` and `-`; operators of the same
 *   precedence are applied left to right (`10 ÷ 5 × 2` is 4, `10 - 5 - 2` is 3).
 * - `mod` is the remainder of a truncated division: the result has the sign
 *   of the left operand, like JavaScript's `%` but exact for decimals
 *   (`10 mod 3` is 1, `-10 mod 3` is -1, `10 mod -3` is 1, `5.5 mod 2` is 1.5).
 * - Division or `mod` by zero is reported as `divisionByZero`, never as a
 *   number.
 *
 * Percent (conventional calculator behaviour; `p%` means `p / 100`)
 * - Add or subtract a percentage: when a term is only a percentage directly
 *   after `+` or `-`, the percentage is taken OF THE RUNNING TOTAL to its
 *   left: `200 + 10%` is 220, `200 − 10%` is 180, `100 + 10 + 10%` is 121
 *   (10% of 110), `100 + 50 × 2 + 10%` is 220 (10% of 200). The running total
 *   is everything to the left of that `+`/`-` (the usual precedence applies
 *   first).
 * - Anywhere else the percentage is just the fraction `p / 100`: `200 × 10%`
 *   is 20, `200 ÷ 10%` is 2000, `10%` alone is 0.1, `10% + 5` is 5.1,
 *   `200 + 10% × 2` is 200.2 (the term is not only a percentage).
 * - `0%` is zero, so `5 ÷ 0%` is `divisionByZero`.
 *
 * Results
 * - `ok`: the complete, valid expression's value as a plain decimal string
 *   (never exponent notation, never `-0`) at up to 100 significant digits.
 *   Display rounding belongs to the UI.
 * - `incomplete`: nothing to show yet because the user is still typing: empty
 *   input, a trailing operator (`5 +`, `5 mod`, `5 × -`), a lone `-`, or a
 *   trailing decimal point (`5.`, `.`). No misleading partial result is
 *   returned.
 * - `invalid`: the text cannot become a valid expression by typing more
 *   (see `ExpressionError`).
 * - `divisionByZero`: a complete expression divides by zero. Incomplete and
 *   invalid input is reported as such first.
 */

/** The binary operators, in the order a keypad would show them. */
export const CALCULATOR_OPERATORS = ['+', '-', '×', '÷', 'mod'] as const;
export type CalculatorOperator = (typeof CALCULATOR_OPERATORS)[number];

/** The postfix percent sign. It is not an operator and not the remainder. */
export const PERCENT_SIGN = '%';

/** Longest accepted expression (characters). Keeps arithmetic exact and cheap. */
export const MAX_EXPRESSION_LENGTH = 100;

export type ExpressionError =
  /** A character or word that is not a digit, `.`, an operator, `mod`, `%` or a space. */
  | 'invalidCharacter'
  /** A number with more than one decimal point, or a point not at the end (`5.+3`). */
  | 'invalidNumber'
  /** An operator or `%` where a number belongs: leading `×` or `%`, `5 × ÷ 2`, `5 + + 2`, `--5`, `5%%`. */
  | 'misplacedOperator'
  /** Two numbers with nothing between them (`1 2`, `5% 3`). */
  | 'missingOperator'
  /** Longer than `MAX_EXPRESSION_LENGTH`. */
  | 'tooLong';

export type ExpressionResult =
  | { readonly status: 'ok'; readonly value: string }
  | { readonly status: 'incomplete' }
  | { readonly status: 'divisionByZero' }
  | { readonly status: 'invalid'; readonly error: ExpressionError };

type Token =
  | {
      readonly kind: 'number';
      /** The signed number as typed (the `10` of `10%`). */
      readonly value: CalcDecimalValue;
      readonly percent: boolean;
    }
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
};

const isDigitOrPoint = (char: string) =>
  (char >= '0' && char <= '9') || char === '.';
const isLetter = (char: string) =>
  (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
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
        percent: false,
      });
      negative = false;
      expectOperand = false;
      index = end;
      continue;
    }

    if (char === PERCENT_SIGN) {
      const last = tokens[tokens.length - 1];
      // `%` only follows a number, once.
      if (expectOperand || last.kind !== 'number' || last.percent) {
        return invalid('misplacedOperator');
      }
      tokens[tokens.length - 1] = { ...last, percent: true };
      index += 1;
      continue;
    }

    let operator: CalculatorOperator | undefined;
    if (isLetter(char)) {
      let end = index;
      while (end < expression.length && isLetter(expression[end])) {
        end += 1;
      }
      if (expression.slice(index, end).toLowerCase() !== 'mod') {
        return invalid('invalidCharacter');
      }
      operator = 'mod';
      index = end - 1; // the shared `index += 1` below consumes the last letter
    } else {
      operator = OPERATOR_ALIASES[char];
    }
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
  operator === '×' || operator === '÷' || operator === 'mod';

/** Applies one operator; `undefined` means division (or mod) by zero. */
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
    case 'mod':
      // Truncated remainder: the sign follows the left operand.
      return right.isZero() ? undefined : left.mod(right);
  }
}

/** `p%` as a fraction: `p / 100`; a plain number is unchanged. */
const asFraction = (token: Extract<Token, { kind: 'number' }>) =>
  token.percent ? token.value.div(100) : token.value;

interface Term {
  /** The term's value (a percentage counts as its fraction). */
  readonly value: CalcDecimalValue;
  /** Set when the term is only a percentage: the fraction `p / 100`. */
  readonly percentOfTotal: CalcDecimalValue | null;
}

/** Evaluates well-formed tokens (number, then operator number, ...). */
function evaluateTokens(tokens: readonly Token[]): ExpressionResult {
  const numberAt = (i: number) =>
    tokens[i] as Extract<Token, { kind: 'number' }>;

  // Pass 1: × ÷ mod left to right, collapsing them into additive terms.
  const terms: Term[] = [];
  const additive: CalculatorOperator[] = [];
  let current = asFraction(numberAt(0));
  let lonePercent: CalcDecimalValue | null = numberAt(0).percent
    ? current
    : null;

  for (let i = 1; i < tokens.length; i += 2) {
    const operator = (tokens[i] as { operator: CalculatorOperator }).operator;
    const operand = numberAt(i + 1);
    const fraction = asFraction(operand);
    if (isHigherPrecedence(operator)) {
      const next = apply(operator, current, fraction);
      if (next === undefined) {
        return { status: 'divisionByZero' };
      }
      current = next;
      lonePercent = null;
    } else {
      terms.push({ value: current, percentOfTotal: lonePercent });
      additive.push(operator);
      current = fraction;
      lonePercent = operand.percent ? fraction : null;
    }
  }
  terms.push({ value: current, percentOfTotal: lonePercent });

  // Pass 2: + - left to right. A lone percentage is taken of the running total.
  let total = terms[0].value;
  for (let i = 0; i < additive.length; i += 1) {
    const term = terms[i + 1];
    const amount =
      term.percentOfTotal === null
        ? term.value
        : total.times(term.percentOfTotal);
    total = apply(additive[i], total, amount) as CalcDecimalValue;
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
