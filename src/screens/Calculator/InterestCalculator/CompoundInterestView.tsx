import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Compound interest calculator. Placeholder until the calculation is implemented. */
export function CompoundInterestView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.interest.type.compound')}
      description={t('calculator.interest.compound.description')}
      iconName="layers-outline"
    />
  );
}
