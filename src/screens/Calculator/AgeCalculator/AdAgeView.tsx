import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Age calculator for AD (Gregorian) dates. Placeholder until implemented. */
export function AdAgeView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.age.system.ad')}
      description={t('calculator.age.ad.description')}
      iconName="calendar-outline"
    />
  );
}
