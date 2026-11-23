import {
  CALCULATOR_IDS,
  isCalculatorId,
  type CalculatorId,
  type EnabledCalculators,
} from '../types/calculators';
import {
  restoreInterestRateConfig,
  type InterestCalculatorKind,
  type InterestRateConfig,
} from '../types/interestRateConfig';
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
  /** Header shortcut visibility; `null` when never saved (default: shown). */
  showThemeShortcut: boolean | null;
  showLanguageShortcut: boolean | null;
}

/** What is saved for the Calculator; `null` / missing entries mean "never saved". */
export interface StoredCalculators {
  enabled: Partial<Record<CalculatorId, boolean>> | null;
  /** The last selected calculator. */
  active: CalculatorId | null;
}

/** What is saved per interest calculator; `null` means "never saved / unreadable". */
export type StoredInterestRateConfigs = Record<
  InterestCalculatorKind,
  InterestRateConfig | null
>;

/** Durable preference storage. Redux owns the live values; this only persists them. */
export interface PreferencesRepository {
  load(): Promise<StoredPreferences>;
  saveTheme(theme: ThemeMode): Promise<void>;
  saveLanguage(language: Language): Promise<void>;
  saveShowThemeShortcut(visible: boolean): Promise<void>;
  saveShowLanguageShortcut(visible: boolean): Promise<void>;
  loadCalculators(): Promise<StoredCalculators>;
  /** Persist the complete enabled selection and the active calculator. */
  saveCalculatorSettings(settings: {
    enabled: EnabledCalculators;
    active: CalculatorId;
  }): Promise<void>;
  saveActiveCalculator(active: CalculatorId): Promise<void>;
  /** Simple and Compound are separate rows, loaded and saved independently. */
  loadInterestRateConfigs(): Promise<StoredInterestRateConfigs>;
  saveInterestRateConfig(
    calculator: InterestCalculatorKind,
    config: InterestRateConfig,
  ): Promise<void>;
}

type PreferenceKey =
  | 'theme'
  | 'language'
  | 'showThemeShortcut'
  | 'showLanguageShortcut'
  | 'calculatorsEnabled'
  | 'calculatorActive'
  | 'interestRateConfigSimple'
  | 'interestRateConfigCompound';

/**
 * The seven switches are one JSON value in one row, so the complete selection is
 * written (and read back) as a unit and can never be saved half-way.
 */
function parseEnabledCalculators(
  value: string | undefined,
): StoredCalculators['enabled'] {
  if (value === undefined) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const enabled: Partial<Record<CalculatorId, boolean>> = {};
    for (const id of CALCULATOR_IDS) {
      if (typeof record[id] === 'boolean') {
        enabled[id] = record[id];
      }
    }
    return Object.keys(enabled).length > 0 ? enabled : null;
  } catch {
    return null;
  }
}

const INTEREST_RATE_CONFIG_KEYS = {
  simple: 'interestRateConfigSimple',
  compound: 'interestRateConfigCompound',
} as const satisfies Record<InterestCalculatorKind, PreferenceKey>;

/**
 * A saved configuration is one JSON value. Text that is not JSON counts as
 * never saved; JSON of any shape or age is repaired field by field, so the
 * result is always a valid configuration.
 */
function parseInterestRateConfig(
  value: string | undefined,
): InterestRateConfig | null {
  if (value === undefined) {
    return null;
  }
  try {
    return restoreInterestRateConfig(JSON.parse(value));
  } catch {
    return null;
  }
}

function parseBoolean(value: string | undefined): boolean | null {
  if (value === 'true') {
    return true;
  }
  return value === 'false' ? false : null;
}

export function createPreferencesRepository(
  db: SqlExecutor,
  now: () => number = Date.now,
): PreferencesRepository {
  // Writes run strictly one after another, in the order they were requested.
  // Without this, a slow older write could finish after a newer one and
  // overwrite it, leaving a stale value in SQLite.
  let writeQueue: Promise<unknown> = Promise.resolve();

  function save(key: PreferenceKey, value: string): Promise<void> {
    const write = writeQueue.then(() =>
      db.executeAsync(
        `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        [key, value, now()],
      ),
    );
    // A failed write must not block the ones after it; its caller still sees the error.
    writeQueue = write.catch(() => undefined);
    return write.then(() => undefined);
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
        showThemeShortcut: parseBoolean(values.get('showThemeShortcut')),
        showLanguageShortcut: parseBoolean(values.get('showLanguageShortcut')),
      };
    },
    saveTheme: theme => save('theme', theme),
    saveLanguage: language => save('language', language),
    saveShowThemeShortcut: visible =>
      save('showThemeShortcut', String(visible)),
    saveShowLanguageShortcut: visible =>
      save('showLanguageShortcut', String(visible)),
    async loadCalculators() {
      const result = await db.executeAsync<{ key: string; value: string }>(
        'SELECT key, value FROM preferences',
      );
      const values = new Map(result.rows._array.map(r => [r.key, r.value]));
      const active = values.get('calculatorActive');
      return {
        enabled: parseEnabledCalculators(values.get('calculatorsEnabled')),
        active: isCalculatorId(active) ? active : null,
      };
    },
    async saveCalculatorSettings({ enabled, active }) {
      // Queued in order: the selection first, then the active calculator.
      await Promise.all([
        save('calculatorsEnabled', JSON.stringify(enabled)),
        save('calculatorActive', active),
      ]);
    },
    saveActiveCalculator: active => save('calculatorActive', active),
    async loadInterestRateConfigs() {
      const result = await db.executeAsync<{ key: string; value: string }>(
        'SELECT key, value FROM preferences',
      );
      const values = new Map(result.rows._array.map(r => [r.key, r.value]));
      return {
        simple: parseInterestRateConfig(
          values.get(INTEREST_RATE_CONFIG_KEYS.simple),
        ),
        compound: parseInterestRateConfig(
          values.get(INTEREST_RATE_CONFIG_KEYS.compound),
        ),
      };
    },
    saveInterestRateConfig: (calculator, config) =>
      save(INTEREST_RATE_CONFIG_KEYS[calculator], JSON.stringify(config)),
  };
}
