import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { View } from 'react-native';

import { TopTabs, type TopTabOption } from '../../components';
import { useTranslation, type TranslationKey } from '../../i18n';
import { useThemedStyles, type AppTheme } from '../../theme';
import { AgeCalculatorView } from './AgeCalculator/AgeCalculatorView';
import {
  DEFAULT_SELECTION,
  getCalculatorTitleKey,
  type CalculatorTab,
  type DateSystem,
  type InterestType,
  type LandType,
} from './calculatorSelection';
import { InterestCalculatorView } from './InterestCalculator/InterestCalculatorView';
import { LandCalculatorView } from './LandCalculator/LandCalculatorView';

const CALCULATOR_TABS: {
  value: CalculatorTab;
  labelKey: TranslationKey;
}[] = [
  { value: 'interest', labelKey: 'calculator.tabs.interest' },
  { value: 'age', labelKey: 'calculator.tabs.age' },
  { value: 'land', labelKey: 'calculator.tabs.land' },
];

export function CalculatorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const styles = useThemedStyles(createStyles);

  // The single source of truth for what is selected. It is local to the
  // Calculator route; the language lives in Redux, so changing it re-renders
  // this screen without resetting any selection.
  const [activeTab, setActiveTab] = useState(DEFAULT_SELECTION.tab);
  const [interestType, setInterestType] = useState<InterestType>(
    DEFAULT_SELECTION.interestType,
  );
  const [dateSystem, setDateSystem] = useState<DateSystem>(
    DEFAULT_SELECTION.dateSystem,
  );
  const [landType, setLandType] = useState<LandType>(
    DEFAULT_SELECTION.landType,
  );

  // The navigation header title is derived from the selection above (never
  // stored separately), so it always names the visible calculator and is
  // re-translated whenever the language changes.
  const title = t(
    getCalculatorTitleKey({
      tab: activeTab,
      interestType,
      dateSystem,
      landType,
    }),
  );
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const tabs: TopTabOption<CalculatorTab>[] = CALCULATOR_TABS.map(tab => ({
    value: tab.value,
    label: t(tab.labelKey),
  }));

  return (
    <View style={styles.container}>
      <TopTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        accessibilityLabel={t('calculator.tabs.label')}
      />
      {/*
        Every calculator stays mounted and only the active one is shown, so the
        views keep their internal state while the user switches tabs.
      */}
      <View style={activeTab === 'interest' ? styles.content : styles.hidden}>
        <InterestCalculatorView
          value={interestType}
          onChange={setInterestType}
        />
      </View>
      <View style={activeTab === 'age' ? styles.content : styles.hidden}>
        <AgeCalculatorView value={dateSystem} onChange={setDateSystem} />
      </View>
      <View style={activeTab === 'land' ? styles.content : styles.hidden}>
        <LandCalculatorView value={landType} onChange={setLandType} />
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1 },
  hidden: { display: 'none' as const },
});
