import type { TranslationKey } from '../../i18n';

export type CalculatorTab = 'interest' | 'age' | 'land';
export type InterestType = 'simple' | 'compound';
export type DateSystem = 'ad' | 'bs';
export type LandType = 'terai' | 'hillMountain';

/** Everything the user has selected on the Calculator screen. */
export interface CalculatorSelection {
  tab: CalculatorTab;
  interestType: InterestType;
  dateSystem: DateSystem;
  landType: LandType;
}

export const DEFAULT_SELECTION: CalculatorSelection = {
  tab: 'interest',
  interestType: 'compound',
  dateSystem: 'bs',
  landType: 'terai',
};

const INTEREST_TITLE_KEYS: Record<InterestType, TranslationKey> = {
  simple: 'calculator.interest.type.simple',
  compound: 'calculator.interest.type.compound',
};

const AGE_TITLE_KEYS: Record<DateSystem, TranslationKey> = {
  ad: 'calculator.title.age.ad',
  bs: 'calculator.title.age.bs',
};

const LAND_TITLE_KEYS: Record<LandType, TranslationKey> = {
  terai: 'calculator.title.land.terai',
  hillMountain: 'calculator.title.land.hillMountain',
};

/** Translation key of the title for the calculator that is currently visible. */
export function getCalculatorTitleKey(
  selection: CalculatorSelection,
): TranslationKey {
  switch (selection.tab) {
    case 'interest':
      return INTEREST_TITLE_KEYS[selection.interestType];
    case 'age':
      return AGE_TITLE_KEYS[selection.dateSystem];
    case 'land':
      return LAND_TITLE_KEYS[selection.landType];
  }
}
