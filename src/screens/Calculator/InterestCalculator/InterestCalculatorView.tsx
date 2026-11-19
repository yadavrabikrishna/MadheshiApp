import { useTranslation, type TranslationKey } from '../../../i18n';
import type { CalculatorId } from '../../../types/calculators';
import { CalculatorGroupView } from '../CalculatorGroupView';
import { CompoundInterestView } from './CompoundInterestView';
import { SimpleInterestView } from './SimpleInterestView';

const INTEREST_CALCULATORS: {
  id: CalculatorId;
  labelKey: TranslationKey;
  View: () => React.JSX.Element;
}[] = [
  {
    id: 'simpleInterest',
    labelKey: 'calculator.interest.type.simple',
    View: SimpleInterestView,
  },
  {
    id: 'compoundInterest',
    labelKey: 'calculator.interest.type.compound',
    View: CompoundInterestView,
  },
];

interface InterestCalculatorViewProps {
  /** The enabled Interest calculators. */
  calculators: CalculatorId[];
  value: CalculatorId;
  onChange: (value: CalculatorId) => void;
}

/** Interest group: Simple / Compound selector (when both are enabled). */
export function InterestCalculatorView({
  calculators,
  value,
  onChange,
}: InterestCalculatorViewProps) {
  const { t } = useTranslation();

  return (
    <CalculatorGroupView
      options={INTEREST_CALCULATORS.filter(c => calculators.includes(c.id)).map(
        c => ({ value: c.id, label: t(c.labelKey), View: c.View }),
      )}
      value={value}
      onChange={onChange}
      selectorLabel={t('calculator.interest.type.label')}
    />
  );
}
