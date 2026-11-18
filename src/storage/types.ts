import type { NitroSQLiteConnection } from 'react-native-nitro-sqlite';

/**
 * The part of a Nitro SQLite connection this app relies on, derived from the
 * driver's own types so the compiler checks the contract against the real thing.
 * Type-only import: nothing native is loaded.
 *
 * Always use the async API; Nitro's synchronous `execute` throws while the
 * connection is busy. Inside `transaction`, use only the `tx` handle; awaiting
 * other queued work deadlocks.
 */
export type SqlDatabase = Pick<
  NitroSQLiteConnection,
  'executeAsync' | 'transaction'
>;

export type SqlExecutor = Pick<NitroSQLiteConnection, 'executeAsync'>;
