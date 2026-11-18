import {
  isLanguage,
  isThemeMode,
  type Language,
  type ThemeMode,
} from '../types/preferences';
import type { SqlExecutor } from './types';

export interface StoredPreferences {
  /** `null` when nothing valid is saved yet. */
  theme: ThemeMode | null;
  language: Language | null;
}

/** Durable preference storage. Redux owns the live values; this only persists them. */
export interface PreferencesRepository {
  load(): Promise<StoredPreferences>;
  saveTheme(theme: ThemeMode): Promise<void>;
  saveLanguage(language: Language): Promise<void>;
}

type PreferenceKey = 'theme' | 'language';

export function createPreferencesRepository(
  db: SqlExecutor,
  now: () => number = Date.now,
): PreferencesRepository {
  async function save(key: PreferenceKey, value: string): Promise<void> {
    await db.executeAsync(
      `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [key, value, now()],
    );
  }

  return {
    async load() {
      const result = await db.executeAsync<{ key: string; value: string }>(
        'SELECT key, value FROM preferences',
      );
      const values = new Map(result.rows._array.map(r => [r.key, r.value]));
      const theme = values.get('theme');
      const language = values.get('language');
      // Unknown stored values (e.g. an old or hand-edited one) are ignored.
      return {
        theme: isThemeMode(theme) ? theme : null,
        language: isLanguage(language) ? language : null,
      };
    },
    saveTheme: theme => save('theme', theme),
    saveLanguage: language => save('language', language),
  };
}
