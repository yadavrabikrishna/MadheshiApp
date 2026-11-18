import { useState } from 'react';
import { View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '../../../components';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import { CompoundInterestView } from './CompoundInterestView';
import { SimpleInterestView } from './SimpleInterestView';

type InterestType = 'simple' | 'compound';

const DEFAULT_INTEREST_TYPE: InterestType = 'compound';

const INTEREST_TYPES: {
  value: InterestType;
  labelKey: TranslationKey;
  View: () => React.JSX.Element;
}[] = [
  {
    value: 'simple',
    labelKey: 'calculator.interest.type.simple',
    View: SimpleInterestView,
  },
  {
    value: 'compound',
    labelKey: 'calculator.interest.type.compound',
    View: CompoundInterestView,
  },
];

/** Interest calculator: a Simple / Compound selector above the matching view. */
export function InterestCalculatorView() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  // Local to this view. The language lives in Redux, so changing it re-renders
  // this view without resetting the selected interest type.
  const [interestType, setInterestType] = useState<InterestType>(
    DEFAULT_INTEREST_TYPE,
  );

  const options: SegmentOption<InterestType>[] = INTEREST_TYPES.map(type => ({
    value: type.value,
    label: t(type.labelKey),
  }));
  const ActiveView = INTEREST_TYPES.find(
    type => type.value === interestType,
  )!.View;

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <SegmentedControl
          options={options}
          value={interestType}
          onChange={setInterestType}
          accessibilityLabel={t('calculator.interest.type.label')}
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
