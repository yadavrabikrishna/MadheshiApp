import {
  LAND_FAMILY_UNITS,
  type LandConversionGroups,
  type LandConverter,
  type LandUnit,
} from '../../../features/land';
import type { TranslationKey } from '../../../i18n';
import { unitLabelKey } from './landFamilyConfig';

export interface LandDisplayRow {
  label: string;
  value: string;
}

export interface LandDisplayGroup {
  id: 'hilly' | 'terai' | 'other';
  title: string;
  rows: LandDisplayRow[];
}

type Translate = (key: TranslationKey) => string;

/** Presentation grouping: `72900.5` -> `72,900.5`. Display only. */
export function groupThousands(text: string): string {
  const [integer, fraction] = text.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** The output units of each group, in display order. */
const GROUP_LAYOUT: {
  id: LandDisplayGroup['id'];
  titleKey: TranslationKey;
  units: readonly { field: string; labelKey: TranslationKey }[];
}[] = [
  {
    id: 'terai',
    titleKey: 'land.group.terai',
    units: LAND_FAMILY_UNITS.terai.map(field => ({
      field,
      labelKey: unitLabelKey(field),
    })),
  },
  {
    id: 'hilly',
    titleKey: 'land.group.hilly',
    units: LAND_FAMILY_UNITS.hill.map(field => ({
      field,
      labelKey: unitLabelKey(field),
    })),
  },
  {
    id: 'other',
    titleKey: 'land.group.other',
    units: [
      { field: 'squareFeet', labelKey: 'land.unit.squareFeet' },
      { field: 'squareMetres', labelKey: 'land.unit.squareMetres' },
      { field: 'hectare', labelKey: 'land.unit.hectare' },
      { field: 'acre', labelKey: 'land.unit.acre' },
    ],
  },
];

/**
 * The three result groups as display text, in the required order (Terai, Hilly,
 * Other Units). Values come
 * from the conversion service's results and its formatter; this only adds
 * grouping and the language's digits. No conversion happens here.
 */
export function buildLandDisplay(
  groups: LandConversionGroups,
  service: Pick<LandConverter, 'formatValue'>,
  t: Translate,
  formatDigits: (text: string) => string,
): LandDisplayGroup[] {
  return GROUP_LAYOUT.map(layout => {
    const values = groups[layout.id] as unknown as Record<string, string>;
    return {
      id: layout.id,
      title: t(layout.titleKey),
      rows: layout.units.map(unit => ({
        label: t(unit.labelKey),
        value: formatDigits(
          groupThousands(service.formatValue(values[unit.field])),
        ),
      })),
    };
  });
}

/** "Input: 2.5 Bigha": what was calculated, as shown on the card and copied. */
export function buildInputLine(
  value: string,
  unit: LandUnit,
  t: Translate,
  formatDigits: (text: string) => string,
): string {
  return formatDigits(
    `${t('land.result.input')}: ${value.trim()} ${t(unitLabelKey(unit))}`,
  );
}

/**
 * "Input: 1 Bigha, 4 Kattha, 10 Dhur": the mixed input as typed, in the
 * family's field order. Blank fields are left out (they count as zero).
 */
export function buildMixedInputLine(
  units: readonly LandUnit[],
  input: Partial<Record<LandUnit, string>>,
  t: Translate,
  formatDigits: (text: string) => string,
): string {
  const parts = units
    .filter(unit => (input[unit] ?? '').trim() !== '')
    .map(unit => `${(input[unit] ?? '').trim()} ${t(unitLabelKey(unit))}`);
  return formatDigits(`${t('land.result.input')}: ${parts.join(', ')}`);
}

/** The complete result as plain text, for Copy. */
export function buildLandSummary(
  title: string,
  inputLine: string,
  groups: LandDisplayGroup[],
): string {
  const lines = [title, inputLine];
  for (const group of groups) {
    lines.push('', group.title);
    for (const row of group.rows) {
      lines.push(`${row.label}: ${row.value}`);
    }
  }
  return lines.join('\n');
}
