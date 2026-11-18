import {
  createRawTestDatabase,
  createTestDatabase,
} from '../../test-utils/createTestDatabase';
import {
  getSchemaVersion,
  latestVersion,
  MIGRATIONS,
  runMigrations,
  type Migration,
} from '../migrations';
import { createPreferencesRepository } from '../preferencesRepository';
import type { SqlDatabase } from '../types';

async function tableNames(db: SqlDatabase): Promise<string[]> {
  const result = await db.executeAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return result.rows._array.map(row => row.name);
}

describe('migrations', () => {
  it('creates the preferences table on a fresh database', async () => {
    const db = createTestDatabase();
    expect(await getSchemaVersion(db)).toBe(0);

    expect(await runMigrations(db)).toBe(latestVersion(MIGRATIONS));
    expect(await getSchemaVersion(db)).toBe(latestVersion(MIGRATIONS));
    expect(await tableNames(db)).toEqual(['preferences']);
  });

  it('is safe to run repeatedly', async () => {
    const db = createTestDatabase();
    await runMigrations(db);
    await runMigrations(db);
    expect(await getSchemaVersion(db)).toBe(latestVersion(MIGRATIONS));
  });

  it('refuses a database newer than the app', async () => {
    const db = createTestDatabase();
    await runMigrations(db);
    await db.executeAsync('PRAGMA user_version = 99');
    await expect(runMigrations(db)).rejects.toThrow(/newer than this app/);
  });

  it('rejects non-contiguous migration versions', async () => {
    const bad: Migration[] = [
      { version: 1, name: 'a', statements: ['CREATE TABLE a (id INTEGER)'] },
      { version: 3, name: 'c', statements: ['CREATE TABLE c (id INTEGER)'] },
    ];
    await expect(runMigrations(createTestDatabase(), bad)).rejects.toThrow(
      /expected 2/,
    );
  });

  it('rolls a failing migration back completely and keeps the last good version', async () => {
    const db = createTestDatabase();
    const good: Migration = {
      version: 1,
      name: 'a',
      statements: ['CREATE TABLE a (id INTEGER)'],
    };
    const failing: Migration = {
      version: 2,
      name: 'b',
      // The first statement succeeds and the second fails: nothing of v2 may remain.
      statements: ['CREATE TABLE b (id INTEGER)', 'THIS IS NOT SQL'],
    };
    await runMigrations(db, [good]);
    await expect(runMigrations(db, [good, failing])).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(1);
    expect(await tableNames(db)).toEqual(['a']);
  });

  it('applies only pending migrations and keeps existing data', async () => {
    const db = createTestDatabase();
    const first: Migration = {
      version: 1,
      name: 'a',
      statements: ['CREATE TABLE a (id INTEGER)'],
    };
    const second: Migration = {
      version: 2,
      name: 'b',
      statements: ['CREATE TABLE b (id INTEGER)'],
    };
    await runMigrations(db, [first]);
    await db.executeAsync('INSERT INTO a (id) VALUES (1)');
    await runMigrations(db, [first, second]);

    expect(await getSchemaVersion(db)).toBe(2);
    const rows = await db.executeAsync<{ id: number }>('SELECT id FROM a');
    expect(rows.rows._array).toEqual([{ id: 1 }]);
  });
});

describe('preferences repository', () => {
  async function setup() {
    const db = createTestDatabase();
    await runMigrations(db);
    return { db, repository: createPreferencesRepository(db) };
  }

  it('returns nulls before anything is saved', async () => {
    const { repository } = await setup();
    expect(await repository.load()).toEqual({ theme: null, language: null });
  });

  it('saves and overwrites theme and language', async () => {
    const { repository } = await setup();
    await repository.saveTheme('dark');
    await repository.saveLanguage('ne');
    expect(await repository.load()).toEqual({ theme: 'dark', language: 'ne' });

    await repository.saveTheme('light');
    await repository.saveLanguage('en');
    expect(await repository.load()).toEqual({ theme: 'light', language: 'en' });
  });

  it('keeps a single row per preference and records the save time', async () => {
    const db = createTestDatabase();
    await runMigrations(db);
    const repository = createPreferencesRepository(db, () => 1234);
    await repository.saveTheme('dark');
    await repository.saveTheme('light');

    const rows = await db.executeAsync<{ key: string; updated_at: number }>(
      'SELECT key, updated_at FROM preferences',
    );
    expect(rows.rows._array).toEqual([{ key: 'theme', updated_at: 1234 }]);
  });

  it('ignores unknown stored values, including the invalid code "np"', async () => {
    const { db, repository } = await setup();
    await db.executeAsync(
      "INSERT INTO preferences (key, value, updated_at) VALUES ('language', 'np', 0), ('theme', 'sepia', 0)",
    );
    expect(await repository.load()).toEqual({ theme: null, language: null });
  });

  it('survives an app restart (same database file, new connection)', async () => {
    const file = createRawTestDatabase();

    const firstRun = createTestDatabase(file);
    await runMigrations(firstRun);
    await createPreferencesRepository(firstRun).saveLanguage('ne');
    await createPreferencesRepository(firstRun).saveTheme('dark');

    const secondRun = createTestDatabase(file);
    await runMigrations(secondRun);
    expect(await createPreferencesRepository(secondRun).load()).toEqual({
      theme: 'dark',
      language: 'ne',
    });
  });
});
