import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';

import { TopTabs, type TopTabOption } from '../../components';
import {
  GROUP_CALCULATORS,
  getCalculatorLayout,
  groupOf,
  pickCalculatorForGroup,
  resolveActiveCalculator,
  selectActiveCalculator,
  selectEnabledCalculators,
  setActiveCalculator,
  type CalculatorGroup,
} from '../../features/calculators';
import { useTranslation } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store';
import { useThemedStyles, type AppTheme } from '../../theme';
import type { CalculatorId } from '../../types/calculators';
import { AgeCalculatorView } from './AgeCalculator/AgeCalculatorView';
import { BasicCalculatorView } from './BasicCalculator/BasicCalculatorView';
import { CALCULATOR_TITLE_KEYS, GROUP_LABEL_KEYS } from './calculatorLabels';
import { InterestCalculatorView } from './InterestCalculator/InterestCalculatorView';
import { LandCalculatorView } from './LandCalculator/LandCalculatorView';

export function CalculatorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const styles = useThemedStyles(createStyles);

  // Everything below is built from the SAVED settings in Redux (never from an
  // unsaved Settings draft). The language also lives in Redux, so changing it
  // re-renders this screen without touching the selection.
  const enabled = useAppSelector(selectEnabledCalculators);
  const savedActive = useAppSelector(selectActiveCalculator);
  // The store keeps `active` enabled; resolving again guarantees that a disabled
  // calculator can never be rendered.
  const active = resolveActiveCalculator({
    enabled,
    active: savedActive,
    lastSelected: null,
  });
  const layout = getCalculatorLayout(enabled);

  // The calculator last used in each group (this session), so returning to a
  // top-level tab restores what the user had selected there.
  const lastInGroup = useRef<Partial<Record<CalculatorGroup, CalculatorId>>>(
    {},
  );
  useEffect(() => {
    lastInGroup.current[groupOf(active)] = active;
  }, [active]);

  // The header title is derived from the active calculator (never stored), so it
  // always names the visible calculator and is re-translated with the language.
  const title = t(CALCULATOR_TITLE_KEYS[active]);
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const select = (id: CalculatorId) => dispatch(setActiveCalculator(id));

  const group = groupOf(active);
  const enabledInGroup = GROUP_CALCULATORS[group].filter(id => enabled[id]);
  let content: React.JSX.Element;
  switch (group) {
    case 'interest':
      content = (
        <InterestCalculatorView
          calculators={enabledInGroup}
          value={active}
          onChange={select}
        />
      );
      break;
    case 'age':
      content = (
        <AgeCalculatorView
          calculators={enabledInGroup}
          value={active}
          onChange={select}
        />
      );
      break;
    case 'land':
      content = (
        <LandCalculatorView
          calculators={enabledInGroup}
          value={active}
          onChange={select}
        />
      );
      break;
    case 'basic':
      content = <BasicCalculatorView />;
      break;
  }

  // Exactly one calculator enabled: no navigation at all.
  if (layout.mode === 'single') {
    return <View style={styles.container}>{content}</View>;
  }

  const tabs: TopTabOption<CalculatorGroup>[] = layout.destinations.map(
    destination => ({
      value: destination.group,
      label: t(GROUP_LABEL_KEYS[destination.group]),
    }),
  );
  const openGroup = (next: CalculatorGroup) => {
    const target = pickCalculatorForGroup(
      next,
      enabled,
      lastInGroup.current[next],
    );
    if (target !== null) {
      select(target);
    }
  };

  return (
    <View style={styles.container}>
      <TopTabs
        tabs={tabs}
        value={group}
        onChange={openGroup}
        accessibilityLabel={t('calculator.tabs.label')}
      />
      {content}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
});
