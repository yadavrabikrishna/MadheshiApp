import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { PreferencesThunkExtra } from '../preferences';
import {
  DEFAULT_ENABLED_CALCULATORS,
  type CalculatorId,
  type EnabledCalculators,
} from '../../types/calculators';
import { applyCalculatorSettings, restoreCalculators } from './calculatorModel';

export interface CalculatorsState {
  /** The SAVED selection. Settings edits stay in a local draft until Save. */
  enabled: EnabledCalculators;
  /** The calculator being shown. Always one of the enabled calculators. */
  active: CalculatorId;
  /** The last calculator written to storage (see `applyCalculatorSettings`). */
  lastSelected: CalculatorId | null;
  /** Set when the saved calculator settings could not be read at startup. */
  loadError: string | null;
  /** Set when the latest calculator change could not be written to SQLite. */
  saveError: string | null;
  /** Request id of the latest write; only its result may set `saveError`. */
  latestWriteId: string | null;
}

type ThunkConfig = {
  state: { calculators: CalculatorsState };
  extra: PreferencesThunkExtra;
};

function messageOf(error: { message?: string }): string {
  return error.message ?? 'Unknown storage error';
}

/**
 * Load the saved calculator settings. Nothing saved means the first-run
 * defaults; if SQLite cannot be read, the same defaults apply and the failure is
 * reported through `loadError`.
 */
export const hydrateCalculators = createAsyncThunk<
  {
    enabled: EnabledCalculators;
    active: CalculatorId;
    lastSelected: CalculatorId | null;
    loadError: string | null;
  },
  void,
  ThunkConfig
>('calculators/hydrate', async (_, { extra }) => {
  try {
    const stored = await extra.preferencesRepository.loadCalculators();
    return {
      ...restoreCalculators(stored),
      lastSelected: stored.active,
      loadError: null,
    };
  } catch (error) {
    return {
      ...restoreCalculators({ enabled: null, active: null }),
      lastSelected: null,
      loadError:
        error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
});

/**
 * Show another enabled calculator and remember it as the last selected one.
 * Applied immediately (on `pending`); the write to SQLite follows.
 */
export const setActiveCalculator = createAsyncThunk<
  void,
  CalculatorId,
  ThunkConfig
>(
  'calculators/setActive',
  async (id, { extra }) => {
    await extra.preferencesRepository.saveActiveCalculator(id);
  },
  {
    // A disabled calculator can never become active; re-selecting is a no-op.
    condition: (id, { getState }) => {
      const { enabled, active, lastSelected } = getState().calculators;
      return enabled[id] && (id !== active || id !== lastSelected);
    },
  },
);

/**
 * Save the Settings draft: the complete selection is applied to the Calculator
 * navigation at once (on `pending`) and then persisted.
 */
export const saveCalculatorSettings = createAsyncThunk<
  void,
  EnabledCalculators,
  ThunkConfig
>('calculators/saveSettings', async (_draft, { getState, extra }) => {
  // The reducer already applied the draft, so this is the resolved result.
  const { enabled, active } = getState().calculators;
  await extra.preferencesRepository.saveCalculatorSettings({
    enabled,
    active,
  });
});

const initialState: CalculatorsState = {
  enabled: DEFAULT_ENABLED_CALCULATORS,
  active: 'simpleInterest',
  lastSelected: null,
  loadError: null,
  saveError: null,
  latestWriteId: null,
};

const calculatorsSlice = createSlice({
  name: 'calculators',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(hydrateCalculators.fulfilled, (state, action) => {
        state.enabled = action.payload.enabled;
        state.active = action.payload.active;
        state.lastSelected = action.payload.lastSelected;
        state.loadError = action.payload.loadError;
      })

      .addCase(setActiveCalculator.pending, (state, action) => {
        state.active = action.meta.arg;
        state.lastSelected = action.meta.arg;
        state.latestWriteId = action.meta.requestId;
      })
      .addCase(saveCalculatorSettings.pending, (state, action) => {
        const next = applyCalculatorSettings(
          {
            enabled: state.enabled,
            active: state.active,
            lastSelected: state.lastSelected,
          },
          action.meta.arg,
        );
        state.enabled = next.enabled;
        state.active = next.active;
        state.lastSelected = next.active;
        state.latestWriteId = action.meta.requestId;
      });

    // A result only counts if it belongs to the latest write, so an older, slower
    // write cannot overwrite the outcome of a newer one.
    for (const thunk of [setActiveCalculator, saveCalculatorSettings]) {
      builder
        .addCase(thunk.fulfilled, (state, action) => {
          if (state.latestWriteId === action.meta.requestId) {
            state.saveError = null;
          }
        })
        .addCase(thunk.rejected, (state, action) => {
          if (state.latestWriteId === action.meta.requestId) {
            state.saveError = messageOf(action.error);
          }
        });
    }
  },
});

export const calculatorsReducer = calculatorsSlice.reducer;
