import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { calculatorsReducer } from '../features/calculators';
import { interestRateConfigReducer } from '../features/interestRateConfig';
import {
  preferencesReducer,
  type PreferencesThunkExtra,
} from '../features/preferences';

const rootReducer = combineReducers({
  preferences: preferencesReducer,
  calculators: calculatorsReducer,
  interestRateConfig: interestRateConfigReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Build the app store. Dependencies are injected (instead of imported) so the
 * store works with the real SQLite repository on device and a test database in Jest.
 */
export function createAppStore(extra: PreferencesThunkExtra) {
  return configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } }),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];
