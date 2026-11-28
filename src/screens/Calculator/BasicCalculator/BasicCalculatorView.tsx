import { useMemo, useReducer } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  INITIAL_CALCULATOR_STATE,
  evaluateExpression,
  expressionText,
  formatCalculatorResult,
  pressKey,
} from '../../../features/simpleCalculator';
import { useTranslation } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { CalculatorKeypad } from './CalculatorKeypad';

/** Display text for an engine value: the minus sign, and no `-0`. */
const displayNumber = (value: string) => value.replace('-', '−');

/**
 * Basic Calculator: a feature of Madheshi App itself (not the device's
 * calculator app). Every key goes through the input state machine and every
 * value comes from `evaluateExpression`; nothing is parsed or calculated here.
 * Local state only (it is not saved).
 */
export function BasicCalculatorView() {
  const { t, formatDigits } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [state, press] = useReducer(pressKey, INITIAL_CALCULATOR_STATE);

  const expression = expressionText(state.tokens);
  const evaluation = useMemo(
    () => evaluateExpression(expression),
    [expression],
  );
  const finished = state.result !== null;

  // What the line under the expression says: the final result after "=", the
  // live result of a complete expression, an error, or nothing yet.
  let resultText = '';
  let errorText = '';
  if (state.result !== null) {
    resultText = displayNumber(state.result);
  } else if (evaluation.status === 'ok') {
    // A lone number is its own value; a live result is only for an operation.
    resultText =
      state.tokens.length > 1
        ? displayNumber(formatCalculatorResult(evaluation.value))
        : '';
  } else if (evaluation.status === 'divisionByZero') {
    errorText = t('calculator.basic.error.divisionByZero');
  } else if (evaluation.status === 'invalid') {
    errorText = t('calculator.basic.error.invalid');
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="always"
    >
      <View
        style={styles.display}
        accessibilityLabel={t('calculator.basic.display.label')}
      >
        <Text
          testID="calculator-expression"
          accessibilityLabel={t('calculator.basic.expression.label')}
          accessibilityValue={{ text: formatDigits(expression) }}
          style={[styles.expression, finished && styles.expressionFinished]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {formatDigits(expression === '' ? '0' : expression)}
        </Text>
        {errorText !== '' ? (
          <Text
            testID="calculator-error"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.error}
          >
            {errorText}
          </Text>
        ) : (
          <Text
            testID="calculator-result"
            accessibilityLabel={t('calculator.basic.result.label')}
            accessibilityValue={{ text: formatDigits(resultText) }}
            accessibilityLiveRegion="polite"
            style={[styles.result, finished && styles.resultFinished]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatDigits(resultText)}
          </Text>
        )}
      </View>
      <CalculatorKeypad onPress={press} />
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) => ({
  content: { flexGrow: 1, padding: 16, gap: 16 },
  display: {
    flexGrow: 1,
    minHeight: 120,
    justifyContent: 'flex-end' as const,
    alignItems: 'flex-end' as const,
    gap: 6,
    paddingHorizontal: 8,
  },
  expression: {
    alignSelf: 'stretch' as const,
    textAlign: 'right' as const,
    fontSize: 34,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  expressionFinished: { fontSize: 22, color: theme.colors.textSecondary },
  result: {
    alignSelf: 'stretch' as const,
    minHeight: 34,
    textAlign: 'right' as const,
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  resultFinished: {
    fontSize: 44,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  error: {
    alignSelf: 'stretch' as const,
    minHeight: 34,
    textAlign: 'right' as const,
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.error,
  },
});
