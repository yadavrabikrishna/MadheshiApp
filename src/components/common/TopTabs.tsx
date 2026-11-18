import { Pressable, Text, View } from 'react-native';

import { useThemedStyles, type AppTheme } from '../../theme';

export interface TopTabOption<Value extends string> {
  value: Value;
  label: string;
}

interface TopTabsProps<Value extends string> {
  tabs: TopTabOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  accessibilityLabel: string;
}

/**
 * A horizontal row of equal-width tabs shown at the top of a screen. The active
 * tab is highlighted with the primary color and an underline. Selection is owned
 * by the parent (`value` / `onChange`); this component keeps no state of its own.
 */
export function TopTabs<Value extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel,
}: TopTabsProps<Value>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {tabs.map(tab => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            style={[styles.tab, selected && styles.tabSelected]}
            onPress={() => onChange(tab.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {tab.label}
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabSelected: { borderBottomColor: theme.colors.primary },
  label: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  labelSelected: {
    fontWeight: '700' as const,
    color: theme.colors.primary,
  },
});
