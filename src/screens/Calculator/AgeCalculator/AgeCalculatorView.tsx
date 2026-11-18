import { useState } from 'react';
import { View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '../../../components';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { AdAgeView } from './AdAgeView';
import { BsAgeView } from './BsAgeView';

type DateSystem = 'ad' | 'bs';

const DEFAULT_DATE_SYSTEM: DateSystem = 'bs';

const DATE_SYSTEMS: {
  value: DateSystem;
  labelKey: TranslationKey;
  View: () => React.JSX.Element;
}[] = [
  { value: 'bs', labelKey: 'calculator.age.system.bs', View: BsAgeView },
  { value: 'ad', labelKey: 'calculator.age.system.ad', View: AdAgeView },
];

/** Age calculator: a BS / AD selector above the matching view. */
export function AgeCalculatorView() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  // Local to this view. The language lives in Redux, so changing it re-renders
  // this view without resetting the selected date system.
  const [dateSystem, setDateSystem] = useState<DateSystem>(DEFAULT_DATE_SYSTEM);

  const options: SegmentOption<DateSystem>[] = DATE_SYSTEMS.map(system => ({
    value: system.value,
    label: t(system.labelKey),
  }));
  const ActiveView = DATE_SYSTEMS.find(
    system => system.value === dateSystem,
  )!.View;

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <SegmentedControl
          options={options}
          value={dateSystem}
          onChange={setDateSystem}
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
