import { ScreenPlaceholder } from '../../components';
import { useTranslation } from '../../i18n';

export function HomeScreen() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('tabs.home')}
      description={t('screens.home.description')}
      iconName="home-outline"
    />
  );
}
