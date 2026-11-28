import { Pressable, Text, View } from 'react-native';

import { Icon } from '../../../components';
import type { CalculatorKey } from '../../../features/simpleCalculator';
import { useTranslation } from '../../../i18n';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme';
import { KEYPAD_ROWS, type KeyVariant } from './keypadLayout';

interface CalculatorKeypadProps {
  onPress: (key: CalculatorKey) => void;
}

/**
 * The on-screen keys. They are the only input (there is no text field, so the
 * device keyboard never appears). Digit labels follow the language's digits.
 */
export function CalculatorKeypad({ onPress }: CalculatorKeypadProps) {
  const { t, formatDigits } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const keyStyle: Record<KeyVariant, object> = {
    digit: styles.digitKey,
    operator: styles.operatorKey,
    control: styles.operatorKey,
    equals: styles.equalsKey,
  };
  const labelStyle: Record<KeyVariant, object> = {
    digit: styles.digitLabel,
    operator: styles.operatorLabel,
    control: styles.controlLabel,
    equals: styles.equalsLabel,
  };

  return (
    <View
      style={styles.keypad}
      accessibilityLabel={t('calculator.basic.keypad.label')}
    >
      {KEYPAD_ROWS.map(row => (
        <View key={row[0].key} style={styles.row}>
          {row.map(item => {
            const label =
              item.accessibilityKey === undefined
                ? formatDigits(item.label)
                : t(item.accessibilityKey);
            return (
              <Pressable
                key={item.key}
                testID={`calculator-key-${item.key}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onPress(item.key)}
                style={({ pressed }) => [
                  styles.key,
                  keyStyle[item.variant],
                  pressed && styles.pressed,
                ]}
              >
                {item.icon === undefined ? (
                  <Text style={[styles.label, labelStyle[item.variant]]}>
                    {formatDigits(item.label)}
                  </Text>
                ) : (
                  <Icon name={item.icon} size={26} color={theme.colors.error} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  keypad: { gap: 10 },
  row: { flexDirection: 'row' as const, gap: 10 },
  key: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
  },
  pressed: { opacity: 0.6 },
  digitKey: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  operatorKey: {
    backgroundColor: theme.colors.border,
    borderColor: theme.colors.border,
  },
  equalsKey: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  label: { fontSize: 24, fontWeight: '600' as const },
  digitLabel: { color: theme.colors.text },
  operatorLabel: { color: theme.colors.text },
  controlLabel: { color: theme.colors.error },
  equalsLabel: { color: theme.colors.onPrimary },
});
