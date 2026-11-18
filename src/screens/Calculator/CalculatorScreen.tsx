import { useState } from 'react';
import { View } from 'react-native';

import { TopTabs, type TopTabOption } from '../../components';
import { useTranslation, type TranslationKey } from '../../i18n';
import { useThemedStyles, type AppTheme } from '../../theme';
import { AgeCalculatorView } from './views/AgeCalculatorView';
import { InterestCalculatorView } from './views/InterestCalculatorView';
import { LandCalculatorView } from './views/LandCalculatorView';

type CalculatorTab = 'interest' | 'age' | 'land';

const DEFAULT_TAB: CalculatorTab = 'interest';

const CALCULATOR_TABS: {
  value: CalculatorTab;
  labelKey: TranslationKey;
  View: () => React.JSX.Element;
}[] = [
  {
    value: 'interest',
    labelKey: 'calculator.tabs.interest',
    View: InterestCalculatorView,
  },
  { value: 'age', labelKey: 'calculator.tabs.age', View: AgeCalculatorView },
  { value: 'land', labelKey: 'calculator.tabs.land', View: LandCalculatorView },
];

export function CalculatorScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  // Local to the Calculator route. The language lives in Redux, so changing it
  // re-renders this screen without resetting the selected tab.
  const [activeTab, setActiveTab] = useState<CalculatorTab>(DEFAULT_TAB);

  const tabs: TopTabOption<CalculatorTab>[] = CALCULATOR_TABS.map(tab => ({
    value: tab.value,
    label: t(tab.labelKey),
  }));
  const ActiveView = CALCULATOR_TABS.find(tab => tab.value === activeTab)!.View;

  return (
    <View style={styles.container}>
      <TopTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        accessibilityLabel={t('calculator.tabs.label')}
      />
      <ActiveView />
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
});
