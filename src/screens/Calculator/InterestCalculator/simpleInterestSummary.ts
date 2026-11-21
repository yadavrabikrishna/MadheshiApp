import type {
  RateEntryMode,
  SimpleInterestResult,
} from '../../../features/interest';
import type { TranslationKey } from '../../../i18n';
import { getSimpleInterestDisplay } from './simpleInterestDisplay';

/**
 * The plain-text summary of a valid Simple Interest result, for the clipboard.
 * It uses the active language and the same formatting as the result card:
 *
 *   Simple Interest result
 *
 *   Principal: Rs. 1,00,000
 *   Interest Rate: 2% per month
 *   Start Date: 2025/01/01
 *   End Date: 2025/04/01
 *   Duration: 0 Years, 3 Months, 0 Days
 *
 *   Simple Interest: Rs. 6,000
 *   Total Amount: Rs. 1,06,000
 */
export function buildSimpleInterestSummary(
  result: SimpleInterestResult,
  enteredRate: string,
  rateMode: RateEntryMode,
  t: (key: TranslationKey) => string,
): string {
  const display = getSimpleInterestDisplay(result, enteredRate, rateMode, t);
  return [
    t('simpleInterest.result.title'),
    '',
    `${t('simpleInterest.result.principal')}: ${display.principal}`,
    `${t('simpleInterest.result.interestRate')}: ${display.interestRate}`,
    `${t('simpleInterest.startDate.label')}: ${display.startDate}`,
    `${t('simpleInterest.endDate.label')}: ${display.endDate}`,
    `${t('simpleInterest.result.duration')}: ${display.duration}`,
    '',
    `${t('simpleInterest.result.interest')}: ${display.interest}`,
    `${t('simpleInterest.result.total')}: ${display.total}`,
  ].join('\n');
}
