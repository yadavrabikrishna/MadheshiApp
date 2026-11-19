import { useTranslation, type TranslationKey } from '../../../i18n';
import type { CalculatorId } from '../../../types/calculators';
import { CalculatorGroupView } from '../CalculatorGroupView';
import { AdAgeView } from './AdAgeView';
import { BsAgeView } from './BsAgeView';

// BS is listed first, then AD.
const AGE_CALCULATORS: {
  id: CalculatorId;
  labelKey: TranslationKey;
  View: () => React.JSX.Element;
}[] = [
  { id: 'ageBs', labelKey: 'calculator.age.system.bs', View: BsAgeView },
  { id: 'ageAd', labelKey: 'calculator.age.system.ad', View: AdAgeView },
];

interface AgeCalculatorViewProps {
  /** The enabled Age calculators. */
  calculators: CalculatorId[];
  value: CalculatorId;
  onChange: (value: CalculatorId) => void;
}

/** Age group: BS / AD selector (when both are enabled). */
export function AgeCalculatorView({
  calculators,
  value,
  onChange,
}: AgeCalculatorViewProps) {
  const { t } = useTranslation();

  return (
    <CalculatorGroupView
      options={AGE_CALCULATORS.filter(c => calculators.includes(c.id)).map(
        c => ({ value: c.id, label: t(c.labelKey), View: c.View }),
      )}
      value={value}
      onChange={onChange}
      selectorLabel={t('calculator.age.system.label')}
    />
  );
}
