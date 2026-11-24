import type { SimpleInterestErrorCode } from '../../../features/interest';
import type { TranslationKey } from '../../../i18n';

export type SimpleInterestField =
  | 'principal'
  | 'rate'
  | 'rateMode'
  | 'startDate'
  | 'endDate';

/** Which field each engine error is shown beside, and its localized message. */
export const ERROR_PRESENTATION: Record<
  SimpleInterestErrorCode,
  { field: SimpleInterestField; messageKey: TranslationKey }
> = {
  principalInvalid: {
    field: 'principal',
    messageKey: 'simpleInterest.error.principalInvalid',
  },
  principalNotPositive: {
    field: 'principal',
    messageKey: 'simpleInterest.error.principalNotPositive',
  },
  rateInvalid: {
    field: 'rate',
    messageKey: 'simpleInterest.error.rateInvalid',
  },
  rateNegative: {
    field: 'rate',
    messageKey: 'simpleInterest.error.rateNegative',
  },
  rateConfigInvalid: {
    field: 'rate',
    messageKey: 'simpleInterest.error.rateConfigInvalid',
  },
  rateModeInvalid: {
    field: 'rateMode',
    messageKey: 'simpleInterest.error.rateModeInvalid',
  },
  startDateInvalid: {
    field: 'startDate',
    messageKey: 'simpleInterest.error.startDateInvalid',
  },
  endDateInvalid: {
    field: 'endDate',
    messageKey: 'simpleInterest.error.endDateInvalid',
  },
  endBeforeStart: {
    field: 'endDate',
    messageKey: 'simpleInterest.error.endBeforeStart',
  },
};

export type FieldErrorKeys = Partial<
  Record<SimpleInterestField, TranslationKey[]>
>;

/** Groups engine error codes by field (message keys, so language can change). */
export function groupErrorsByField(
  codes: readonly SimpleInterestErrorCode[],
): FieldErrorKeys {
  const grouped: FieldErrorKeys = {};
  for (const code of codes) {
    const { field, messageKey } = ERROR_PRESENTATION[code];
    const list = grouped[field] ?? [];
    if (!list.includes(messageKey)) {
      list.push(messageKey);
    }
    grouped[field] = list;
  }
  return grouped;
}

/**
 * The one date message to show under the Start Date / End Date row, and the
 * date field it belongs to. When several date errors exist, the earliest
 * problem wins: an invalid Start Date, then an invalid End Date, then an End
 * Date before the Start Date. Null when no date error exists.
 */
export function getDateError(
  codes: readonly SimpleInterestErrorCode[],
): { field: 'startDate' | 'endDate'; messageKey: TranslationKey } | null {
  const priority: SimpleInterestErrorCode[] = [
    'startDateInvalid',
    'endDateInvalid',
    'endBeforeStart',
  ];
  const code = priority.find(candidate => codes.includes(candidate));
  if (!code) {
    return null;
  }
  const { field, messageKey } = ERROR_PRESENTATION[code];
  return { field: field as 'startDate' | 'endDate', messageKey };
}
