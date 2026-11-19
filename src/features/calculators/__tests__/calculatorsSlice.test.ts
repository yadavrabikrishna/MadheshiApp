import { createAppStore } from '../../../store';
import type { PreferencesRepository } from '../../../storage';
import {
  CALCULATOR_IDS,
  DEFAULT_ENABLED_CALCULATORS,
  type CalculatorId,
  type EnabledCalculators,
} from '../../../types/calculators';
import {
  hydrateCalculators,
  saveCalculatorSettings,
  selectActiveCalculator,
  selectCalculatorsLoadError,
  selectCalculatorsSaveError,
  selectEnabledCalculators,
  setActiveCalculator,
} from '..';

function only(...ids: CalculatorId[]): EnabledCalculators {
  return Object.fromEntries(
    CALCULATOR_IDS.map(id => [id, ids.includes(id)]),
  ) as EnabledCalculators;
}

function fakeRepository(
  overrides: Partial<PreferencesRepository> = {},
): PreferencesRepository {
  return {
    load: jest.fn().mockResolvedValue({
      theme: null,
      language: null,
      showThemeShortcut: null,
      showLanguageShortcut: null,
    }),
    saveTheme: jest.fn().mockResolvedValue(undefined),
    saveLanguage: jest.fn().mockResolvedValue(undefined),
    saveShowThemeShortcut: jest.fn().mockResolvedValue(undefined),
    saveShowLanguageShortcut: jest.fn().mockResolvedValue(undefined),
    loadCalculators: jest
      .fn()
      .mockResolvedValue({ enabled: null, active: null }),
    saveCalculatorSettings: jest.fn().mockResolvedValue(undefined),
    saveActiveCalculator: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setup(repository: PreferencesRepository) {
  return createAppStore({
    preferencesRepository: repository,
    getSystemTheme: () => 'light',
  });
}

describe('hydration', () => {
  it('uses the first-run defaults when nothing was saved', async () => {
    const store = setup(fakeRepository());
    await store.dispatch(hydrateCalculators());

    const state = store.getState();
    expect(selectEnabledCalculators(state)).toEqual(
      DEFAULT_ENABLED_CALCULATORS,
    );
    expect(selectActiveCalculator(state)).toBe('simpleInterest');
    expect(selectCalculatorsLoadError(state)).toBeNull();
  });

  it('restores the saved selection and the last selected calculator', async () => {
    const store = setup(
      fakeRepository({
        loadCalculators: jest.fn().mockResolvedValue({
          enabled: only('terai', 'basic'),
          active: 'basic',
        }),
      }),
    );
    await store.dispatch(hydrateCalculators());

    expect(selectEnabledCalculators(store.getState())).toEqual(
      only('terai', 'basic'),
    );
    expect(selectActiveCalculator(store.getState())).toBe('basic');
  });

  it('falls back in the fixed order when the saved active calculator is disabled', async () => {
    const store = setup(
      fakeRepository({
        loadCalculators: jest.fn().mockResolvedValue({
          enabled: only('ageBs', 'hillMountain'),
          active: 'terai',
        }),
      }),
    );
    await store.dispatch(hydrateCalculators());

    expect(selectActiveCalculator(store.getState())).toBe('ageBs');
  });

  it('uses the defaults and reports the problem when SQLite cannot be read', async () => {
    const store = setup(
      fakeRepository({
        loadCalculators: jest.fn().mockRejectedValue(new Error('disk gone')),
      }),
    );
    await store.dispatch(hydrateCalculators());

    expect(selectEnabledCalculators(store.getState())).toEqual(
      DEFAULT_ENABLED_CALCULATORS,
    );
    expect(selectCalculatorsLoadError(store.getState())).toBe('disk gone');
  });
});

describe('setActiveCalculator', () => {
  it('shows the calculator at once and persists it as the last selected', async () => {
    const repository = fakeRepository();
    const store = setup(repository);
    await store.dispatch(hydrateCalculators());

    const done = store.dispatch(setActiveCalculator('hillMountain'));
    expect(selectActiveCalculator(store.getState())).toBe('hillMountain');
    await done;

    expect(repository.saveActiveCalculator).toHaveBeenCalledWith(
      'hillMountain',
    );
    expect(selectCalculatorsSaveError(store.getState())).toBe(false);
  });

  it('never activates a disabled calculator', async () => {
    const repository = fakeRepository({
      loadCalculators: jest
        .fn()
        .mockResolvedValue({ enabled: only('terai'), active: 'terai' }),
    });
    const store = setup(repository);
    await store.dispatch(hydrateCalculators());

    await store.dispatch(setActiveCalculator('simpleInterest'));

    expect(selectActiveCalculator(store.getState())).toBe('terai');
    expect(repository.saveActiveCalculator).not.toHaveBeenCalled();
  });

  it('does not write again for the calculator that is already saved', async () => {
    const repository = fakeRepository({
      loadCalculators: jest.fn().mockResolvedValue({
        enabled: DEFAULT_ENABLED_CALCULATORS,
        active: 'ageBs',
      }),
    });
    const store = setup(repository);
    await store.dispatch(hydrateCalculators());

    await store.dispatch(setActiveCalculator('ageBs'));

    expect(repository.saveActiveCalculator).not.toHaveBeenCalled();
  });
});

describe('saveCalculatorSettings', () => {
  it('applies the complete selection and persists it with the active calculator', async () => {
    const repository = fakeRepository();
    const store = setup(repository);
    await store.dispatch(hydrateCalculators());

    const draft = only('compoundInterest', 'ageBs', 'basic');
    const done = store.dispatch(saveCalculatorSettings(draft));
    // Applied immediately, before the write finishes.
    expect(selectEnabledCalculators(store.getState())).toEqual(draft);
    await done;

    expect(repository.saveCalculatorSettings).toHaveBeenCalledWith({
      enabled: draft,
      active: 'compoundInterest',
    });
  });

  it('keeps the active calculator while it remains enabled', async () => {
    const store = setup(fakeRepository());
    await store.dispatch(hydrateCalculators());
    await store.dispatch(setActiveCalculator('terai'));

    await store.dispatch(
      saveCalculatorSettings(only('terai', 'simpleInterest')),
    );

    expect(selectActiveCalculator(store.getState())).toBe('terai');
  });

  it('falls back in the fixed order when the active calculator is disabled', async () => {
    const store = setup(fakeRepository());
    await store.dispatch(hydrateCalculators());
    await store.dispatch(setActiveCalculator('terai'));

    await store.dispatch(
      saveCalculatorSettings(only('hillMountain', 'ageAd', 'basic')),
    );

    expect(selectActiveCalculator(store.getState())).toBe('ageAd');
  });

  it('enables and activates Basic Calculator, and never persists an all-off selection', async () => {
    const repository = fakeRepository();
    const store = setup(repository);
    await store.dispatch(hydrateCalculators());

    await store.dispatch(saveCalculatorSettings(only()));

    expect(selectEnabledCalculators(store.getState())).toEqual(only('basic'));
    expect(selectActiveCalculator(store.getState())).toBe('basic');
    expect(repository.saveCalculatorSettings).toHaveBeenCalledWith({
      enabled: only('basic'),
      active: 'basic',
    });
  });

  it('keeps Basic Calculator active when specialists are enabled and Basic stays on', async () => {
    const store = setup(fakeRepository());
    await store.dispatch(hydrateCalculators());
    await store.dispatch(saveCalculatorSettings(only()));

    await store.dispatch(
      saveCalculatorSettings(only('basic', 'simpleInterest', 'terai')),
    );

    expect(selectActiveCalculator(store.getState())).toBe('basic');
  });

  it('keeps the new selection in the app and reports it when the write fails', async () => {
    const store = setup(
      fakeRepository({
        saveCalculatorSettings: jest.fn().mockRejectedValue(new Error('full')),
      }),
    );
    await store.dispatch(hydrateCalculators());

    await store.dispatch(saveCalculatorSettings(only('terai')));

    expect(selectEnabledCalculators(store.getState())).toEqual(only('terai'));
    expect(selectCalculatorsSaveError(store.getState())).toBe(true);
  });

  it('lets only the latest write decide the error state', async () => {
    let failFirst: (error: Error) => void = () => {};
    const saveCalculatorSettingsMock = jest
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((_, reject) => (failFirst = reject)),
      )
      .mockResolvedValue(undefined);
    const store = setup(
      fakeRepository({ saveCalculatorSettings: saveCalculatorSettingsMock }),
    );
    await store.dispatch(hydrateCalculators());

    const first = store.dispatch(saveCalculatorSettings(only('terai')));
    await store.dispatch(saveCalculatorSettings(only('ageBs')));
    failFirst(new Error('late failure of an older write'));
    await first;

    expect(selectCalculatorsSaveError(store.getState())).toBe(false);
    expect(selectEnabledCalculators(store.getState())).toEqual(only('ageBs'));
  });
});
