import {
  TERAI_LAND_UNITS,
  type LandConversionGroups,
  type LandConversionService,
  type TeraiLandMixedInput,
  type TeraiLandUnit,
} from '../../../features/land';
import type { TranslationKey } from '../../../i18n';

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

const GROUP_LAYOUT: {
  id: LandDisplayGroup['id'];
  titleKey: TranslationKey;
  units: { field: string; labelKey: TranslationKey }[];
}[] = [
  {
    id: 'terai',
    titleKey: 'land.group.terai',
    units: [
      { field: 'bigha', labelKey: 'land.unit.bigha' },
      { field: 'kattha', labelKey: 'land.unit.kattha' },
      { field: 'dhur', labelKey: 'land.unit.dhur' },
    ],
  },
  {
    id: 'hilly',
    titleKey: 'land.group.hilly',
    units: [
      { field: 'ropani', labelKey: 'land.unit.ropani' },
      { field: 'aana', labelKey: 'land.unit.aana' },
      { field: 'paisa', labelKey: 'land.unit.paisa' },
      { field: 'daam', labelKey: 'land.unit.daam' },
    ],
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
  service: Pick<LandConversionService, 'formatValue'>,
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
  unit: TeraiLandUnit,
  t: Translate,
  formatDigits: (text: string) => string,
): string {
  const unitKey = `land.unit.${unit}` as TranslationKey;
  return formatDigits(
    `${t('land.result.input')}: ${value.trim()} ${t(unitKey)}`,
  );
}

/**
 * "Input: 1 Bigha, 4 Kattha, 10 Dhur": the mixed input as typed. Blank fields
 * are left out (they count as zero); fields are in Bigha, Kattha, Dhur order.
 */
export function buildMixedInputLine(
  input: TeraiLandMixedInput,
  t: Translate,
  formatDigits: (text: string) => string,
): string {
  const parts = TERAI_LAND_UNITS.filter(unit => input[unit].trim() !== '').map(
    unit => `${input[unit].trim()} ${t(`land.unit.${unit}` as TranslationKey)}`,
  );
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
