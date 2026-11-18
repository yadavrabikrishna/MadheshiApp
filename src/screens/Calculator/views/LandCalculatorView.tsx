import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Land calculator. Placeholder until the calculation is implemented. */
export function LandCalculatorView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.tabs.land')}
      description={t('calculator.land.description')}
      iconName="map-outline"
    />
  );
}
