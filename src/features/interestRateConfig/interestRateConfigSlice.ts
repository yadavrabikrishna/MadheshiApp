import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { PreferencesThunkExtra } from '../preferences';
import {
  DEFAULT_INTEREST_RATE_CONFIGS,
  restoreInterestRateConfig,
  updateInterestRateConfig,
  type InterestCalculatorKind,
  type InterestRateConfig,
  type InterestRateConfigPatch,
  type InterestRateConfigs,
} from '../../types/interestRateConfig';

export interface InterestRateConfigState {
  /** Independent configurations; a change to one never touches the other. */
  configs: InterestRateConfigs;
  /** Set when the saved configurations could not be read at startup. */
  loadError: string | null;
  /** Latest write failure per calculator (the new value still applies, unsaved). */
  saveErrors: Record<InterestCalculatorKind, string | null>;
  /** Request id of each calculator's latest write; only it may set `saveErrors`. */
  latestWriteIds: Record<InterestCalculatorKind, string | null>;
}

type ThunkConfig = {
  state: { interestRateConfig: InterestRateConfigState };
  extra: PreferencesThunkExtra;
};

function messageOf(error: { message?: string }): string {
  return error.message ?? 'Unknown storage error';
}

/**
 * Load the saved configurations. A calculator with nothing saved (e.g. an
 * existing installation) gets the defaults; if SQLite cannot be read, both get
 * the defaults and the failure is reported through `loadError`.
 */
export const hydrateInterestRateConfig = createAsyncThunk<
  { configs: InterestRateConfigs; loadError: string | null },
  void,
  ThunkConfig
>('interestRateConfig/hydrate', async (_, { extra }) => {
  try {
    const stored = await extra.preferencesRepository.loadInterestRateConfigs();
    return {
      configs: {
        simple: stored.simple ?? DEFAULT_INTEREST_RATE_CONFIGS.simple,
        compound: stored.compound ?? DEFAULT_INTEREST_RATE_CONFIGS.compound,
      },
      loadError: null,
    };
  } catch (error) {
    return {
      configs: DEFAULT_INTEREST_RATE_CONFIGS,
      loadError:
        error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
});

/**
 * Change one calculator's configuration. The change is validated first: an
 * invalid one is skipped (the thunk is cancelled) and nothing changes or is
 * saved; use `updateInterestRateConfig` beforehand to learn the reason. A valid one applies immediately (on `pending`); the write to
 * SQLite follows.
 */
export const updateInterestRateConfigFor = createAsyncThunk<
  void,
  { calculator: InterestCalculatorKind; patch: InterestRateConfigPatch },
  ThunkConfig
>(
  'interestRateConfig/update',
  async ({ calculator }, { getState, extra }) => {
    // The reducer already applied the change, so this is the resolved config.
    await extra.preferencesRepository.saveInterestRateConfig(
      calculator,
      getState().interestRateConfig.configs[calculator],
    );
  },
  {
    condition: ({ calculator, patch }, { getState }) =>
      updateInterestRateConfig(
        getState().interestRateConfig.configs[calculator],
        patch,
      ).ok,
  },
);

const initialState: InterestRateConfigState = {
  configs: DEFAULT_INTEREST_RATE_CONFIGS,
  loadError: null,
  saveErrors: { simple: null, compound: null },
  latestWriteIds: { simple: null, compound: null },
};

const interestRateConfigSlice = createSlice({
  name: 'interestRateConfig',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(hydrateInterestRateConfig.fulfilled, (state, action) => {
        // Re-validated, so nothing invalid can ever enter the store.
        state.configs = {
          simple: restoreInterestRateConfig(action.payload.configs.simple),
          compound: restoreInterestRateConfig(action.payload.configs.compound),
        };
        state.loadError = action.payload.loadError;
      })
      .addCase(updateInterestRateConfigFor.pending, (state, action) => {
        const { calculator, patch } = action.meta.arg;
        const update = updateInterestRateConfig(
          state.configs[calculator],
          patch,
        );
        if (update.ok) {
          state.configs[calculator] = update.config;
          state.latestWriteIds[calculator] = action.meta.requestId;
        }
      })
      // A result only counts if it belongs to that calculator's latest write.
      .addCase(updateInterestRateConfigFor.fulfilled, (state, action) => {
        const { calculator } = action.meta.arg;
        if (state.latestWriteIds[calculator] === action.meta.requestId) {
          state.saveErrors[calculator] = null;
        }
      })
      .addCase(updateInterestRateConfigFor.rejected, (state, action) => {
        const { calculator } = action.meta.arg;
        if (state.latestWriteIds[calculator] === action.meta.requestId) {
          state.saveErrors[calculator] = messageOf(action.error);
        }
      });
  },
});

export const interestRateConfigReducer = interestRateConfigSlice.reducer;

export type { InterestRateConfig };
