import { View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '../../components';
import { useThemedStyles, type AppTheme } from '../../theme';
import type { CalculatorId } from '../../types/calculators';

export interface CalculatorGroupOption {
  value: CalculatorId;
  label: string;
  View: () => React.JSX.Element;
}

interface CalculatorGroupViewProps {
  /** Only the ENABLED calculators of the group; disabled ones must not be passed. */
  options: CalculatorGroupOption[];
  value: CalculatorId;
  onChange: (value: CalculatorId) => void;
  selectorLabel: string;
}

/**
 * A specialist group (Interest, Age or Land): the second-level selector above
 * the selected calculator. The selector is shown only when the group has more
 * than one enabled calculator; with a single one it is rendered directly.
 * The selection itself is owned by CalculatorScreen.
 */
export function CalculatorGroupView({
  options,
  value,
  onChange,
  selectorLabel,
}: CalculatorGroupViewProps) {
  const styles = useThemedStyles(createStyles);

  const active = options.find(option => option.value === value) ?? options[0];
  const segments: SegmentOption<CalculatorId>[] = options.map(option => ({
    value: option.value,
    label: option.label,
  }));
  const ActiveView = active.View;

  return (
    <View style={styles.container}>
      {options.length > 1 ? (
        <View style={styles.selector}>
          <SegmentedControl
            options={segments}
            value={active.value}
            onChange={onChange}
            accessibilityLabel={selectorLabel}
          />
        </View>
      ) : null}
      <ActiveView />
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  selector: { paddingHorizontal: 16, paddingTop: 16 },
});
