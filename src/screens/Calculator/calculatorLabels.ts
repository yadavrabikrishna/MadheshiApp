import type { TranslationKey } from '../../i18n';
import type { CalculatorGroup } from '../../features/calculators';
import type { CalculatorId } from '../../types/calculators';

/** The navigation header title for each calculator. */
export const CALCULATOR_TITLE_KEYS: Record<CalculatorId, TranslationKey> = {
  simpleInterest: 'calculator.interest.type.simple',
  compoundInterest: 'calculator.interest.type.compound',
  ageAd: 'calculator.title.age.ad',
  ageBs: 'calculator.title.age.bs',
  terai: 'calculator.title.land.terai',
  hillMountain: 'calculator.title.land.hillMountain',
  basic: 'calculator.basic.title',
};

/** The name of each calculator in Calculator Settings. */
export const CALCULATOR_NAME_KEYS: Record<CalculatorId, TranslationKey> = {
  ...CALCULATOR_TITLE_KEYS,
  terai: 'calculator.land.type.terai',
  hillMountain: 'calculator.land.type.hillMountain',
};

/** Top-level tab / settings section label of each group. */
export const GROUP_LABEL_KEYS: Record<CalculatorGroup, TranslationKey> = {
  interest: 'calculator.tabs.interest',
  age: 'calculator.tabs.age',
  land: 'calculator.tabs.land',
  basic: 'calculator.basic.title',
};
