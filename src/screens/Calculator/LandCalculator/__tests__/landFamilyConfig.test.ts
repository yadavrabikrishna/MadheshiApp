/**
 * The land family configurations and the shared land UI files (Issue #77):
 * pure checks, no rendering.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { LAND_FAMILY_UNITS } from '../../../../features/land';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import {
  HILL_LAND_CONFIG,
  TERAI_LAND_CONFIG,
  unitLabelKey,
  type LandFamilyConfig,
} from '../landFamilyConfig';

const CONFIGS: LandFamilyConfig[] = [TERAI_LAND_CONFIG, HILL_LAND_CONFIG];

describe.each(CONFIGS)('land family configuration: $family', config => {
  it('uses the conversion service’s unit list for its family, in order', () => {
    expect(config.units).toEqual(LAND_FAMILY_UNITS[config.family]);
  });

  it('starts on the largest unit, which is one of its units', () => {
    expect(config.units).toContain(config.defaultUnit);
    expect(config.defaultUnit).toBe(config.units[0]);
  });

  it('every text key exists in English and Nepali', () => {
    const keys = [
      config.resultTitleKey,
      config.unitSelectorLabelKey,
      config.inputLabelKey,
      config.inputHintKey,
      config.inputPlaceholderKey,
      config.mixedHintKey,
      config.calculateKey,
      ...config.units.map(unitLabelKey),
      ...(config.quickReference
        ? [config.quickReference.titleKey, config.quickReference.bodyKey]
        : []),
    ];
    for (const key of keys) {
      expect(en[key]).toEqual(expect.any(String));
      expect(np[key]).toEqual(expect.any(String));
      expect(en[key]).not.toBe('');
      expect(np[key]).not.toBe('');
    }
  });

  it('has a file name prefix ending in a dash and a root test id', () => {
    expect(config.fileNamePrefix).toMatch(/^[a-z]+(-[a-z]+)*-$/);
    expect(config.rootTestId).toMatch(/^land-[a-z]+-view$/);
  });
});

describe('the two configurations', () => {
  it('differ in units, title, file name prefix and test id', () => {
    expect(TERAI_LAND_CONFIG.units).toEqual(['bigha', 'kattha', 'dhur']);
    expect(HILL_LAND_CONFIG.units).toEqual(['ropani', 'aana', 'paisa', 'daam']);
    expect(TERAI_LAND_CONFIG.fileNamePrefix).toBe('terai-land-result-');
    expect(HILL_LAND_CONFIG.fileNamePrefix).toBe('hill-land-result-');
    expect(TERAI_LAND_CONFIG.rootTestId).not.toBe(HILL_LAND_CONFIG.rootTestId);
    expect(TERAI_LAND_CONFIG.resultTitleKey).not.toBe(
      HILL_LAND_CONFIG.resultTitleKey,
    );
  });

  it('the Terai reference is unchanged, and the Hill reference states the Hill units', () => {
    expect(en['land.quickRef.body']).toBe('1 Bigha = 20 Kattha = 400 Dhur');
    expect(en['land.hill.quickRef.body']).toBe(
      '1 Ropani = 16 Aana = 64 Paisa = 256 Daam',
    );
  });
});

describe('shared land UI files hold no family-specific unit assumptions', () => {
  const code = (file: string) =>
    readFileSync(join(__dirname, '..', file), 'utf8')
      // Drop comments: they may explain with examples.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

  it.each(['LandCalculator.tsx', 'LandResultCard.tsx'])(
    '%s names no unit and no family',
    file => {
      expect(code(file)).not.toMatch(
        /bigha|kattha|dhur|ropani|aana|paisa|daam|terai|hill/i,
      );
    },
  );

  it('landDisplay.ts takes its units from the service’s lists, not literals', () => {
    expect(code('landDisplay.ts')).not.toMatch(
      /['"](bigha|kattha|dhur|ropani|aana|paisa|daam)['"]/,
    );
  });

  it('no shared file imports a conversion factor or does area arithmetic', () => {
    for (const file of [
      'LandCalculator.tsx',
      'LandResultCard.tsx',
      'landDisplay.ts',
      'landFamilyConfig.ts',
    ]) {
      expect(code(file)).not.toMatch(
        /registry|decimal\.js|SQ_FT|72900|5476|0\.09290304/,
      );
    }
  });
});
