import type { SqlDatabase } from './types';

export interface Migration {
  /** Contiguous, starting at 1. Never change a migration that has shipped. */
  version: number;
  name: string;
  statements: string[];
}

/**
 * Append new migrations here (news cache, bookmarks, ...). The schema version is
 * stored in SQLite's `PRAGMA user_version`.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_preferences',
    statements: [
      `CREATE TABLE preferences (
         key TEXT PRIMARY KEY NOT NULL,
         value TEXT NOT NULL,
         updated_at INTEGER NOT NULL
       )`,
    ],
  },
];

export function latestVersion(migrations: Migration[] = MIGRATIONS): number {
  return migrations.length === 0
    ? 0
    : migrations[migrations.length - 1].version;
}

function assertContiguous(migrations: Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migration "${migration.name}" has version ${
          migration.version
        }, expected ${index + 1}`,
      );
    }
  });
}

export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  const result = await db.executeAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  return result.rows._array[0]?.user_version ?? 0;
}

/**
 * Apply every pending migration. Each one runs in its own transaction together
 * with the version bump, so a failure leaves the last good version intact.
 * Returns the resulting schema version.
 */
export async function runMigrations(
  db: SqlDatabase,
  migrations: Migration[] = MIGRATIONS,
): Promise<number> {
  assertContiguous(migrations);
  const current = await getSchemaVersion(db);
  const latest = latestVersion(migrations);

  if (current > latest) {
    throw new Error(
      `Database schema version ${current} is newer than this app supports (${latest})`,
    );
  }

  for (const migration of migrations.filter(m => m.version > current)) {
    await db.transaction(async tx => {
      for (const statement of migration.statements) {
        await tx.executeAsync(statement);
      }
      // PRAGMA cannot take bound parameters; the version is a trusted integer.
      await tx.executeAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return latest;
}
