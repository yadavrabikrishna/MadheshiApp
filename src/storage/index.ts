import { openDatabase } from './database';
import { runMigrations } from './migrations';
import {
  createPreferencesRepository,
  type PreferencesRepository,
} from './preferencesRepository';

let repositoryPromise: Promise<PreferencesRepository> | null = null;

/**
 * Open the database, migrate it, and return the preferences repository.
 * Call at app start. Repeated calls share one result; a failure is not cached,
 * so the next call retries.
 */
export function initializePreferencesStorage(): Promise<PreferencesRepository> {
  if (repositoryPromise === null) {
    const pending = (async () => {
      const db = openDatabase();
      await runMigrations(db);
      return createPreferencesRepository(db);
    })();
    pending.catch(() => {
      if (repositoryPromise === pending) {
        repositoryPromise = null;
      }
    });
    repositoryPromise = pending;
  }
  return repositoryPromise;
}

export type {
  PreferencesRepository,
  StoredCalculators,
  StoredInterestRateConfigs,
  StoredPreferences,
} from './preferencesRepository';
export type { SqlDatabase, SqlExecutor } from './types';

/**
 * Stand-in used when the database cannot be opened. The app still starts (with
 * default preferences); loading and saving report the original failure, so the
 * UI can tell the user that nothing is being persisted.
 */
export function createUnavailablePreferencesRepository(
  cause: unknown,
): PreferencesRepository {
  const message =
    cause instanceof Error ? cause.message : 'Storage unavailable';
  const fail = () => Promise.reject(new Error(message));
  return {
    load: fail,
    saveTheme: fail,
    saveLanguage: fail,
    saveShowThemeShortcut: fail,
    saveShowLanguageShortcut: fail,
    loadCalculators: fail,
    saveCalculatorSettings: fail,
    saveActiveCalculator: fail,
    loadInterestRateConfigs: fail,
    saveInterestRateConfig: fail,
  };
}
