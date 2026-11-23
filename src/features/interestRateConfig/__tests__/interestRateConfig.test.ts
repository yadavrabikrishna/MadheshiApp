import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import {
  DEFAULT_INTEREST_RATE_CONFIG,
  selectedRatePeriod,
  type InterestRateConfig,
} from '../../../types/interestRateConfig';
import {
  hydrateInterestRateConfig,
  selectInterestRateConfig,
  selectInterestRateConfigLoadError,
  selectInterestRateConfigSaveError,
  updateInterestRateConfigFor,
} from '..';

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
    loadInterestRateConfigs: jest
      .fn()
      .mockResolvedValue({ simple: null, compound: null }),
    saveInterestRateConfig: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setup(overrides: Partial<PreferencesRepository> = {}) {
  const repository = fakeRepository(overrides);
  const store = createAppStore({
    preferencesRepository: repository,
    getSystemTheme: () => 'light',
  });
  return { repository, store };
}

const simple = (s: ReturnType<typeof setup>['store']) =>
  selectInterestRateConfig('simple')(s.getState());
const compound = (s: ReturnType<typeof setup>['store']) =>
  selectInterestRateConfig('compound')(s.getState());

describe('interest rate configuration state', () => {
  it('starts with the defaults for both calculators', () => {
    const { store } = setup();
    expect(simple(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
    expect(compound(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
  });

  describe('hydration', () => {
    it('applies defaults when nothing is saved (existing installation)', async () => {
      const { store } = setup();
      await store.dispatch(hydrateInterestRateConfig());

      expect(simple(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
      expect(compound(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
      expect(selectInterestRateConfigLoadError(store.getState())).toBeNull();
    });

    it('restores each saved configuration independently', async () => {
      const saved: InterestRateConfig = {
        ...DEFAULT_INTEREST_RATE_CONFIG,
        rateInputMode: 'rupees',
        rupeesPeriod: 'daily',
        denominatorMode: 'custom',
        customDenominator: '250',
      };
      const { store } = setup({
        loadInterestRateConfigs: jest
          .fn()
          .mockResolvedValue({ simple: null, compound: saved }),
      });
      await store.dispatch(hydrateInterestRateConfig());

      expect(simple(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
      expect(compound(store)).toEqual(saved);
    });

    it('never stores an invalid configuration, even if the repository returns one', async () => {
      const { store } = setup({
        loadInterestRateConfigs: jest.fn().mockResolvedValue({
          simple: { denominatorMode: 'custom', customDenominator: null },
          compound: { percentagePeriod: 'hourly' },
        }),
      });
      await store.dispatch(hydrateInterestRateConfig());

      expect(simple(store).denominatorMode).toBe('per100');
      expect(compound(store).percentagePeriod).toBe('yearly');
    });

    it('falls back to defaults and reports a load failure without crashing', async () => {
      const { store } = setup({
        loadInterestRateConfigs: jest
          .fn()
          .mockRejectedValue(new Error('disk unavailable')),
      });
      await store.dispatch(hydrateInterestRateConfig());

      expect(simple(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
      expect(compound(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
      expect(selectInterestRateConfigLoadError(store.getState())).toBe(
        'disk unavailable',
      );
    });
  });

  describe('updates', () => {
    it('applies a change immediately and saves it', async () => {
      const { store, repository } = setup();
      const done = store.dispatch(
        updateInterestRateConfigFor({
          calculator: 'simple',
          patch: { rateInputMode: 'rupees' },
        }),
      );
      expect(simple(store).rateInputMode).toBe('rupees'); // before the write ends
      await done;

      expect(repository.saveInterestRateConfig).toHaveBeenCalledTimes(1);
      expect(repository.saveInterestRateConfig).toHaveBeenCalledWith('simple', {
        ...DEFAULT_INTEREST_RATE_CONFIG,
        rateInputMode: 'rupees',
      });
      expect(
        selectInterestRateConfigSaveError('simple')(store.getState()),
      ).toBe(false);
    });

    it('keeps Simple and Compound independent', async () => {
      const { store, repository } = setup();
      await store.dispatch(
        updateInterestRateConfigFor({
          calculator: 'compound',
          patch: { period: 'daily' },
        }),
      );

      expect(selectedRatePeriod(compound(store))).toBe('daily');
      expect(simple(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
      expect(repository.saveInterestRateConfig).toHaveBeenCalledWith(
        'compound',
        expect.anything(),
      );
      expect(repository.saveInterestRateConfig).not.toHaveBeenCalledWith(
        'simple',
        expect.anything(),
      );
    });

    it("restores each mode's period when switching modes", async () => {
      const { store } = setup();
      const update = (
        patch: Parameters<typeof updateInterestRateConfigFor>[0]['patch'],
      ) =>
        store.dispatch(
          updateInterestRateConfigFor({ calculator: 'simple', patch }),
        );

      await update({ period: 'quarterly' });
      await update({ rateInputMode: 'rupees' });
      expect(selectedRatePeriod(simple(store))).toBe('monthly');
      await update({ period: 'weekly' });
      await update({ rateInputMode: 'percentage' });
      expect(selectedRatePeriod(simple(store))).toBe('quarterly');
      await update({ rateInputMode: 'rupees' });
      expect(selectedRatePeriod(simple(store))).toBe('weekly');
    });

    it('keeps the custom denominator across denominator modes', async () => {
      const { store } = setup();
      const update = (
        patch: Parameters<typeof updateInterestRateConfigFor>[0]['patch'],
      ) =>
        store.dispatch(
          updateInterestRateConfigFor({ calculator: 'simple', patch }),
        );

      await update({ customDenominator: '250', denominatorMode: 'custom' });
      await update({ denominatorMode: 'per1000' });

      expect(simple(store).denominatorMode).toBe('per1000');
      expect(simple(store).customDenominator).toBe('250');
    });

    it('ignores an invalid change: nothing changes and nothing is saved', async () => {
      const { store, repository } = setup();
      for (const patch of [
        { customDenominator: '0' },
        { customDenominator: 'abc' },
        { denominatorMode: 'custom' as const }, // no custom value yet
        { period: 'hourly' as never },
      ]) {
        await store.dispatch(
          updateInterestRateConfigFor({ calculator: 'simple', patch }),
        );
      }

      expect(simple(store)).toEqual(DEFAULT_INTEREST_RATE_CONFIG);
      expect(repository.saveInterestRateConfig).not.toHaveBeenCalled();
    });

    it('keeps the new value but flags a failed save, and clears the flag on the next success', async () => {
      const failing = jest
        .fn()
        .mockRejectedValueOnce(new Error('write failed'))
        .mockResolvedValue(undefined);
      const { store } = setup({ saveInterestRateConfig: failing });

      await store.dispatch(
        updateInterestRateConfigFor({
          calculator: 'simple',
          patch: { rateInputMode: 'rupees' },
        }),
      );
      expect(simple(store).rateInputMode).toBe('rupees');
      expect(
        selectInterestRateConfigSaveError('simple')(store.getState()),
      ).toBe(true);
      expect(
        selectInterestRateConfigSaveError('compound')(store.getState()),
      ).toBe(false);

      await store.dispatch(
        updateInterestRateConfigFor({
          calculator: 'simple',
          patch: { period: 'daily' },
        }),
      );
      expect(
        selectInterestRateConfigSaveError('simple')(store.getState()),
      ).toBe(false);
    });

    it('an older, slower failing write cannot flag the newer successful one', async () => {
      let rejectFirst: (error: Error) => void = () => {};
      const saves = jest
        .fn()
        .mockImplementationOnce(
          () => new Promise((_, reject) => (rejectFirst = reject)),
        )
        .mockResolvedValue(undefined);
      const { store } = setup({ saveInterestRateConfig: saves });

      const first = store.dispatch(
        updateInterestRateConfigFor({
          calculator: 'simple',
          patch: { period: 'daily' },
        }),
      );
      await store.dispatch(
        updateInterestRateConfigFor({
          calculator: 'simple',
          patch: { period: 'weekly' },
        }),
      );
      rejectFirst(new Error('late failure'));
      await first;

      expect(selectedRatePeriod(simple(store))).toBe('weekly');
      expect(
        selectInterestRateConfigSaveError('simple')(store.getState()),
      ).toBe(false);
    });
  });
});
