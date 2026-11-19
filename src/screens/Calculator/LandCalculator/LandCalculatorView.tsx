import { useState } from 'react';
import { View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '../../../components';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { HillMountainLandView } from './HillMountainLandView';
import { TeraiLandView } from './TeraiLandView';

type LandType = 'terai' | 'hillMountain';

const DEFAULT_LAND_TYPE: LandType = 'terai';

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

/** Land calculator: a Terai / Hill-Mountain selector above the matching view. */
export function LandCalculatorView() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  // Local to this view. The language lives in Redux, so changing it re-renders
  // this view without resetting the selected land type.
  const [landType, setLandType] = useState<LandType>(DEFAULT_LAND_TYPE);

  const options: SegmentOption<LandType>[] = LAND_TYPES.map(type => ({
    value: type.value,
    label: t(type.labelKey),
  }));
  const ActiveView = LAND_TYPES.find(type => type.value === landType)!.View;

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <SegmentedControl
          options={options}
          value={landType}
          onChange={setLandType}
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
