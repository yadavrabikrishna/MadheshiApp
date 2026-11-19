import { View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '../../../components';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import type { LandType } from '../calculatorSelection';
import { HillMountainLandView } from './HillMountainLandView';
import { TeraiLandView } from './TeraiLandView';

const LAND_TYPES: {
  value: LandType;
  labelKey: TranslationKey;
  View: () => React.JSX.Element;
}[] = [
  {
    value: 'terai',
    labelKey: 'calculator.land.type.terai',
    View: TeraiLandView,
  },
  {
    value: 'hillMountain',
    labelKey: 'calculator.land.type.hillMountain',
    View: HillMountainLandView,
  },
];

interface LandCalculatorViewProps {
  value: LandType;
  onChange: (value: LandType) => void;
}

/**
 * Land calculator: a Terai / Hill-Mountain selector above the matching view.
 * The selection is owned by CalculatorScreen (it also drives the header title).
 */
export function LandCalculatorView({
  value,
  onChange,
}: LandCalculatorViewProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const options: SegmentOption<LandType>[] = LAND_TYPES.map(type => ({
    value: type.value,
    label: t(type.labelKey),
  }));
  const ActiveView = LAND_TYPES.find(type => type.value === value)!.View;

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <SegmentedControl
          options={options}
          value={value}
          onChange={onChange}
          accessibilityLabel={t('calculator.land.type.label')}
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
