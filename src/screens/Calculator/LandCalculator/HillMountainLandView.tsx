import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Land calculator for Hill / Mountain land. Placeholder until implemented. */
export function HillMountainLandView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.land.type.hillMountain')}
      description={t('calculator.land.hillMountain.description')}
      iconName="trail-sign-outline"
    />
  );
}
