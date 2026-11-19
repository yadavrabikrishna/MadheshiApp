import { useTranslation, type TranslationKey } from '../../../i18n';
import type { CalculatorId } from '../../../types/calculators';
import { CalculatorGroupView } from '../CalculatorGroupView';
import { HillMountainLandView } from './HillMountainLandView';
import { TeraiLandView } from './TeraiLandView';

const LAND_CALCULATORS: {
  id: CalculatorId;
  labelKey: TranslationKey;
  View: () => React.JSX.Element;
}[] = [
  {
    id: 'terai',
    labelKey: 'calculator.land.type.terai',
    View: TeraiLandView,
  },
  {
    id: 'hillMountain',
    labelKey: 'calculator.land.type.hillMountain',
    View: HillMountainLandView,
  },
];

interface LandCalculatorViewProps {
  /** The enabled Land calculators. */
  calculators: CalculatorId[];
  value: CalculatorId;
  onChange: (value: CalculatorId) => void;
}

/** Land group: Terai / Hill-Mountain selector (when both are enabled). */
export function LandCalculatorView({
  calculators,
  value,
  onChange,
}: LandCalculatorViewProps) {
  const { t } = useTranslation();

  return (
    <CalculatorGroupView
      options={LAND_CALCULATORS.filter(c => calculators.includes(c.id)).map(
        c => ({ value: c.id, label: t(c.labelKey), View: c.View }),
      )}
      value={value}
      onChange={onChange}
      selectorLabel={t('calculator.land.type.label')}
    />
  );
}
