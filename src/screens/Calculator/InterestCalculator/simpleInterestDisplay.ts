import type {
  NeutralDate,
  RateEntryMode,
  SimpleInterestResult,
} from '../../../features/interest';
import type { TranslationKey } from '../../../i18n';
import { fillTemplate, formatMoney } from '../../../utils';

type Translate = (key: TranslationKey) => string;

const pad = (value: number, width: number) =>
  String(value).padStart(width, '0');

/** Neutral display only: no calendar name, no conversion. */
export function formatNeutralDate(date: NeutralDate): string {
  return `${pad(date.year, 4)}/${pad(date.month, 2)}/${pad(date.day, 2)}`;
}

/** The result values exactly as the result card shows them, in the active language. */
export interface SimpleInterestDisplay {
  /** Currency and grouped amount, e.g. "Rs. 1,00,000". */
  principal: string;
  /** The rate as entered, with how it was entered, e.g. "2% per month". */
  interestRate: string;
  startDate: string;
  endDate: string;
  /** e.g. "0 Years, 3 Months, 0 Days". */
  duration: string;
  interest: string;
  total: string;
}

/**
 * The single place where a Simple Interest result becomes display text. The
 * result card and the copied summary both use it, so they always agree.
 */
export function getSimpleInterestDisplay(
  result: SimpleInterestResult,
  enteredRate: string,
  rateMode: RateEntryMode,
  t: Translate,
): SimpleInterestDisplay {
  const rs = t('simpleInterest.currency');
  const { years, months, days } = result.duration;
  return {
    principal: `${rs} ${formatMoney(result.principal)}`,
    interestRate: fillTemplate(
      t(
        rateMode === 'percentPerMonth'
          ? 'simpleInterest.rateText.percent'
          : 'simpleInterest.rateText.rupees',
      ),
      { rate: enteredRate },
    ),
    startDate: formatNeutralDate(result.startDate),
    endDate: formatNeutralDate(result.endDate),
    duration: [
      `${years} ${t('simpleInterest.unit.years')}`,
      `${months} ${t('simpleInterest.unit.months')}`,
      `${days} ${t('simpleInterest.unit.days')}`,
    ].join(', '),
    interest: `${rs} ${formatMoney(result.interest)}`,
    total: `${rs} ${formatMoney(result.total)}`,
  };
}
