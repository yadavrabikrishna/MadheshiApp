import {
  createRawTestDatabase,
  createTestDatabase,
} from '../../test-utils/createTestDatabase';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  type InterestRateConfig,
} from '../../types/interestRateConfig';
import { getSchemaVersion, latestVersion, runMigrations } from '../migrations';
import { createPreferencesRepository } from '../preferencesRepository';

/** A brand-new database; `open()` is one "launch" of the app on it. */
function newDevice() {
  const raw = createRawTestDatabase();
  const open = async () => {
    const db = createTestDatabase(raw);
    await runMigrations(db);
    return { db, repository: createPreferencesRepository(db) };
  };
  return { raw, open };
}

const custom: InterestRateConfig = {
  rateInputMode: 'rupees',
  percentagePeriod: 'quarterly',
  rupeesPeriod: 'weekly',
  denominatorMode: 'custom',
  customDenominator: '12.5',
};

async function writeRaw(
  device: ReturnType<typeof newDevice>,
  key: string,
  value: string,
) {
  const { db } = await device.open();
  await db.executeAsync(
    'INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, 0)',
    [key, value],
  );
}

describe('interest rate configuration storage (real SQLite)', () => {
  it('reports "never saved" on an existing installation without it', async () => {
    const device = newDevice();
    const { repository } = await device.open();
    // An older install: other preferences exist, no interest configuration.
    await repository.saveTheme('dark');

    expect(await repository.loadInterestRateConfigs()).toEqual({
      simple: null,
      compound: null,
    });
  });

  it('needs no new migration', async () => {
    const { db } = await newDevice().open();
    expect(await getSchemaVersion(db)).toBe(latestVersion());
    expect(latestVersion()).toBe(1);
  });

  it('restores both configurations after a restart', async () => {
    const device = newDevice();
    const first = await device.open();
    await first.repository.saveInterestRateConfig('simple', custom);
    await first.repository.saveInterestRateConfig('compound', {
      ...DEFAULT_INTEREST_RATE_CONFIG,
      percentagePeriod: 'daily',
    });

    const afterRestart = await device.open();
    expect(await afterRestart.repository.loadInterestRateConfigs()).toEqual({
      simple: custom,
      compound: { ...DEFAULT_INTEREST_RATE_CONFIG, percentagePeriod: 'daily' },
    });
  });

  it('saves Simple and Compound independently', async () => {
    const device = newDevice();
    const { repository } = await device.open();

    await repository.saveInterestRateConfig('simple', custom);
    expect(await repository.loadInterestRateConfigs()).toEqual({
      simple: custom,
      compound: null,
    });

    await repository.saveInterestRateConfig(
      'compound',
      DEFAULT_INTEREST_RATE_CONFIG,
    );
    await repository.saveInterestRateConfig('simple', {
      ...custom,
      rupeesPeriod: 'daily',
    });
    const loaded = await repository.loadInterestRateConfigs();
    expect(loaded.compound).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
    expect(loaded.simple?.rupeesPeriod).toBe('daily');
  });

  it('persists the denominator mode and keeps the custom value', async () => {
    const device = newDevice();
    const { repository } = await device.open();
    await repository.saveInterestRateConfig('simple', {
      ...custom,
      denominatorMode: 'per1000',
    });

    const loaded = (
      await (await device.open()).repository.loadInterestRateConfigs()
    ).simple;
    expect(loaded?.denominatorMode).toBe('per1000');
    expect(loaded?.customDenominator).toBe('12.5');
  });

  it('updates in place: one row per calculator', async () => {
    const device = newDevice();
    const { db, repository } = await device.open();
    await repository.saveInterestRateConfig('simple', custom);
    await repository.saveInterestRateConfig(
      'simple',
      DEFAULT_INTEREST_RATE_CONFIG,
    );
    await repository.saveInterestRateConfig('compound', custom);

    const rows = await db.executeAsync<{ key: string }>(
      "SELECT key FROM preferences WHERE key LIKE 'interestRateConfig%'",
    );
    expect(rows.rows._array.map(r => r.key).sort()).toEqual([
      'interestRateConfigCompound',
      'interestRateConfigSimple',
    ]);
  });

  it('does not disturb other preferences or calculator settings', async () => {
    const device = newDevice();
    const { repository } = await device.open();
    await repository.saveTheme('dark');
    await repository.saveActiveCalculator('terai');
    await repository.saveInterestRateConfig('simple', custom);

    expect((await repository.load()).theme).toBe('dark');
    expect((await repository.loadCalculators()).active).toBe('terai');
  });

  it('treats text that is not JSON as never saved', async () => {
    const device = newDevice();
    await writeRaw(device, 'interestRateConfigSimple', '{not json');
    await writeRaw(device, 'interestRateConfigCompound', '');

    const { repository } = await device.open();
    expect(await repository.loadInterestRateConfigs()).toEqual({
      simple: null,
      compound: null,
    });
  });

  it.each(['null', '5', '"text"', '[]', 'true'])(
    'repairs the non-object JSON %s to the defaults',
    async json => {
      const device = newDevice();
      await writeRaw(device, 'interestRateConfigSimple', json);

      const { repository } = await device.open();
      expect((await repository.loadInterestRateConfigs()).simple).toEqual(
        DEFAULT_INTEREST_RATE_CONFIG,
      );
    },
  );

  it('repairs outdated or invalid fields without losing valid ones', async () => {
    const device = newDevice();
    await writeRaw(
      device,
      'interestRateConfigSimple',
      JSON.stringify({
        rateInputMode: 'rupees',
        percentagePeriod: 'fortnightly', // not a known period
        rupeesPeriod: 'daily',
        denominatorMode: 'custom',
        customDenominator: '-4', // invalid, so Custom cannot be kept
        obsolete: true,
      }),
    );

    const { repository } = await device.open();
    expect((await repository.loadInterestRateConfigs()).simple).toEqual({
      rateInputMode: 'rupees',
      percentagePeriod: 'yearly',
      rupeesPeriod: 'daily',
      denominatorMode: 'per100',
      customDenominator: null,
    });
  });

  it('corrupt data for one calculator does not affect the other', async () => {
    const device = newDevice();
    const first = await device.open();
    await first.repository.saveInterestRateConfig('compound', custom);
    await writeRaw(device, 'interestRateConfigSimple', '%%%');

    const { repository } = await device.open();
    expect(await repository.loadInterestRateConfigs()).toEqual({
      simple: null,
      compound: custom,
    });
  });

  it('applies writes in the order requested', async () => {
    const device = newDevice();
    const { repository } = await device.open();
    const writes = (['daily', 'weekly', 'monthly', 'quarterly'] as const).map(
      period =>
        repository.saveInterestRateConfig('simple', {
          ...DEFAULT_INTEREST_RATE_CONFIG,
          percentagePeriod: period,
        }),
    );
    await Promise.all(writes);

    expect(
      (await repository.loadInterestRateConfigs()).simple?.percentagePeriod,
    ).toBe('quarterly');
  });
});
