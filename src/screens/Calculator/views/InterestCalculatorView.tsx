import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Interest calculator. Placeholder until the calculation is implemented. */
export function InterestCalculatorView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.tabs.interest')}
      description={t('calculator.interest.description')}
      iconName="trending-up-outline"
    />
  );
}
