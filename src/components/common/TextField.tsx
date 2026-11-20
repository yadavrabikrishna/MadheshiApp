import {
  Text,
  TextInput,
  View,
  type TextInputSelectionChangeEvent,
} from 'react-native';

import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';
import { Icon } from './Icon';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType: 'decimal-pad' | 'number-pad';
  placeholder?: string;
  /** Helper text shown under the field. */
  hint?: string;
  /** Validation messages for this field (already localized). */
  errors?: readonly string[];
  /** Spoken before each error, e.g. "Error". Errors also show an icon, not just color. */
  errorPrefix?: string;
  /** A short symbol shown before the input, e.g. "Rs.". */
  prefix?: string;
  maxLength?: number;
  /** Controlled caret, used by masked inputs. */
  selection?: { start: number; end: number };
  onSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
}

const NO_ERRORS: readonly string[] = [];

/**
 * A labeled numeric text field with an optional hint and inline validation
 * messages. The field keeps its normal hint. Each error is announced once, by
 * its own alert / live-region row (not repeated in the hint), and is never the
 * only signal: it has an icon and a thicker border as well as color.
 */
export function TextField({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  hint,
  errors = NO_ERRORS,
  errorPrefix,
  prefix,
  maxLength,
  selection,
  onSelectionChange,
}: TextFieldProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const invalid = errors.length > 0;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, invalid && styles.inputRowInvalid]}>
        {prefix ? (
          <Text
            style={styles.prefix}
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.primary}
          maxLength={maxLength}
          selection={selection}
          onSelectionChange={onSelectionChange}
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel={label}
          accessibilityHint={hint}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {errors.map(message => (
        <View
          key={message}
          style={styles.errorRow}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={
            errorPrefix ? `${errorPrefix}: ${message}` : message
          }
        >
          <Icon
            name="alert-circle-outline"
            size={18}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{message}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  field: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inputRowInvalid: { borderWidth: 2, borderColor: theme.colors.error },
  prefix: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  errorRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.error,
  },
});
