import type { Ref } from 'react';
import {
  Text,
  TextInput,
  View,
  type ReturnKeyTypeOptions,
  type StyleProp,
  type ViewStyle,
  type TextInputInstance,
  type TextInputSelectionChangeEvent,
} from 'react-native';

import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';
import { FieldError } from './FieldError';

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
  /**
   * Shows the invalid border and icon-free styling without rendering any
   * message, for a field whose message is shown elsewhere (for example one
   * shared message under a row of fields). Fields with `errors` are invalid
   * anyway.
   */
  invalid?: boolean;
  /**
   * Set to false to keep `hint` as the spoken accessibility hint only, when the
   * visible text is shown elsewhere. Defaults to true.
   */
  hintVisible?: boolean;
  /** Overrides the outer wrapper style (for example the bottom margin). */
  containerStyle?: StyleProp<ViewStyle>;
  /** A short symbol shown before the input, e.g. "Rs.". */
  prefix?: string;
  maxLength?: number;
  /** The underlying input, so a form can move focus between fields. */
  ref?: Ref<TextInputInstance>;
  /** "next" on every field with a following field, "done" on the last one. */
  returnKeyType?: ReturnKeyTypeOptions;
  /**
   * "submit" keeps focus (and the keyboard) when the action key is pressed, so
   * `onSubmitEditing` can focus the next field. "blurAndSubmit" closes it.
   */
  submitBehavior?: 'submit' | 'blurAndSubmit';
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
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
  invalid: invalidProp = false,
  hintVisible = true,
  containerStyle,
  prefix,
  maxLength,
  ref,
  returnKeyType,
  submitBehavior,
  onSubmitEditing,
  onFocus,
  onBlur,
  selection,
  onSelectionChange,
}: TextFieldProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const invalid = invalidProp || errors.length > 0;

  return (
    <View style={[styles.field, containerStyle]}>
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
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.primary}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          submitBehavior={submitBehavior}
          onSubmitEditing={onSubmitEditing}
          onFocus={onFocus}
          onBlur={onBlur}
          selection={selection}
          onSelectionChange={onSelectionChange}
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel={label}
          accessibilityHint={hint}
        />
      </View>
      {hint && hintVisible ? <Text style={styles.hint}>{hint}</Text> : null}
      {errors.map(message => (
        <FieldError key={message} message={message} prefix={errorPrefix} />
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
});
