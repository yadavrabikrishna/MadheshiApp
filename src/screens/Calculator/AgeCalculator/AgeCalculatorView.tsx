import { View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '../../../components';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import type { DateSystem } from '../calculatorSelection';
import { AdAgeView } from './AdAgeView';
import { BsAgeView } from './BsAgeView';

const DATE_SYSTEMS: {
  value: DateSystem;
  labelKey: TranslationKey;
  View: () => React.JSX.Element;
}[] = [
  { value: 'bs', labelKey: 'calculator.age.system.bs', View: BsAgeView },
  { value: 'ad', labelKey: 'calculator.age.system.ad', View: AdAgeView },
];

interface AgeCalculatorViewProps {
  value: DateSystem;
  onChange: (value: DateSystem) => void;
}

/**
 * Age calculator: a BS / AD selector above the matching view.
 * The selection is owned by CalculatorScreen (it also drives the header title).
 */
export function AgeCalculatorView({ value, onChange }: AgeCalculatorViewProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const options: SegmentOption<DateSystem>[] = DATE_SYSTEMS.map(system => ({
    value: system.value,
    label: t(system.labelKey),
  }));
  const ActiveView = DATE_SYSTEMS.find(system => system.value === value)!.View;

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <SegmentedControl
          options={options}
          value={value}
          onChange={onChange}
          accessibilityLabel={t('calculator.age.system.label')}
        />
      </View>
      <ActiveView />
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  selector: { paddingHorizontal: 16, paddingTop: 16 },
});
