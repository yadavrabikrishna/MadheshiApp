import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Age calculator for BS (Bikram Sambat) dates. Placeholder until implemented. */
export function BsAgeView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.age.system.bs')}
      description={t('calculator.age.bs.description')}
      iconName="calendar-number-outline"
    />
  );
}
