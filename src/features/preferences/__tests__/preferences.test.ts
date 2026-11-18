import { createAppStore } from '../../../store';
import type { PreferencesRepository } from '../../../storage';
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
  selectThemeMode,
  setLanguage,
  setTheme,
} from '..';

function fakeRepository(
  overrides: Partial<PreferencesRepository> = {},
): PreferencesRepository {
  return {
    load: jest.fn().mockResolvedValue({ theme: null, language: null }),
    saveTheme: jest.fn().mockResolvedValue(undefined),
    saveLanguage: jest.fn().mockResolvedValue(undefined),
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
        load: jest.fn().mockResolvedValue({ theme: 'dark', language: 'ne' }),
      }),
    );
    await store.dispatch(hydratePreferences());

    const state = store.getState();
    expect(selectThemeMode(state)).toBe('dark');
    expect(selectLanguage(state)).toBe('ne');
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
        load: jest.fn().mockResolvedValue({ theme: 'light', language: null }),
      }),
      'dark',
    );
    await store.dispatch(hydratePreferences());
    expect(selectThemeMode(store.getState())).toBe('light');
  });

  it('still starts with defaults, and reports the problem, if loading fails', async () => {
    const store = setup(
      fakeRepository({ load: jest.fn().mockRejectedValue(new Error('disk')) }),
    );
    await store.dispatch(hydratePreferences());

    const state = store.getState();
    expect(selectPreferencesHydrated(state)).toBe(true);
    expect(selectPreferencesLoadError(state)).toBe('disk');
    expect(selectLanguage(state)).toBe('en');
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
    await store.dispatch(setLanguage('ne'));

    expect(repository.saveTheme).toHaveBeenCalledWith('dark');
    expect(repository.saveLanguage).toHaveBeenCalledWith('ne');
    expect(selectLanguage(store.getState())).toBe('ne');
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
    await firstRun.dispatch(setLanguage('ne'));

    const secondRun = await launch();
    expect(selectThemeMode(secondRun.getState())).toBe('dark');
    expect(selectLanguage(secondRun.getState())).toBe('ne');
  });
});
