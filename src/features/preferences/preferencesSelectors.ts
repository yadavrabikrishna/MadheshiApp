import type { PreferencesState } from './preferencesSlice';

// Selectors take the slice's parent shape to avoid a circular import with the store.
type WithPreferences = { preferences: PreferencesState };

export const selectThemeMode = (state: WithPreferences) =>
  state.preferences.theme;

export const selectLanguage = (state: WithPreferences) =>
  state.preferences.language;

export const selectPreferencesHydrated = (state: WithPreferences) =>
  state.preferences.hydrated;

/** True when a chosen preference is applied but could not be saved. */
export const selectHasUnsavedPreferences = (state: WithPreferences) =>
  Object.values(state.preferences.saveErrors).some(error => error !== null);

export const selectShowThemeShortcut = (state: WithPreferences) =>
  state.preferences.showThemeShortcut;

export const selectShowLanguageShortcut = (state: WithPreferences) =>
  state.preferences.showLanguageShortcut;

export const selectPreferencesLoadError = (state: WithPreferences) =>
  state.preferences.loadError;
