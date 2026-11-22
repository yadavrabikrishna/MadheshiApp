import { Text, View } from 'react-native';

import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';
import { Icon } from './Icon';

export interface FieldErrorProps {
  /** The localized validation message. */
  message: string;
  /** Spoken before the message, e.g. "Error". The icon means it is not color-only. */
  prefix?: string;
}

/**
 * One validation message: an icon plus text, announced once as an alert / live
 * region. Used under a single field (TextField) or under a group of fields.
 */
export function FieldError({ message, prefix }: FieldErrorProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={styles.errorRow}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={prefix ? `${prefix}: ${message}` : message}
    >
      <Icon name="alert-circle-outline" size={18} color={theme.colors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
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
