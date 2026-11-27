/** The shared land display helpers (Issue #77): pure, no rendering. */
import type { LandConversionGroups } from '../../../../features/land';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import {
  buildInputLine,
  buildLandDisplay,
  buildLandSummary,
  buildMixedInputLine,
  groupThousands,
} from '../landDisplay';

const t = (key: keyof typeof en) => en[key];
const tNp = (key: keyof typeof np) => np[key];
const same = (text: string) => text;
const devanagari = (text: string) =>
  text.replace(/[0-9]/g, d => '०१२३४५६७८९'[Number(d)]);

const GROUPS: LandConversionGroups = {
  terai: { bigha: '1', kattha: '4', dhur: '10' },
  hilly: { ropani: '16', aana: '4', paisa: '3', daam: '2.8430' },
  other: {
    squareFeet: '89302.5',
    squareMetres: '8296.4737296',
    hectare: '0.82964737296',
    acre: '2.05010330578512',
  },
};
// A trivial formatter standing in for the service's: 2 decimals, trimmed.
const service = {
  formatValue: (v: string) => String(Number(Number(v).toFixed(2))),
};

describe('groupThousands', () => {
  it.each([
    ['0', '0'],
    ['999', '999'],
    ['1000', '1,000'],
    ['72900.5', '72,900.5'],
    ['1234567.8912', '1,234,567.8912'],
    ['0.1234', '0.1234'],
  ])('%s -> %s', (input, expected) => {
    expect(groupThousands(input)).toBe(expected);
  });
});

describe('buildLandDisplay', () => {
  it('returns Terai, Hilly, Other Units, in that order, with translated titles', () => {
    const display = buildLandDisplay(GROUPS, service, t, same);
    expect(display.map(g => g.id)).toEqual(['terai', 'hilly', 'other']);
    expect(display.map(g => g.title)).toEqual([
      en['land.group.terai'],
      en['land.group.hilly'],
      en['land.group.other'],
    ]);
  });

  it('lists every unit of each group in order, formatted and grouped', () => {
    const display = buildLandDisplay(GROUPS, service, t, same);
    expect(display[0].rows).toEqual([
      { label: 'Bigha', value: '1' },
      { label: 'Kattha', value: '4' },
      { label: 'Dhur', value: '10' },
    ]);
    expect(display[1].rows.map(r => r.label)).toEqual([
      'Ropani',
      'Aana',
      'Paisa',
      'Daam',
    ]);
    expect(display[1].rows[3].value).toBe('2.84');
    expect(display[2].rows).toEqual([
      { label: 'Square feet', value: '89,302.5' },
      { label: 'Square metres', value: '8,296.47' },
      { label: 'Hectare', value: '0.83' },
      { label: 'Acre', value: '2.05' },
    ]);
  });

  it('uses the language’s labels and digits', () => {
    const display = buildLandDisplay(GROUPS, service, tNp, devanagari);
    expect(display[0].rows.map(r => r.label)).toEqual(['बिघा', 'कठ्ठा', 'धुर']);
    expect(display[2].rows[0].value).toBe('८९,३०२.५');
  });
});

describe('input lines', () => {
  it('single: the typed value (trimmed) and the unit label, for either family', () => {
    expect(buildInputLine(' 2.5 ', 'bigha', t, same)).toBe('Input: 2.5 Bigha');
    expect(buildInputLine('1', 'ropani', t, same)).toBe('Input: 1 Ropani');
    expect(buildInputLine('1.5', 'daam', tNp, devanagari)).toBe(
      'इनपुट: १.५ दाम',
    );
  });

  it('mixed: filled fields in the family’s order; blank and whitespace fields are left out', () => {
    expect(
      buildMixedInputLine(
        ['bigha', 'kattha', 'dhur'],
        { bigha: '1', kattha: '4', dhur: '10' },
        t,
        same,
      ),
    ).toBe('Input: 1 Bigha, 4 Kattha, 10 Dhur');
    expect(
      buildMixedInputLine(
        ['ropani', 'aana', 'paisa', 'daam'],
        { ropani: '2', aana: '  ', daam: ' 3 ' },
        t,
        same,
      ),
    ).toBe('Input: 2 Ropani, 3 Daam');
    expect(
      buildMixedInputLine(
        ['ropani', 'aana', 'paisa', 'daam'],
        { daam: '1', ropani: '2' },
        tNp,
        devanagari,
      ),
    ).toBe('इनपुट: २ रोपनी, १ दाम');
  });

  it('mixed: only the units given are read', () => {
    expect(
      buildMixedInputLine(['aana'], { aana: '1', ropani: '9' }, t, same),
    ).toBe('Input: 1 Aana');
  });
});

describe('buildLandSummary', () => {
  it('is the title, the input line, then each group with its rows', () => {
    const display = buildLandDisplay(GROUPS, service, t, same);
    const lines = buildLandSummary(
      'Land (Terai)',
      'Input: 1 Bigha',
      display,
    ).split('\n');
    expect(lines.slice(0, 7)).toEqual([
      'Land (Terai)',
      'Input: 1 Bigha',
      '',
      en['land.group.terai'],
      'Bigha: 1',
      'Kattha: 4',
      'Dhur: 10',
    ]);
    expect(lines).toContain(en['land.group.hilly']);
    expect(lines).toContain(en['land.group.other']);
    expect(lines.at(-1)).toBe('Acre: 2.05');
  });
});
