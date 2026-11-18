import { Pressable, Text, View } from 'react-native';

import { useThemedStyles, type AppTheme } from '../../theme';

export interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
}

interface SegmentedControlProps<Value extends string> {
  options: SegmentOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  accessibilityLabel: string;
}

/** A small single-choice selector (radio group). */
export function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<Value>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flexDirection: 'row' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.surface,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 12,
  },
  segmentSelected: { backgroundColor: theme.colors.primary },
  label: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  labelSelected: { color: theme.colors.onPrimary },
});
