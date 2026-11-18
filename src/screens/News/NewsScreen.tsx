import { ScreenPlaceholder } from '../../components';
import { useTranslation } from '../../i18n';

export function NewsScreen() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('tabs.news')}
      description={t('screens.news.description')}
      iconName="newspaper-outline"
    />
  );
}
