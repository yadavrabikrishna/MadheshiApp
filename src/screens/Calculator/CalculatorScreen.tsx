import { ScreenPlaceholder } from '../../components';
import { useTranslation } from '../../i18n';

export function CalculatorScreen() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('tabs.calculator')}
      description={t('screens.calculator.description')}
      iconName="calculator-outline"
    />
  );
}
