import { Pressable, Text } from 'react-native';

import { useThemedStyles, type AppTheme } from '../../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** `primary` is the main action; `secondary` is an outlined, quieter one. */
  variant?: 'primary' | 'secondary';
  /** Fill the available width (e.g. in a row of buttons). */
  fill?: boolean;
  /** Unavailable: dimmed, announced as disabled, and pressing does nothing. */
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  fill = false,
  disabled = false,
}: ButtonProps) {
  const styles = useThemedStyles(createStyles);
  const primary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      style={[
        styles.button,
        primary ? styles.primary : styles.secondary,
        fill && styles.fill,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          primary ? styles.primaryLabel : styles.secondaryLabel,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => ({
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
  },
  fill: { flex: 1 },
  disabled: { opacity: 0.5 },
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  primaryLabel: { color: theme.colors.onPrimary },
  secondaryLabel: { color: theme.colors.text },
});
