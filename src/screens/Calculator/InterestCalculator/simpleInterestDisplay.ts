import type {
  FixedDuration,
  NeutralDate,
  SimpleInterestResult,
} from '../../../features/interest';
import type { TranslationKey } from '../../../i18n';
import {
  resolveDenominator,
  selectedRatePeriod,
  type InterestRateConfig,
  type RatePeriod,
} from '../../../types/interestRateConfig';
import { fillTemplate, formatMoney, groupDecimalString } from '../../../utils';

type Translate = (key: TranslationKey) => string;

const UNIT_KEYS: Record<RatePeriod, TranslationKey> = {
  yearly: 'interestRate.unit.yearly',
  halfYearly: 'interestRate.unit.halfYearly',
  quarterly: 'interestRate.unit.quarterly',
  monthly: 'interestRate.unit.monthly',
  weekly: 'interestRate.unit.weekly',
  daily: 'interestRate.unit.daily',
};

const pad = (value: number, width: number) =>
  String(value).padStart(width, '0');

/** Neutral display only: no calendar name, no conversion. */
export function formatNeutralDate(date: NeutralDate): string {
  return `${pad(date.year, 4)}/${pad(date.month, 2)}/${pad(date.day, 2)}`;
}

/** "1 Years, 3 Months, 0 Days": a duration as text in the active language. */
export function formatDuration(
  { years, months, days }: FixedDuration,
  t: Translate,
): string {
  return [
    `${years} ${t('simpleInterest.unit.years')}`,
    `${months} ${t('simpleInterest.unit.months')}`,
    `${days} ${t('simpleInterest.unit.days')}`,
  ].join(', ');
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
 * The rate as the user entered it and the saved configuration reads it, e.g.
 * "12% per year" or "Rs. 2 per Rs. 1,000 per month". Never a converted rate.
 */
function getEnteredRateText(
  enteredRate: string,
  rateConfig: InterestRateConfig,
  t: Translate,
): string {
  const unit = t(UNIT_KEYS[selectedRatePeriod(rateConfig)]);
  if (rateConfig.rateInputMode === 'percentage') {
    return fillTemplate(t('simpleInterest.rateText.percent'), {
      rate: enteredRate,
      unit,
    });
  }
  return fillTemplate(t('simpleInterest.rateText.rupees'), {
    rate: enteredRate,
    amount: groupDecimalString(resolveDenominator(rateConfig) ?? '100'),
    unit,
  });
}

/**
 * The single place where a Simple Interest result becomes display text. The
 * result card and the copied summary both use it, so they always agree.
 */
export function getSimpleInterestDisplay(
  result: SimpleInterestResult,
  enteredRate: string,
  rateConfig: InterestRateConfig,
  t: Translate,
): SimpleInterestDisplay {
  const rs = t('simpleInterest.currency');
  return {
    principal: `${rs} ${formatMoney(result.principal)}`,
    interestRate: getEnteredRateText(enteredRate, rateConfig, t),
    startDate: formatNeutralDate(result.startDate),
    endDate: formatNeutralDate(result.endDate),
    duration: formatDuration(result.duration, t),
    interest: `${rs} ${formatMoney(result.interest)}`,
    total: `${rs} ${formatMoney(result.total)}`,
  };
}
