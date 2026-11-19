import { translate } from '../../../i18n/translate';
import {
  DEFAULT_SELECTION,
  getCalculatorTitleKey,
  type CalculatorSelection,
} from '../calculatorSelection';

const base = DEFAULT_SELECTION;

const CASES: [string, CalculatorSelection, string, string][] = [
  [
    'Simple Interest',
    { ...base, tab: 'interest', interestType: 'simple' },
    'Simple Interest',
    'घरेलु ब्याज',
  ],
  [
    'Compound Interest',
    { ...base, tab: 'interest', interestType: 'compound' },
    'Compound Interest',
    'साहु ब्याज',
  ],
  [
    'AD Age',
    { ...base, tab: 'age', dateSystem: 'ad' },
    'Age (AD)',
    'उमेर (इस्वी संवत)',
  ],
  [
    'BS Age',
    { ...base, tab: 'age', dateSystem: 'bs' },
    'Age (BS)',
    'उमेर (विक्रम संवत)',
  ],
  [
    'Terai Land',
    { ...base, tab: 'land', landType: 'terai' },
    'Land (Terai)',
    'जमिन (तराई)',
  ],
  [
    'Hill / Mountain Land',
    { ...base, tab: 'land', landType: 'hillMountain' },
    'Land (Hill / Mountain)',
    'जमिन (पहाड / हिमाल)',
  ],
];

describe('getCalculatorTitleKey', () => {
  it('defaults to Interest, Compound, BS and Terai', () => {
    expect(DEFAULT_SELECTION).toEqual({
      tab: 'interest',
      interestType: 'compound',
      dateSystem: 'bs',
      landType: 'terai',
    });
  });

  it.each(CASES)(
    '%s has the specified English and Nepali title',
    (_n, sel, en, np) => {
      const key = getCalculatorTitleKey(sel);
      expect(translate('en', key)).toBe(en);
      expect(translate('np', key)).toBe(np);
    },
  );

  it('only the selection of the visible tab affects the title', () => {
    const title = (sel: CalculatorSelection) =>
      translate('en', getCalculatorTitleKey(sel));

    expect(
      title({
        ...base,
        tab: 'age',
        interestType: 'simple',
        landType: 'hillMountain',
      }),
    ).toBe('Age (BS)');
    expect(
      title({ ...base, tab: 'land', interestType: 'simple', dateSystem: 'ad' }),
    ).toBe('Land (Terai)');
  });
});
