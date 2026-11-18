/// <reference types="node" />
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { SqlDatabase } from '../storage/types';

/**
 * In-memory SQLite database for Jest, backed by Node's built-in `node:sqlite`
 * (no extra dependency). Real SQL runs, so upserts, PRAGMAs and rollbacks behave
 * like the device. Pass the same `DatabaseSync` to simulate an app restart.
 */
export function createTestDatabase(
  raw: DatabaseSync = new DatabaseSync(':memory:'),
): SqlDatabase {
  // Only the members the app uses are implemented; the cast bridges the rest of
  // Nitro's (much larger) result and transaction types.
  const executor = {
    async executeAsync(query: string, params: unknown[] = []) {
      const rows = raw.prepare(query).all(...(params as SQLInputValue[]));
      return { rows: { _array: rows } };
    },
  };

  const database = {
    ...executor,
    async transaction(callback: (tx: typeof executor) => Promise<unknown>) {
      raw.exec('BEGIN');
      try {
        const result = await callback(executor);
        raw.exec('COMMIT');
        return result;
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };

  return database as unknown as SqlDatabase;
}

export function createRawTestDatabase(): DatabaseSync {
  return new DatabaseSync(':memory:');
}
