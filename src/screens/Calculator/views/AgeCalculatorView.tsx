import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Age calculator. Placeholder until the calculation is implemented. */
export function AgeCalculatorView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.tabs.age')}
      description={t('calculator.age.description')}
      iconName="calendar-outline"
    />
  );
}
