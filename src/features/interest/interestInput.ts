import { parseDecimalInput, type CalcDecimalValue } from './decimal';
import {
  calculateFixedDuration,
  parseNeutralDate,
  type FixedDuration,
  type NeutralDate,
} from './neutralDate';
import {
  normalizeMonthlyRate,
  type NormalizedRate,
  type RateEntryMode,
  type RateErrorCode,
} from './rate';

/**
 * Input validation shared by the Simple and Compound Interest engines (pure;
 * no React, Redux, storage or presentation). Both calculators accept exactly
 * the same input and reject it for exactly the same reasons, so the rules live
 * here once and neither engine calls the other.
 */

/** Raw, unvalidated input as the UI holds it. */
export interface InterestInput {
  /** Plain decimal string, greater than zero, e.g. `"100000"` or `"2500.5"`. */
  readonly principal: string;
  /** Plain decimal string, zero or greater, e.g. `"2"` or `"2.5"`. */
  readonly rate: string;
  readonly rateMode: RateEntryMode;
  /** Neutral date text `YYYY/MM/DD`. */
  readonly startDate: string;
  /** Neutral date text `YYYY/MM/DD`; must not be earlier than the start. */
  readonly endDate: string;
}

/** One reason the input was rejected. Map each code to a localized message. */
export type InterestErrorCode =
  | 'principalInvalid'
  | 'principalNotPositive'
  | RateErrorCode
  | 'startDateInvalid'
  | 'endDateInvalid'
  | 'endBeforeStart';

/** Validated, exact values both engines calculate from. */
export interface ValidatedInterestInput {
  readonly principal: CalcDecimalValue;
  readonly rate: NormalizedRate;
  readonly startDate: NeutralDate;
  readonly endDate: NeutralDate;
  readonly duration: FixedDuration;
}

export type InterestValidation =
  | { readonly ok: true; readonly value: ValidatedInterestInput }
  | { readonly ok: false; readonly errors: readonly InterestErrorCode[] };

/**
 * Validates the input. Every problem found is reported, in field order:
 * principal, rate, start date, end date, then the date range. Invalid input
 * never throws.
 */
export function validateInterestInput(
  input: InterestInput,
): InterestValidation {
  const errors: InterestErrorCode[] = [];

  const principal = parseDecimalInput(input.principal);
  if (principal.kind === 'invalid') {
    errors.push('principalInvalid');
  } else if (principal.kind === 'negative' || principal.value.isZero()) {
    errors.push('principalNotPositive');
  }

  const rate = normalizeMonthlyRate(input.rate, input.rateMode);
  if (!rate.ok) {
    errors.push(rate.error);
  }

  const startDate = parseNeutralDate(input.startDate);
  if (!startDate) {
    errors.push('startDateInvalid');
  }
  const endDate = parseNeutralDate(input.endDate);
  if (!endDate) {
    errors.push('endDateInvalid');
  }

  const duration =
    startDate && endDate ? calculateFixedDuration(startDate, endDate) : null;
  if (startDate && endDate && !duration) {
    errors.push('endBeforeStart');
  }

  if (
    errors.length > 0 ||
    principal.kind !== 'ok' ||
    !rate.ok ||
    !startDate ||
    !endDate ||
    !duration
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      principal: principal.value,
      rate: rate.value,
      startDate,
      endDate,
      duration,
    },
  };
}
