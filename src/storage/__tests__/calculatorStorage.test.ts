import {
  CALCULATOR_IDS,
  type CalculatorId,
  type EnabledCalculators,
} from '../../types/calculators';
import {
  createRawTestDatabase,
  createTestDatabase,
} from '../../test-utils/createTestDatabase';
import { getSchemaVersion, latestVersion, runMigrations } from '../migrations';
import { createPreferencesRepository } from '../preferencesRepository';

function only(...ids: CalculatorId[]): EnabledCalculators {
  return Object.fromEntries(
    CALCULATOR_IDS.map(id => [id, ids.includes(id)]),
  ) as EnabledCalculators;
}

/** A brand-new database; `open()` is one "launch" of the app on it. */
async function newDevice() {
  const raw = createRawTestDatabase();
  const open = async () => {
    const db = createTestDatabase(raw);
    await runMigrations(db);
    return { db, repository: createPreferencesRepository(db) };
  };
  return { raw, open };
}

describe('calculator preference storage (real SQLite)', () => {
  it('reports "never saved" on a fresh database', async () => {
    const { open } = await newDevice();
    const { repository } = await open();

    expect(await repository.loadCalculators()).toEqual({
      enabled: null,
      active: null,
    });
  });

  it('needs no new migration: it reuses the preferences table', async () => {
    const { open } = await newDevice();
    const { db } = await open();

    expect(await getSchemaVersion(db)).toBe(latestVersion());
  });

  it('saves the complete selection and the active calculator, and restores them after a restart', async () => {
    const { open } = await newDevice();
    const first = await open();
    await first.repository.saveCalculatorSettings({
      enabled: only('compoundInterest', 'ageBs', 'basic'),
      active: 'basic',
    });

    const afterRestart = await open();
    expect(await afterRestart.repository.loadCalculators()).toEqual({
      enabled: only('compoundInterest', 'ageBs', 'basic'),
      active: 'basic',
    });
  });

  it('stores the seven switches as one row, so they can only be saved as a unit', async () => {
    const { open } = await newDevice();
    const { db, repository } = await open();
    await repository.saveCalculatorSettings({
      enabled: only('terai'),
      active: 'terai',
    });

    const rows = await db.executeAsync<{ key: string }>(
      "SELECT key FROM preferences WHERE key LIKE 'calculator%' ORDER BY key",
    );
    expect(rows.rows._array.map(row => row.key)).toEqual([
      'calculatorActive',
      'calculatorsEnabled',
    ]);
  });

  it('saveActiveCalculator updates only the last selected calculator', async () => {
    const { open } = await newDevice();
    const { repository } = await open();
    await repository.saveCalculatorSettings({
      enabled: only('terai', 'hillMountain'),
      active: 'terai',
    });

    await repository.saveActiveCalculator('hillMountain');

    expect(await repository.loadCalculators()).toEqual({
      enabled: only('terai', 'hillMountain'),
      active: 'hillMountain',
    });
  });

  it('does not disturb the theme and language preferences', async () => {
    const { open } = await newDevice();
    const { repository } = await open();
    await repository.saveTheme('dark');
    await repository.saveLanguage('np');

    await repository.saveCalculatorSettings({
      enabled: only('basic'),
      active: 'basic',
    });

    const stored = await repository.load();
    expect(stored.theme).toBe('dark');
    expect(stored.language).toBe('np');
  });

  describe('damaged data is ignored instead of crashing', () => {
    async function withRawValues(values: Record<string, string>) {
      const { open } = await newDevice();
      const { db, repository } = await open();
      for (const [key, value] of Object.entries(values)) {
        await db.executeAsync(
          'INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, 0)',
          [key, value],
        );
      }
      return repository.loadCalculators();
    }

    it('corrupt JSON', async () => {
      expect(await withRawValues({ calculatorsEnabled: '{not json' })).toEqual({
        enabled: null,
        active: null,
      });
    });

    it('JSON that is not an object', async () => {
      expect(await withRawValues({ calculatorsEnabled: '42' })).toEqual({
        enabled: null,
        active: null,
      });
    });

    it('unknown calculators and non-boolean values', async () => {
      const result = await withRawValues({
        calculatorsEnabled: JSON.stringify({
          terai: true,
          ageBs: 'yes',
          mystery: true,
        }),
      });
      expect(result.enabled).toEqual({ terai: true });
    });

    it('an unknown active calculator', async () => {
      expect(
        (await withRawValues({ calculatorActive: 'abacus' })).active,
      ).toBeNull();
    });
  });
});
