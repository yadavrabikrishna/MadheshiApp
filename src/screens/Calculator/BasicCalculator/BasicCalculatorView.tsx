import { ScreenPlaceholder } from '../../../components';
import { useTranslation } from '../../../i18n';

/**
 * Basic Calculator: a feature of Madheshi App itself (not the device's
 * calculator app). Placeholder only; its interface and operations come later.
 */
export function BasicCalculatorView() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      title={t('calculator.basic.title')}
      description={t('calculator.basic.description')}
      iconName="calculator-outline"
    />
  );
}
