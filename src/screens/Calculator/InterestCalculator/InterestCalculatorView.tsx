import { View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '../../../components';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { useThemedStyles, type AppTheme } from '../../../theme';
import type { InterestType } from '../calculatorSelection';
import { CompoundInterestView } from './CompoundInterestView';
import { SimpleInterestView } from './SimpleInterestView';

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

interface InterestCalculatorViewProps {
  value: InterestType;
  onChange: (value: InterestType) => void;
}

/**
 * Interest calculator: a Simple / Compound selector above the matching view.
 * The selection is owned by CalculatorScreen (it also drives the header title).
 */
export function InterestCalculatorView({
  value,
  onChange,
}: InterestCalculatorViewProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const options: SegmentOption<InterestType>[] = INTEREST_TYPES.map(type => ({
    value: type.value,
    label: t(type.labelKey),
  }));
  const ActiveView = INTEREST_TYPES.find(type => type.value === value)!.View;

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <SegmentedControl
          options={options}
          value={value}
          onChange={onChange}
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
