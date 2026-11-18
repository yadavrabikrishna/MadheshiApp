import { createAppStore } from '../../../store';
import type { PreferencesRepository, SqlDatabase } from '../../../storage';
import { createPreferencesRepository } from '../../../storage/preferencesRepository';
import { runMigrations } from '../../../storage/migrations';
import {
  createRawTestDatabase,
  createTestDatabase,
} from '../../../test-utils/createTestDatabase';
import type { ThemeMode } from '../../../types/preferences';
import {
  hydratePreferences,
  selectHasUnsavedPreferences,
  selectLanguage,
  selectPreferencesHydrated,
  selectPreferencesLoadError,
  selectShowLanguageShortcut,
  selectShowThemeShortcut,
  selectThemeMode,
  setLanguage,
  setLanguageShortcutVisible,
  setTheme,
  setThemeShortcutVisible,
} from '..';

const NOTHING_SAVED = {
  theme: null,
  language: null,
  showThemeShortcut: null,
  showLanguageShortcut: null,
};

function fakeRepository(
  overrides: Partial<PreferencesRepository> = {},
): PreferencesRepository {
  return {
    load: jest.fn().mockResolvedValue(NOTHING_SAVED),
    saveTheme: jest.fn().mockResolvedValue(undefined),
    saveLanguage: jest.fn().mockResolvedValue(undefined),
    saveShowThemeShortcut: jest.fn().mockResolvedValue(undefined),
    saveShowLanguageShortcut: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setup(
  repository: PreferencesRepository,
  systemTheme: ThemeMode = 'light',
) {
  return createAppStore({
    preferencesRepository: repository,
    getSystemTheme: () => systemTheme,
  });
}

describe('hydration', () => {
  it('is not hydrated before it runs', () => {
    expect(selectPreferencesHydrated(setup(fakeRepository()).getState())).toBe(
      false,
    );
  });

  it('uses the saved theme and language', async () => {
    const store = setup(
      fakeRepository({
        load: jest.fn().mockResolvedValue({
          ...NOTHING_SAVED,
          theme: 'dark',
          language: 'np',
        }),
      }),
    );
    await store.dispatch(hydratePreferences());

    const state = store.getState();
    expect(selectThemeMode(state)).toBe('dark');
    expect(selectLanguage(state)).toBe('np');
    expect(selectPreferencesHydrated(state)).toBe(true);
  });

  it('falls back to the system theme and English when nothing is saved', async () => {
    const store = setup(fakeRepository(), 'dark');
    await store.dispatch(hydratePreferences());

    expect(selectThemeMode(store.getState())).toBe('dark');
    expect(selectLanguage(store.getState())).toBe('en');
  });

  it('a saved theme wins over the system theme', async () => {
    const store = setup(
      fakeRepository({
        load: jest.fn().mockResolvedValue({ ...NOTHING_SAVED, theme: 'light' }),
      }),
      'dark',
    );
    await store.dispatch(hydratePreferences());
    expect(selectThemeMode(store.getState())).toBe('light');
  });

  it('uses the system theme and English, and reports the problem, if loading fails', async () => {
    for (const systemTheme of ['light', 'dark'] as const) {
      const store = setup(
        fakeRepository({
          load: jest.fn().mockRejectedValue(new Error('disk')),
        }),
        systemTheme,
      );
      await store.dispatch(hydratePreferences());

      const state = store.getState();
      expect(selectPreferencesHydrated(state)).toBe(true);
      expect(selectPreferencesLoadError(state)).toBe('disk');
      expect(selectThemeMode(state)).toBe(systemTheme);
      expect(selectLanguage(state)).toBe('en');
    }
  });

  it('reports no load error after a normal load', async () => {
    const store = setup(fakeRepository());
    await store.dispatch(hydratePreferences());
    expect(selectPreferencesLoadError(store.getState())).toBeNull();
  });
});

describe('changing preferences', () => {
  it('updates Redux immediately, before the write finishes', () => {
    let finishWrite: () => void = () => {};
    const store = setup(
      fakeRepository({
        saveTheme: jest.fn(
          () => new Promise<void>(resolve => (finishWrite = resolve)),
        ),
      }),
    );

    const pending = store.dispatch(setTheme('dark'));
    expect(selectThemeMode(store.getState())).toBe('dark'); // already applied
    finishWrite();
    return pending;
  });

  it('persists the theme and the language', async () => {
    const repository = fakeRepository();
    const store = setup(repository);

    await store.dispatch(setTheme('dark'));
    await store.dispatch(setLanguage('np'));

    expect(repository.saveTheme).toHaveBeenCalledWith('dark');
    expect(repository.saveLanguage).toHaveBeenCalledWith('np');
    expect(selectLanguage(store.getState())).toBe('np');
    expect(selectHasUnsavedPreferences(store.getState())).toBe(false);
  });

  it('keeps the new value but flags it as unsaved when the write fails', async () => {
    const store = setup(
      fakeRepository({
        saveTheme: jest.fn().mockRejectedValue(new Error('disk full')),
      }),
    );
    await store.dispatch(setTheme('dark'));

    expect(selectThemeMode(store.getState())).toBe('dark');
    expect(selectHasUnsavedPreferences(store.getState())).toBe(true);
    expect(store.getState().preferences.saveErrors.theme).toBe('disk full');
  });

  it('clears the unsaved flag when a later write succeeds', async () => {
    const saveTheme = jest
      .fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValue(undefined);
    const store = setup(fakeRepository({ saveTheme }));

    await store.dispatch(setTheme('dark'));
    expect(selectHasUnsavedPreferences(store.getState())).toBe(true);
    await store.dispatch(setTheme('light'));
    expect(selectHasUnsavedPreferences(store.getState())).toBe(false);
  });

  it('ignores the failure of an older write that was already replaced', async () => {
    let failFirst: (error: Error) => void = () => {};
    const saveTheme = jest
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((_, reject) => (failFirst = reject)),
      )
      .mockResolvedValue(undefined);
    const store = setup(fakeRepository({ saveTheme }));

    const first = store.dispatch(setTheme('dark'));
    await store.dispatch(setTheme('light')); // newer write succeeds
    failFirst(new Error('late failure'));
    await first;

    expect(selectThemeMode(store.getState())).toBe('light');
    expect(selectHasUnsavedPreferences(store.getState())).toBe(false);
  });
});

describe('header shortcut visibility', () => {
  const shortcuts = (store: ReturnType<typeof setup>) => [
    selectShowThemeShortcut(store.getState()),
    selectShowLanguageShortcut(store.getState()),
  ];

  it('both shortcuts are shown by default', async () => {
    const store = setup(fakeRepository());
    await store.dispatch(hydratePreferences());
    expect(shortcuts(store)).toEqual([true, true]);
  });

  it('restores saved visibility, including hidden', async () => {
    const store = setup(
      fakeRepository({
        load: jest.fn().mockResolvedValue({
          ...NOTHING_SAVED,
          showThemeShortcut: false,
          showLanguageShortcut: true,
        }),
      }),
    );
    await store.dispatch(hydratePreferences());
    expect(shortcuts(store)).toEqual([false, true]);
  });

  it('are shown when saved preferences cannot be loaded', async () => {
    const store = setup(
      fakeRepository({ load: jest.fn().mockRejectedValue(new Error('disk')) }),
    );
    await store.dispatch(hydratePreferences());
    expect(shortcuts(store)).toEqual([true, true]);
  });

  it('hides and shows each shortcut immediately, independently, and persists it', async () => {
    const repository = fakeRepository();
    const store = setup(repository);
    await store.dispatch(hydratePreferences());

    const pending = store.dispatch(setThemeShortcutVisible(false));
    expect(shortcuts(store)).toEqual([false, true]); // before the write finishes
    await pending;
    await store.dispatch(setLanguageShortcutVisible(false));
    expect(shortcuts(store)).toEqual([false, false]);

    await store.dispatch(setThemeShortcutVisible(true));
    expect(shortcuts(store)).toEqual([true, false]);

    expect(repository.saveShowThemeShortcut).toHaveBeenNthCalledWith(1, false);
    expect(repository.saveShowThemeShortcut).toHaveBeenNthCalledWith(2, true);
    expect(repository.saveShowLanguageShortcut).toHaveBeenCalledWith(false);
    expect(selectHasUnsavedPreferences(store.getState())).toBe(false);
  });

  it('keeps the new visibility but flags it as unsaved when the write fails', async () => {
    const store = setup(
      fakeRepository({
        saveShowLanguageShortcut: jest
          .fn()
          .mockRejectedValue(new Error('disk full')),
      }),
    );
    await store.dispatch(setLanguageShortcutVisible(false));

    expect(selectShowLanguageShortcut(store.getState())).toBe(false);
    expect(selectHasUnsavedPreferences(store.getState())).toBe(true);
    expect(store.getState().preferences.saveErrors.showLanguageShortcut).toBe(
      'disk full',
    );
  });

  it('persists the latest choice when an older write finishes late', async () => {
    const real = createTestDatabase();
    await runMigrations(real);

    let releaseFirst: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      releaseFirst = resolve;
    });
    let writes = 0;
    const slowFirstWrite: SqlDatabase = {
      ...real,
      executeAsync: async (query, params) => {
        if (query.includes('INSERT INTO preferences') && writes++ === 0) {
          await gate;
        }
        return real.executeAsync(query, params);
      },
    };
    const store = setup(createPreferencesRepository(slowFirstWrite));

    const older = store.dispatch(setThemeShortcutVisible(false));
    const newer = store.dispatch(setThemeShortcutVisible(true));
    releaseFirst();
    await Promise.all([older, newer]);

    expect(selectShowThemeShortcut(store.getState())).toBe(true);
    expect(
      (await createPreferencesRepository(real).load()).showThemeShortcut,
    ).toBe(true);
  });
});

