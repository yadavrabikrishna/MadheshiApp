import type { TranslationKey } from '../../../i18n';
import type { InterestType } from './interestCalculatorConfig';

/** The wording and share file name that depend on the active interest type. */
export interface InterestModeText {
  titleKey: TranslationKey;
  interestKey: TranslationKey;
  /** Shared image name: this prefix + a random number + `.png`. */
  fileNamePrefix: string;
}

export const INTEREST_MODE_TEXT: Record<InterestType, InterestModeText> = {
  simple: {
    titleKey: 'simpleInterest.result.title',
    interestKey: 'simpleInterest.result.interest',
    fileNamePrefix: 'simple-interest-result-',
  },
  compound: {
    titleKey: 'compoundInterest.result.title',
    interestKey: 'compoundInterest.result.interest',
    fileNamePrefix: 'compound-interest-result-',
  },
};
