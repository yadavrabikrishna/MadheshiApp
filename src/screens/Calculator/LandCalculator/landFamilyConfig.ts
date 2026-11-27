import {
  LAND_FAMILY_UNITS,
  type LandFamily,
  type LandUnit,
  type LandUnitOf,
} from '../../../features/land';
import type { TranslationKey } from '../../../i18n';

/**
 * Everything that differs between the land calculators: which units, which
 * texts, the result title and the image file name. The shared calculator view,
 * result card and display helpers read ONLY this; they hold no family-specific
 * unit names or text. Unit labels are `land.unit.<unit>`.
 */
export interface LandFamilyConfig<F extends LandFamily = LandFamily> {
  family: F;
  /** The units to enter, largest first; also the Mixed Units field order. */
  units: readonly LandUnitOf<F>[];
  /** The unit selected first in Single Unit mode. */
  defaultUnit: LandUnitOf<F>;
  /** Test id of the screen's scroll view. */
  rootTestId: string;
  /** Result card title (also the first line of the copied text). */
  resultTitleKey: TranslationKey;
  /** Share / Save Image file name prefix, e.g. `terai-land-result-`. */
  fileNamePrefix: string;
  /** Texts. */
  unitSelectorLabelKey: TranslationKey;
  inputLabelKey: TranslationKey;
  inputHintKey: TranslationKey;
  inputPlaceholderKey: TranslationKey;
  mixedHintKey: TranslationKey;
  calculateKey: TranslationKey;
  /** The optional reference card below the results. */
  quickReference: { titleKey: TranslationKey; bodyKey: TranslationKey } | null;
}

export const TERAI_LAND_CONFIG: LandFamilyConfig<'terai'> = {
  family: 'terai',
  units: LAND_FAMILY_UNITS.terai,
  defaultUnit: 'bigha',
  rootTestId: 'land-terai-view',
  resultTitleKey: 'calculator.title.land.terai',
  fileNamePrefix: 'terai-land-result-',
  unitSelectorLabelKey: 'land.terai.unit.label',
  inputLabelKey: 'land.terai.input.label',
  inputHintKey: 'land.terai.input.hint',
  inputPlaceholderKey: 'land.terai.input.placeholder',
  mixedHintKey: 'land.mixed.hint',
  calculateKey: 'land.terai.calculate',
  quickReference: {
    titleKey: 'land.quickRef.title',
    bodyKey: 'land.quickRef.body',
  },
};

/** The Hill / Mountain calculator (Issue #78): see `HillMountainLandView`. */
export const HILL_LAND_CONFIG: LandFamilyConfig<'hill'> = {
  family: 'hill',
  units: LAND_FAMILY_UNITS.hill,
  defaultUnit: 'ropani',
  rootTestId: 'land-hill-view',
  resultTitleKey: 'calculator.title.land.hillMountain',
  fileNamePrefix: 'hill-land-result-',
  unitSelectorLabelKey: 'land.hill.unit.label',
  inputLabelKey: 'land.hill.input.label',
  inputHintKey: 'land.hill.input.hint',
  inputPlaceholderKey: 'land.hill.input.placeholder',
  mixedHintKey: 'land.hill.mixed.hint',
  calculateKey: 'land.terai.calculate',
  quickReference: {
    titleKey: 'land.hill.quickRef.title',
    bodyKey: 'land.hill.quickRef.body',
  },
};

/** The label key of one input unit. */
export const unitLabelKey = (unit: LandUnit): TranslationKey =>
  `land.unit.${unit}` as TranslationKey;