describe('with a real SQLite database', () => {
  it('restores the saved preferences after an app restart', async () => {
    const file = createRawTestDatabase();

    async function launch() {
      const db = createTestDatabase(file);
      await runMigrations(db);
      const store = setup(createPreferencesRepository(db), 'light');
      await store.dispatch(hydratePreferences());
      return store;
    }

    const firstRun = await launch();
    expect(selectLanguage(firstRun.getState())).toBe('en');
    await firstRun.dispatch(setTheme('dark'));
    await firstRun.dispatch(setLanguage('np'));

    const secondRun = await launch();
    expect(selectThemeMode(secondRun.getState())).toBe('dark');
    expect(selectLanguage(secondRun.getState())).toBe('np');
  });
  it('persists the latest selection when an older write finishes late', async () => {
    const file = createRawTestDatabase();
    const real = createTestDatabase(file);
    await runMigrations(real);

    let releaseFirst: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      releaseFirst = resolve;
    });
    let writes = 0;
    const slowFirstWrite: SqlDatabase = {
      ...real,
      executeAsync: async (query, params) => {
        if (query.includes('INSERT INTO preferences') && writes++ === 0) {
          await gate; // the first write (np) is slow
        }
        return real.executeAsync(query, params);
      },
    };
    const store = setup(createPreferencesRepository(slowFirstWrite));

    const older = store.dispatch(setLanguage('np'));
    const newer = store.dispatch(setLanguage('en'));
    expect(selectLanguage(store.getState())).toBe('en'); // Redux is immediate
    releaseFirst();
    await Promise.all([older, newer]);

    expect(selectLanguage(store.getState())).toBe('en');
    expect(selectHasUnsavedPreferences(store.getState())).toBe(false);
    // What a restart would load: the LATEST selection, not the older one.
    expect((await createPreferencesRepository(real).load()).language).toBe(
      'en',
    );
  });
});
