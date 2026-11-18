import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Simple interest calculator. Placeholder until the calculation is implemented. */
export function SimpleInterestView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.interest.type.simple')}
      description={t('calculator.interest.simple.description')}
      iconName="cash-outline"
    />
  );
}
