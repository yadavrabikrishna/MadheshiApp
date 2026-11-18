import { open, type NitroSQLiteConnection } from 'react-native-nitro-sqlite';

import type { SqlDatabase } from './types';

export const DATABASE_NAME = 'madheshi.sqlite';

let connection: NitroSQLiteConnection | null = null;

/**
 * The single app-wide connection. Nitro SQLite throws when a default connection
 * is opened twice under the same name, so everything must go through here.
 *
 * This is the only file that imports the native module at runtime; unit tests
 * replace it (see `src/test-utils/createTestDatabase.ts`).
 */
export function openDatabase(): SqlDatabase {
  if (connection === null) {
    connection = open({ name: DATABASE_NAME });
  }
  return connection;
}
