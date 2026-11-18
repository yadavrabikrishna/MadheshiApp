import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { PreferencesRepository } from '../../storage';
import {
  DEFAULT_LANGUAGE,
  type Language,
  type ThemeMode,
} from '../../types/preferences';

export type PreferenceKey = 'theme' | 'language';

export interface PreferencesState {
  /** False until saved preferences are loaded; the app UI waits for this. */
  hydrated: boolean;
  theme: ThemeMode;
  language: Language;
  /**
   * Set when the latest value of a preference could not be written to SQLite.
   * The new value still applies for this session, but it is NOT durable.
   */
  saveErrors: Record<PreferenceKey, string | null>;
  /** Set when saved preferences could not be read at startup (defaults used). */
  loadError: string | null;
}

/** Everything the thunks need from outside Redux; injected so tests can fake it. */
export interface PreferencesThunkExtra {
  preferencesRepository: PreferencesRepository;
  getSystemTheme: () => ThemeMode;
}

type ThunkConfig = { extra: PreferencesThunkExtra };

/** Redux passes thunk errors as plain serialized objects, not `Error` instances. */
function messageOf(error: { message?: string }): string {
  return error.message ?? 'Unknown storage error';
}

/** Load saved preferences. Missing values fall back to the system theme / English. */
export const hydratePreferences = createAsyncThunk<
  { theme: ThemeMode; language: Language },
  void,
  ThunkConfig
>('preferences/hydrate', async (_, { extra }) => {
  const stored = await extra.preferencesRepository.load();
  return {
    theme: stored.theme ?? extra.getSystemTheme(),
    language: stored.language ?? DEFAULT_LANGUAGE,
  };
});

/**
 * Change the theme. The reducer applies it immediately (on `pending`); the
 * write to SQLite follows asynchronously.
 */
export const setTheme = createAsyncThunk<void, ThemeMode, ThunkConfig>(
  'preferences/setTheme',
  async (theme, { extra }) => {
    await extra.preferencesRepository.saveTheme(theme);
  },
);

export const setLanguage = createAsyncThunk<void, Language, ThunkConfig>(
  'preferences/setLanguage',
  async (language, { extra }) => {
    await extra.preferencesRepository.saveLanguage(language);
  },
);

const initialState: PreferencesState = {
  hydrated: false,
  theme: 'light',
  language: DEFAULT_LANGUAGE,
  saveErrors: { theme: null, language: null },
  loadError: null,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(hydratePreferences.fulfilled, (state, action) => {
        state.theme = action.payload.theme;
        state.language = action.payload.language;
        state.hydrated = true;
      })
      .addCase(hydratePreferences.rejected, (state, action) => {
        // Run with defaults rather than blocking the app; surface the problem.
        state.loadError = messageOf(action.error);
        state.hydrated = true;
      })

      .addCase(setTheme.pending, (state, action) => {
        state.theme = action.meta.arg;
      })
      // A result only counts if it is for the value currently selected, so an
      // older, slower write cannot overwrite the outcome of a newer one.
      .addCase(setTheme.fulfilled, (state, action) => {
        if (state.theme === action.meta.arg) {
          state.saveErrors.theme = null;
        }
      })
      .addCase(setTheme.rejected, (state, action) => {
        if (state.theme === action.meta.arg) {
          state.saveErrors.theme = messageOf(action.error);
        }
      })

      .addCase(setLanguage.pending, (state, action) => {
        state.language = action.meta.arg;
      })
      .addCase(setLanguage.fulfilled, (state, action) => {
        if (state.language === action.meta.arg) {
          state.saveErrors.language = null;
        }
      })
      .addCase(setLanguage.rejected, (state, action) => {
        if (state.language === action.meta.arg) {
          state.saveErrors.language = messageOf(action.error);
        }
      });
  },
});

export const preferencesReducer = preferencesSlice.reducer;
