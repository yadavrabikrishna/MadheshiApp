import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/** Land calculator for Terai land. Placeholder until implemented. */
export function TeraiLandView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.land.type.terai')}
      description={t('calculator.land.terai.description')}
      iconName="leaf-outline"
    />
  );
}
