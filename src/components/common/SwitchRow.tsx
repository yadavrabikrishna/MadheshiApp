import { Switch, Text, View } from 'react-native';

import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';

interface SwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** A labelled on/off setting. */
export function SwitchRow({ label, value, onValueChange }: SwitchRowProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.onPrimary}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  row: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 16,
  },
  label: { flex: 1, fontSize: 16, color: theme.colors.text },
});
